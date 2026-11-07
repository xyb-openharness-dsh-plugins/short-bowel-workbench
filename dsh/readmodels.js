/* 读模型（短肠综合征）：把库里的行还原成**前端要的形状**。
 *
 * 契约：`GET /api/short-bowel/bootstrap` 的输出必须与 prototypes/v0.2/demo-data.js 的
 * `window.DEMO` 同形（test/demo-parity.test.mjs 按字段白名单逐项 deepStrictEqual）。
 * 所以前端视图函数一行不改就能吃两边的数据；这里不做任何"顺手优化"。
 *
 * 五条容易踩的（与冻结 schema 的分工）：
 * 1. **展示 id**：表主键是 INTEGER rowid，前端 id 是不透明令牌——这里按 `<前缀>-<rowid>`
 *    稳定生成（in-/dr-/lv-/ev-/sc-/ca-/li-/q-/d-/c-/sf-/rg-），demo-parity 对 id 归一化后比较。
 * 2. **来源展示串**：表里只有 source_kind 分类列，展示串用 SOURCE_LABELS 反查还原；
 *    与 DEMO 原串的措辞差异（如「复诊记录」→「门诊记录」）在 demo-parity 白名单登记。
 * 3. **memo / note JSON**：seedDemo 把无列可放的展示字段（short/meta/tag/full/stageState/
 *    unknownExample、指标 color/groups）存成 JSON；这里解析还原，解析失败按 null 处理。
 * 4. **排序**：一律 ORDER BY rowid（数据层纪律）；日期排序由前端做（与原型同序）。
 * 5. **私密三出口**：life_records.visibility==='private' 的记录默认不出现在 bootstrap
 *    之外的出口（导出侧强制剔除；页面读模型原样返回，闸门在前端弹层里）。
 */

import { AGENT_PANE } from '../lib/layout.js';
import { loadDemoData } from './demo.js';

const jp = (s, fallback = null) => {
  if (s === null || s === undefined) return fallback;
  try { return JSON.parse(s); } catch { return fallback; }
};
/* node:sqlite 返回 null-prototype 行对象，直接 deepStrictEqual 会因原型不同而失败。统一摊平。 */
const rows = (db, sql, ...args) => db.prepare(sql).all(...args).map((r) => ({ ...r }));

/** source_kind → 展示串（与 demo-data.js 的措辞保持同族；差异在 demo-parity 白名单登记）。 */
export const SOURCE_LABELS = {
  discharge_summary: '出院小结（模拟）',
  surgery_note: '手术记录（模拟）',
  doctor_words: '医生口述（模拟）',
  outpatient: '门诊记录（模拟）',
  nursing: '护理记录（模拟）',
  imaging: '超声报告（模拟）',
  lab_report: '检验报告（模拟）',
  patient_entry: '本人记录（模拟）',
};
const srcLabel = (kind, suffix = '（模拟）') => (kind && SOURCE_LABELS[kind]) || `来源未记录${suffix}`;

function recorderSrc(recorder) {
  return recorder === '家属' ? '家属代记（模拟）' : '本人记录（模拟）';
}

/* ---------------- 档案头 ---------------- */

function readProfiles(db) {
  const out = {};
  for (const r of rows(db, 'SELECT * FROM profiles ORDER BY rowid')) {
    const memo = jp(r.memo, {}) || {};
    out[memo.key || String(r.id)] = {
      id: memo.key || String(r.id),
      name: r.display_name,
      short: memo.short ?? r.display_name,
      avatar: r.avatar_char ?? (memo.key || '?'),
      meta: memo.meta ?? '',
      tag: memo.tag ?? '',
      anchor: r.anchor_date ?? null,
      anchorLabel: r.anchor_label ?? '手术日',
      root: r.root_path ?? '',
      full: memo.full ?? false,
      stageState: memo.stageState ?? '',
      unknownExample: memo.unknownExample ?? '',
    };
  }
  return out;
}

export function profileIdByKey(db, key) {
  for (const r of rows(db, 'SELECT id, memo FROM profiles ORDER BY rowid')) {
    const memo = jp(r.memo, {}) || {};
    if (memo.key === key || String(r.id) === String(key)) return r.id;
  }
  return null;
}

