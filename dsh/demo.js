/* 演示数据播种（短肠综合征）· 转换层：DEMO 结构 → 冻结 schema 的 16 表行。
 *
 * 唯一数据源是 `prototypes/v0.2/demo-data.js` 的 `window.DEMO`（两套档案 A/B，G2 签认的原型基准）。
 * 这里把它读进来（node:vm 里跑一遍，拿到 window.DEMO），再写进**用户资料目录里那个库**——
 * 不新增、不改写任何数值；种子在这里多出一条，原型与开发版就会各说一套。
 *
 * 与冻结 schema 的三条边界（schema/0001_initial.sql + freeze-contract.md，不许改表）：
 * 1. **DEMO 有字段、表没有列的**：能用语义列就用语义列（如 root→root_path、anchor→anchor_date），
 *    纯展示字段（short/meta/tag/full/stageState/unknownExample）以 JSON 存进 profiles.memo；
 *    指标的 color/groups 同理存 metric_defs.note。这是"缺列用现有 TEXT 列承载、写入时其余置 null"
 *    的既定口径——不 ALTER、不加表。
 * 2. **来源展示串没有列**：DEMO 的 source/src 是「出院小结 · 第 1 页（模拟）」这类展示串；
 *    表里只有 source_kind 分类列。种子按词表归类写 source_kind，展示串由 readmodels 反查还原
 *    （见 dsh/readmodels.js 的 SOURCE_LABELS，还原串与原串的差异在 demo-parity 白名单登记）。
 * 3. **演示 id 是字符串、表主键是 INTEGER rowid**：一律让 SQLite 自增，展示 id 由 readmodels
 *    按 `<前缀>-<rowid>` 稳定生成（demo-parity 测试对 id 做归一化后比较）。
 *
 * 幂等：库里已经有 profiles 就整批跳过。事务：整批一个事务，中途失败整体回滚。
 * 所有 INSERT 写显式列名 + 显式问号数；B 档案的 90 天输液由 demo-data.js 内的固定种子 IIFE
 * 生成（Math/Date 全固定），在 vm 里求值与浏览器里逐字节一致。
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

/** 唯一源：仓库内 prototypes/v0.2/demo-data.js（随包发出，files 白名单已登记）。 */
export const DEMO_SOURCE_FILE = fileURLToPath(new URL('../prototypes/v0.2/demo-data.js', import.meta.url));

/** 在沙箱里求值 demo-data.js，返回 window.DEMO（每次调用重新执行，调用方不得改写它）。
 *  返回前做 JSON 深拷贝：vm 沙箱对象的 Array/Object 原型来自另一个 realm，
 *  直接返回会让 assert.deepStrictEqual / deepEqual 因原型不同而假失败。 */
export function loadDemoData({ file = DEMO_SOURCE_FILE } = {}) {
  const source = readFileSync(file, 'utf8');
  const sandbox = { window: {}, console };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: file });
  const demo = sandbox.window?.DEMO;
  if (!demo || !demo.profiles) throw new Error(`demo-data.js 求值失败或缺少 window.DEMO：${file}`);
  return JSON.parse(JSON.stringify(demo));
}

/* ---------------- 源串 → source_kind（词表归类；readmodels 用同一张表还原） ---------------- */

const SOURCE_KIND_RULES = [
  ['出院', 'discharge_summary'],
  ['手术记录', 'surgery_note'],
  ['口述', 'doctor_words'],
  ['门诊', 'outpatient'],
  ['复诊记录', 'outpatient'],
  ['护理', 'nursing'],
  ['超声', 'imaging'],
  ['检验', 'lab_report'],
];

/** DEMO 的来源展示串 → source_kind；认不出就是 patient_entry（本人录入）。 */
export function sourceKindOf(text) {
  for (const [needle, kind] of SOURCE_KIND_RULES) {
    if (String(text ?? '').includes(needle)) return kind;
  }
  return 'patient_entry';
}

const PROFILE_KEYS = () => ['A', 'B'];

