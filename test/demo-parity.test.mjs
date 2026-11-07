/* demo-parity.test.mjs — bootstrap 读模型与 prototypes/v0.2/demo-data.js（唯一源）逐项同形。
 *
 * 冻结 schema 只给语义列：字符串展示 id 与部分来源展示串没有专属列（不许改表），
 * 所以本测试做**白名单归一化**后 deepStrictEqual，并在文件头登记两类差异：
 *   ① id 归一化：演示 id（'in-a1'）→ 读模型稳定 id（'in-<rowid>'），前端把它当不透明令牌；
 *   ② 来源展示串：表里只有 source_kind 分类列，读模型按词表反查还原；
 *      与原串的措辞差异逐对登记在 SOURCE_PAIRS（如「复诊记录」→「门诊记录」）。
 * 除这两类外，任何字段形状或取值不一致都是失败。
 */
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const { openDatabase, migrate, close } = await import(join(root, 'dsh', 'store.js'))
const { seedDemo, loadDemoData } = await import(join(root, 'dsh', 'demo.js'))
const { bootstrap } = await import(join(root, 'dsh', 'readmodels.js'))

/* ② 来源展示串差异白名单：key = 唯一源原串，value = 读模型还原串（source_kind 词表的往返差）。 */
const SOURCE_PAIRS = {
  '出院医嘱（模拟）': '出院小结（模拟）',
  '复诊记录（模拟）': '门诊记录（模拟）',
  '门诊调方（模拟）': '门诊记录（模拟）',
};

const stripIds = (x) => {
  if (Array.isArray(x)) return x.map(stripIds);
  if (x && typeof x === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(x)) if (k !== 'id') out[k] = stripIds(v);
    return out;
  }
  return x;
};
/* 来源串归一：读模型只有 source_kind 分类列，「 · 第 N 页」这类页码细节没有列可放（冻结合同），
   所以唯一源侧去掉「 · …」中缀后比较；整串措辞差异仍须落在 SOURCE_PAIRS 白名单里。 */
const normSource = (s) => {
  const raw = String(s);
  /* 「医生口述」是独立分类（source_kind=doctor_words），优先于「 · 」中缀与整串白名单 */
  if (raw.includes('口述')) return '医生口述（模拟）';
  const base = raw.split(' · ')[0];
  return SOURCE_PAIRS[base] ?? (base.endsWith('（模拟）') ? base : `${base}（模拟）`);
};
const mapSources = (x) => {
  if (Array.isArray(x)) return x.map(mapSources);
  if (x && typeof x === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(x)) out[k] = k === 'source' || k === 'src' ? normSource(v) : mapSources(v);
    return out;
  }
  return x;
};
const demoNote = (x) => { /* DEMO 里可省略的 note 读模型补成 ''：统一两侧形状（daily 每条都有 note 键） */
  if (Array.isArray(x)) return x.map(demoNote);
  if (x && typeof x === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(x)) {
      out[k] = k === 'note' ? (v ?? '') : demoNote(v);
    }
    if (!('note' in out)) out.note = '';
    return out;
  }
  return x;
};

const db = openDatabase(':memory:');
migrate(db);
seedDemo(db);
const data = bootstrap(db, { version: '0.2.0', build: '2026-11-08' });
const demo = loadDemoData();
close(db);

test('id 归一化后与唯一源逐项 deepEqual（profiles/surgeryFacts/pnRegimens）', () => {
  assert.deepEqual(stripIds(data.profiles), stripIds(demo.profiles));
  assert.deepEqual(mapSources(stripIds(data.surgeryFacts)), mapSources(stripIds(demo.surgeryFacts)));
  assert.deepEqual(mapSources(stripIds(data.pnRegimens)), mapSources(stripIds(demo.pnRegimens)));
});

test('id 归一化后与唯一源逐项 deepEqual（输液/出入量/化验）', () => {
  assert.deepEqual(mapSources(stripIds(data.infusions)), mapSources(stripIds(demo.infusions)));
  assert.deepEqual(mapSources(demoNote(stripIds(data.daily))), demoNote(stripIds(demo.daily)));
  assert.deepEqual(data.labMetrics, demo.labMetrics);
  assert.deepEqual(data.labCats, demo.labCats);
  assert.deepEqual(stripIds(data.labValues), stripIds(demo.labValues));
});

test('id 归一化后与唯一源逐项 deepEqual（事件/筛查/导管/生活/问题/文档/候选）', () => {
  assert.deepEqual(mapSources(stripIds(data.events)), mapSources(stripIds(demo.events)));
  assert.deepEqual(mapSources(stripIds(data.screenings)), mapSources(stripIds(demo.screenings)));
  assert.deepEqual(stripIds(data.catheters), stripIds(demo.catheters));
  assert.deepEqual(stripIds(data.life), stripIds(demo.life));
  assert.deepEqual(stripIds(data.questions), stripIds(demo.questions));
  assert.deepEqual(stripIds(data.docs), stripIds(demo.docs));
  assert.deepEqual(stripIds(data.candidates), stripIds(demo.candidates));
});

test('resources / primer 与唯一源一致（primer 唯一源为 primer-data.js，经 loadDemoData 挂载）', () => {
  assert.deepEqual(data.resources, demo.resources);
  const primerSrc = readFileSync(new URL('../prototypes/v0.2/primer-data.js', import.meta.url), 'utf8');
  const sandbox = vm.createContext({ window: {} });
  vm.runInContext(primerSrc, sandbox);
  assert.deepEqual(data.primer, sandbox.window.DISEASE_PRIMER);
  assert.equal(data.primer.sections.length, 4);
});

test('展示 id 稳定且带前缀（两轮 bootstrap 同值；前端当不透明令牌）', () => {
  const again = (() => {
    const db2 = openDatabase(':memory:');
    migrate(db2);
    seedDemo(db2);
    const d2 = bootstrap(db2, { version: '0.2.0', build: '2026-11-08' });
    close(db2);
    return d2;
  })();
  for (const [k, arr] of Object.entries(again.infusions)) {
    assert.deepEqual(arr.map((x) => x.id), data.infusions[k].map((x) => x.id), `${k} 输液 id 必须稳定`);
    assert.ok(arr.every((x) => /^in-\d+$/.test(x.id)));
  }
  assert.ok(data.labValues.B.every((x) => /^lv-\d+$/.test(x.id)));
  assert.ok(data.events.A.every((x) => /^ev-\d+$/.test(x.id)));
});

test('bootstrap 元数据：version/build 注入 + agent/layout 契约', () => {
  assert.equal(data.version, '0.2.0');
  assert.equal(data.agent.available, true);
  assert.equal(data.layout.agentPane.min, 0.25);
  assert.equal(data.layout.agentPane.max, 0.45);
});