/* ---------------- 手术事实 / 方案版本（版本链：in_use=1 的行是当前版本，旧版本保留） ---------------- */

function readSurgeryFacts(db, pid) {
  return rows(db, 'SELECT * FROM surgery_facts WHERE profile_id = ? ORDER BY rowid', pid).map((r) => {
    const facts = {};
    /* 字段顺序与 demo-data.js 一致；补充只在有值时出现（原样同形）。 */
    if (r.resection_desc !== null) facts['切除范围'] = r.resection_desc;
    if (r.jejunum_cm !== null || 'jejunum_cm' in r) facts['剩余空肠长度_cm'] = r.jejunum_cm;
    if (r.ileum_cm !== null || 'ileum_cm' in r) facts['剩余回肠长度_cm'] = r.ileum_cm;
    facts['回盲瓣'] = r.ileocecal_valve;
    facts['结肠'] = r.colon_status;
    facts['造口'] = r.stoma_status;
    if (r.extra_text !== null) facts['补充'] = r.extra_text;
    return {
      id: `sf-${r.id}`,
      version: r.version,
      d: r.fact_date,
      source: srcLabel(r.source_kind),
      doctor: r.doctor_name,
      facts,
    };
  });
}

function readRegimens(db, pid) {
  return rows(db, 'SELECT * FROM pn_regimens WHERE profile_id = ? ORDER BY rowid', pid).map((r) => ({
    id: `rg-${r.id}`,
    version: r.version,
    d: r.effective_date,
    source: srcLabel(r.source_kind),
    freq: r.freq_days_per_week === null ? null : `每周 ${r.freq_days_per_week} 天`,
    hours: r.hours_per_session,
    route: r.route,
    volume_ml: r.volume_ml,
    kcal: r.kcal,
    note: r.note,
  }));
}

function readInfusions(db, pid) {
  return rows(db, 'SELECT * FROM infusions WHERE profile_id = ? ORDER BY rowid', pid).map((r) => ({
    id: `in-${r.id}`,
    d: r.infusion_date,
    ml: r.volume_ml,
    hours: r.hours,
    route: r.route,
    src: recorderSrc(r.recorder),
    ...(r.note ? { note: r.note } : {}),
  }));
}

function readDaily(db, pid) {
  return rows(db, 'SELECT * FROM daily_records WHERE profile_id = ? ORDER BY rowid', pid).map((r) => ({
    id: `dr-${r.id}`,
    d: r.record_date,
    weight_kg: r.weight_kg,
    urine_ml: r.urine_ml,
    stool_times: r.stool_times,
    src: recorderSrc(r.recorder),
    note: r.note ?? '',
  }));
}

/* ---------------- 化验：目录（note JSON 还原 color/groups）+ 报告 + 数值 ---------------- */

function readMetricDefs(db) {
  const metrics = {};
  for (const r of rows(db, 'SELECT * FROM metric_defs WHERE in_use = 1 ORDER BY sort_order, rowid')) {
    const extra = jp(r.note, {}) || {};
    metrics[r.code] = {
      name: r.display_name,
      unit: r.unit,
      cat: r.category,
      color: extra.color ?? null,
      dec: r.dec_digits,
      note: extra.note ?? null,
      groups: extra.groups ?? {},
    };
  }
  return metrics;
}

function readLabCats(metrics) {
  /* 分类目录与颜色按「该分类第一个指标的序」重建（与 demo-data.js 同源同序）。 */
  const seen = new Map();
  for (const m of Object.values(metrics)) {
    if (!m.cat || seen.has(m.cat)) continue;
    seen.set(m.cat, m.color);
  }
  return [...seen.entries()].map(([cat, color]) => [cat, color]);
}