/** 把 loadDemoData() 的数据写进库。返回写入计数（便于启动日志与测试）。 */
export function seedDemo(db, input) {
  if (!db || typeof db.prepare !== 'function') throw new TypeError('seedDemo 需要一个已打开的数据库');
  const demo = input || loadDemoData();

  const already = db.prepare('SELECT COUNT(*) AS n FROM profiles').get().n;
  if (already > 0) return { skipped: true, profiles: 0, rows: 0 };

  const counts = { skipped: false, profiles: 0, rows: 0 };
  const bump = () => { counts.rows += 1; };

  db.exec('BEGIN');
  try {
    const insProfile = db.prepare(`INSERT INTO profiles
      (display_name, avatar_char, anchor_date, anchor_label, root_path, memo)
      VALUES (?,?,?,?,?,?)`);
    const insSurgery = db.prepare(`INSERT INTO surgery_facts
      (profile_id, version, in_use, fact_date, source_kind, doctor_name, private,
       resection_desc, jejunum_cm, ileum_cm, ileocecal_valve, colon_status, stoma_status, extra_text)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    const insRegimen = db.prepare(`INSERT INTO pn_regimens
      (profile_id, version, in_use, effective_date, freq_days_per_week, hours_per_session, route,
       volume_ml, kcal, source_kind, private, note)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
    const insInfusion = db.prepare(`INSERT INTO infusions
      (profile_id, infusion_date, volume_ml, hours, route, recorder, source_kind, private, note)
      VALUES (?,?,?,?,?,?,?,?,?)`);
    const insDaily = db.prepare(`INSERT INTO daily_records
      (profile_id, record_date, weight_kg, urine_ml, stool_times, recorder, source_kind, private, note)
      VALUES (?,?,?,?,?,?,?,?,?)`);
    const insMetric = db.prepare(`INSERT INTO metric_defs
      (code, display_name, unit, category, dec_digits, note, sort_order, in_use)
      VALUES (?,?,?,?,?,?,?,1)`);
    const insReport = db.prepare(`INSERT INTO lab_reports
      (profile_id, report_date, org_name, has_original, note)
      VALUES (?,?,?,?,?)`);
    const insLabValue = db.prepare(`INSERT INTO lab_values
      (profile_id, report_id, metric_code, value_num, value_text, unit, method, org_name, ref_text, sampled_at, private)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
    const insEvent = db.prepare(`INSERT INTO events
      (profile_id, event_date, lane, kind, label, source_kind, private)
      VALUES (?,?,?,?,?,?,?)`);
    const insScreening = db.prepare(`INSERT INTO screenings
      (profile_id, item_title, last_done_date, next_hint, section_title, source_kind, private, in_use)
      VALUES (?,?,?,?,?,?,?,1)`);
    const insCatheter = db.prepare(`INSERT INTO catheters
      (profile_id, catheter_type, placed_date, removed_date, site_text, status_text, private, note, in_use)
      VALUES (?,?,?,?,?,?,?,?,1)`);
    const insLife = db.prepare(`INSERT INTO life_records
      (profile_id, record_date, owner, body, visibility, private)
      VALUES (?,?,?,?,?,1)`);
    const insQuestion = db.prepare(`INSERT INTO questions
      (profile_id, body, kind, selected, source_label, private)
      VALUES (?,?,?,?,?,0)`);
    const insDoc = db.prepare(`INSERT INTO documents
      (profile_id, file_name, doc_type, doc_date, parse_status, private)
      VALUES (?,?,?,?,?,0)`);
    const insCandidate = db.prepare(`INSERT INTO import_candidates
      (profile_id, target_table, field_name, candidate_value, source_quote, status, private)
      VALUES (?,?,?,?,?,?,0)`);

    const profileIds = {};

    for (const key of PROFILE_KEYS()) {
      const p = demo.profiles[key];
      if (!p) continue;
      /* 展示字段没有专属列：以 JSON 存 memo（不改表、不加列）。 */
      const memo = JSON.stringify({
        key, short: p.short ?? null, meta: p.meta ?? null, tag: p.tag ?? null,
        full: p.full ?? false, stageState: p.stageState ?? null, unknownExample: p.unknownExample ?? null,
      });
      const r = insProfile.run(p.name, p.avatar ?? null, p.anchor ?? null, p.anchorLabel ?? null,
        p.root ? p.root : null, memo);
      const profileId = Number(r.lastInsertRowid);
      profileIds[key] = profileId;
      counts.profiles += 1;

      /* —— 手术事实（版本链；in_use = 最新版本） —— */
      const facts = demo.surgeryFacts?.[key] ?? [];
      const maxVersion = facts.reduce((a, f) => Math.max(a, f.version ?? 0), 0);
      for (const f of facts) {
        const fa = f.facts ?? {};
        insSurgery.run(
          profileId, f.version ?? 1, (f.version ?? 1) === maxVersion ? 1 : 0,
          f.d ?? null, sourceKindOf(f.source), f.doctor ?? null, 0,
          fa['切除范围'] ?? null, fa['剩余空肠长度_cm'] ?? null, fa['剩余回肠长度_cm'] ?? null,
          fa['回盲瓣'] ?? null, fa['结肠'] ?? null, fa['造口'] ?? null, fa['补充'] ?? null,
        );
        bump();
      }

      /* —— 营养方案版本链 —— */
      const rgs = demo.pnRegimens?.[key] ?? [];
      const maxRg = rgs.reduce((a, g) => Math.max(a, g.version ?? 0), 0);
      for (const rg of rgs) {
        const freq = /每周\s*(\d+)\s*天/.exec(String(rg.freq ?? ''));
        insRegimen.run(
          profileId, rg.version ?? 1, (rg.version ?? 1) === maxRg ? 1 : 0,
          rg.d ?? null, freq ? Number(freq[1]) : null, rg.hours ?? null, rg.route ?? null,
          rg.volume_ml ?? null, rg.kcal ?? null, sourceKindOf(rg.source), 0, rg.note ?? null,
        );
        bump();
      }

      /* —— 输液按次登记 —— */
      for (const v of demo.infusions?.[key] ?? []) {
        const src = String(v.src ?? '');
        insInfusion.run(
          profileId, v.d ?? null, v.ml ?? null, v.hours ?? null, v.route ?? null,
          src.startsWith('家属') ? '家属' : '本人', 'manual', 0, v.note ?? null,
        );
        bump();
      }

      /* —— 出入量 / 体重（未知日期显式 null） —— */
      for (const v of demo.daily?.[key] ?? []) {
        const src = String(v.src ?? '');
        insDaily.run(
          profileId, v.d ?? null, v.weight_kg ?? null, v.urine_ml ?? null, v.stool_times ?? null,
          src.startsWith('家属') ? '家属' : '本人', 'manual', 0, v.note ?? null,
        );
        bump();
      }
    }

    /* —— 指标目录（note 列以 JSON 承载 color/groups，见文件头边界 1） —— */
    const metricUnit = {};
    Object.entries(demo.labMetrics ?? {}).forEach(([code, m], i) => {
      metricUnit[code] = m.unit ?? null;
      insMetric.run(code, m.name, m.unit ?? null, m.cat ?? null, m.dec ?? 1,
        JSON.stringify({ note: m.note ?? null, color: m.color ?? null, groups: m.groups ?? {} }), i);
      bump();
    });

    /* —— 化验：每次记录一份 lab_reports（展示串存 note），lab_values.method 存可比组键 —— */
    for (const key of PROFILE_KEYS()) {
      for (const v of demo.labValues?.[key] ?? []) {
        const group = String(v.group ?? '');
        const org = group.split('·')[2] ?? null;
        const hasOriginal = String(v.report ?? '').startsWith('未取得原件') ? 0 : 1;
        const rr = insReport.run(profileIds[key], v.d ?? null, org, hasOriginal, v.report ?? null);
        insLabValue.run(profileIds[key], Number(rr.lastInsertRowid), v.code, typeof v.v === 'number' ? v.v : null,
          typeof v.v === 'number' ? null : (v.v ?? null), metricUnit[v.code] ?? null, group, org, null, v.d ?? null, 0);
        bump(); bump();
      }
    }

    /* —— 事件泳道 / 筛查 / 导管 / 生活 / 问题 / 文档 / 候选 —— */
    for (const key of PROFILE_KEYS()) {
      for (const e of demo.events?.[key] ?? []) {
        insEvent.run(profileIds[key], e.d ?? null, e.lane ?? 'visit', e.kind ?? null,
          e.label ?? '', sourceKindOf(e.src), 0);
        bump();
      }
      for (const s of demo.screenings?.[key] ?? []) {
        const srcText = String(s.src ?? '');
        insScreening.run(profileIds[key], s.item ?? '', s.last ?? null, s.next_hint ?? null,
          null, srcText && srcText !== '—' ? sourceKindOf(srcText) : null, 0);
        bump();
      }
      for (const c of demo.catheters?.[key] ?? []) {
        const removed = /已拔除（(\d{4}-\d{2}-\d{2})）/.exec(String(c.status ?? ''));
        insCatheter.run(profileIds[key], c.type ?? null, c.placed ?? null,
          removed ? removed[1] : null, c.side ?? null, c.status ?? null, 0, c.note ?? null);
        bump();
      }
      for (const it of demo.life?.[key] ?? []) {
        insLife.run(profileIds[key], it.d ?? null, it.owner === 'caregiver' ? 'caregiver' : 'patient',
          it.text ?? '', it.visibility === 'shared' ? 'shared' : 'private');
        bump();
      }
      for (const q of demo.questions?.[key] ?? []) {
        insQuestion.run(profileIds[key], q.text ?? '', q.kind === 'view' ? 'view' : 'fact',
          q.selected ? 1 : 0, q.source ?? null);
        bump();
      }
      for (const d of demo.docs?.[key] ?? []) {
        insDoc.run(profileIds[key], d.name ?? '', d.type ?? null, d.date ?? null,
          d.status === '已核对' ? 'parsed' : 'pending');
        bump();
      }
      for (const c of demo.candidates?.[key] ?? []) {
        insCandidate.run(profileIds[key], 'pending_review', c.name ?? '', c.value ?? null,
          c.source ?? null, c.status === 'needs_review' ? 'needs_review' : 'candidate');
        bump();
      }
    }

    db.exec('COMMIT');
  } catch (error) {
    try { db.exec('ROLLBACK'); } catch { /* 回滚失败也要把原始错误抛出去 */ }
    throw new Error(`播种演示数据失败（已回滚）：${error.message}`);
  }
  return counts;
}

/** 库的演示档案是否已播种过。启动流程用它决定要不要 seedDemo。 */
export function hasDemoData(db) {
  try {
    return db.prepare('SELECT COUNT(*) AS n FROM profiles').get().n > 0;
  } catch {
    return false;
  }
}