function readLabValues(db, pid) {
  const out = [];
  const reps = new Map();
  for (const r of rows(db, 'SELECT * FROM lab_reports WHERE profile_id = ? ORDER BY rowid', pid)) {
    reps.set(r.id, r);
  }
  for (const r of rows(db, 'SELECT * FROM lab_values WHERE profile_id = ? ORDER BY rowid', pid)) {
    const rep = reps.get(r.report_id);
    const v = r.value_num !== null ? r.value_num : r.value_text;
    out.push({
      id: `lv-${r.id}`,
      code: r.metric_code,
      d: r.sampled_at ?? rep?.report_date ?? null,
      v,
      group: r.method ?? '',
      report: rep?.note ?? srcLabel(rep?.has_original === 0 ? null : 'lab_report', ''),
    });
  }
  return out;
}

/* ---------------- 其余实体 ---------------- */

function readEvents(db, pid) {
  return rows(db, 'SELECT * FROM events WHERE profile_id = ? ORDER BY rowid', pid).map((r) => ({
    id: `ev-${r.id}`,
    d: r.event_date,
    lane: r.lane,
    kind: r.kind,
    label: r.label,
    src: srcLabel(r.source_kind),
  }));
}

function readScreenings(db, pid) {
  return rows(db, 'SELECT * FROM screenings WHERE profile_id = ? AND in_use = 1 ORDER BY rowid', pid).map((r) => ({
    id: `sc-${r.id}`,
    item: r.item_title,
    last: r.last_done_date,
    next_hint: r.next_hint,
    src: r.source_kind ? srcLabel(r.source_kind) : '—',
  }));
}

function readCatheters(db, pid) {
  return rows(db, 'SELECT * FROM catheters WHERE profile_id = ? AND in_use = 1 ORDER BY rowid', pid).map((r) => ({
    id: `ca-${r.id}`,
    type: r.catheter_type,
    placed: r.placed_date,
    side: r.site_text,
    status: r.status_text,
    note: r.note ?? '',
  }));
}

function readLife(db, pid) {
  return rows(db, 'SELECT * FROM life_records WHERE profile_id = ? ORDER BY rowid', pid).map((r) => ({
    id: `li-${r.id}`,
    d: r.record_date,
    owner: r.owner,
    text: r.body,
    visibility: r.visibility,
  }));
}

function readQuestions(db, pid) {
  return rows(db, 'SELECT * FROM questions WHERE profile_id = ? ORDER BY rowid', pid).map((r) => ({
    id: `q-${r.id}`,
    text: r.body,
    source: r.source_label,
    selected: !!r.selected,
    kind: r.kind,
  }));
}

function readDocs(db, pid) {
  return rows(db, 'SELECT * FROM documents WHERE profile_id = ? ORDER BY rowid', pid).map((r) => ({
    id: `d-${r.id}`,
    name: r.file_name,
    date: r.doc_date,
    type: r.doc_type,
    status: r.parse_status === 'parsed' ? '已核对' : '待核对',
  }));
}

function readCandidates(db, pid) {
  return rows(db, 'SELECT * FROM import_candidates WHERE profile_id = ? ORDER BY rowid', pid).map((r) => ({
    id: `c-${r.id}`,
    name: r.field_name,
    value: r.candidate_value,
    source: r.source_quote,
    status: r.status,
  }));
}

/* ---------------- 资源与医保（16 表里没有资源表：内容性常量，随包发出，不进库） ---------------- */

export const RESOURCES = Object.freeze([
  { id: 'r1', name: '特医食品 / 肠内营养制剂', desc: '注册信息以国家市场监督管理总局特殊食品信息查询平台为准', src: '官方查询入口 · 演示占位', kind: '官方' },
  { id: 'r2', name: '病友组织 · 肠康荟（演示占位）', desc: 'SBS 患者关爱中心；正式版按 M4 核数后收录', src: '用户研究台账 · 演示占位', kind: '社群' },
  { id: 'r3', name: '慢特病报销（地方口径）', desc: '各地目录不同；未核实到全国口径，以当地医保局为准', src: '医保台账 · 演示占位', kind: '医保' },
]);

/** 一个档案的完整读模型（key 是 'A'/'B' 这类演示键；真实库退化为行 id 字符串）。 */
function readProfileBundle(db, key) {
  const pid = profileIdByKey(db, key);
  if (pid === null) return null;
  return {
    surgeryFacts: readSurgeryFacts(db, pid),
    pnRegimens: readRegimens(db, pid),
    infusions: readInfusions(db, pid),
    daily: readDaily(db, pid),
    labValues: readLabValues(db, pid),
    events: readEvents(db, pid),
    screenings: readScreenings(db, pid),
    catheters: readCatheters(db, pid),
    life: readLife(db, pid),
    questions: readQuestions(db, pid),
    docs: readDocs(db, pid),
    candidates: readCandidates(db, pid),
  };
}

export function listSubjects(db) {
  return rows(db, 'SELECT id, display_name, memo FROM profiles ORDER BY rowid')
    .map((r) => ({ key: jp(r.memo, {})?.key || String(r.id), id: r.id, name: r.display_name, meta: jp(r.memo, {})?.meta ?? null }));
}

/** `/api/short-bowel/bootstrap` 的 payload。version/build 由调用方注入（唯一来源 lib/version.js）。 */
export function bootstrap(db, { version, build } = {}) {
  const profiles = readProfiles(db);
  const keys = Object.keys(profiles);
  const bundles = {};
  for (const k of keys) bundles[k] = readProfileBundle(db, k) ?? {};
  const metrics = readMetricDefs(db);

  let primer = null;
  try { primer = loadDemoData().primer ?? null; } catch { primer = null; }

  return {
    version: version ?? null,
    build: build ?? null,
    profiles,
    surgeryFacts: Object.fromEntries(keys.map((k) => [k, bundles[k].surgeryFacts ?? []])),
    pnRegimens: Object.fromEntries(keys.map((k) => [k, bundles[k].pnRegimens ?? []])),
    infusions: Object.fromEntries(keys.map((k) => [k, bundles[k].infusions ?? []])),
    daily: Object.fromEntries(keys.map((k) => [k, bundles[k].daily ?? []])),
    labMetrics: metrics,
    labCats: readLabCats(metrics),
    labValues: Object.fromEntries(keys.map((k) => [k, bundles[k].labValues ?? []])),
    events: Object.fromEntries(keys.map((k) => [k, bundles[k].events ?? []])),
    screenings: Object.fromEntries(keys.map((k) => [k, bundles[k].screenings ?? []])),
    catheters: Object.fromEntries(keys.map((k) => [k, bundles[k].catheters ?? []])),
    life: Object.fromEntries(keys.map((k) => [k, bundles[k].life ?? []])),
    questions: Object.fromEntries(keys.map((k) => [k, bundles[k].questions ?? []])),
    docs: Object.fromEntries(keys.map((k) => [k, bundles[k].docs ?? []])),
    candidates: Object.fromEntries(keys.map((k) => [k, bundles[k].candidates ?? []])),
    resources: RESOURCES,
    primer,
    /* 宿主未提供原生会话时这里会是 available:false；开发版自带挂载位演示，所以默认 true。 */
    agent: { available: true, mode: 'dev-mount' },
    layout: { agentPane: AGENT_PANE },
  };
}

/** 单档案视图（私密三出口：?private=1 才带私密原文字段；本表结构里私密在 life/visibility）。 */
export function getProfile(db, key, opts = {}) {
  const profiles = readProfiles(db);
  const p = profiles[key];
  if (!p) return null;
  const bundle = readProfileBundle(db, key) ?? {};
  const includePrivate = opts.includePrivate === true;
  const life = bundle.life ?? [];
  const privateCount = life.filter((x) => x.visibility === 'private').length;
  const visibleLife = includePrivate ? life : life.filter((x) => x.visibility !== 'private');
  return {
    profile: p,
    surgeryFacts: bundle.surgeryFacts ?? [],
    pnRegimens: bundle.pnRegimens ?? [],
    infusions: bundle.infusions ?? [],
    daily: bundle.daily ?? [],
    labValues: bundle.labValues ?? [],
    events: bundle.events ?? [],
    screenings: bundle.screenings ?? [],
    catheters: bundle.catheters ?? [],
    life: visibleLife,
    lifePrivateCount: privateCount,
    questions: bundle.questions ?? [],
    docs: bundle.docs ?? [],
    candidates: bundle.candidates ?? [],
  };
}
