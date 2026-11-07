/* store.test.mjs — 数据层：开库 / 迁移 / 种子（schema 冻结纪律）。 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const { openDatabase, migrate, close } = await import(join(root, 'dsh', 'store.js'))
const { seedDemo, hasDemoData, loadDemoData, sourceKindOf } = await import(join(root, 'dsh', 'demo.js'))

function freshDb() {
  const db = openDatabase(':memory:')
  migrate(db)
  return db
}

test('冻结 schema：16 表 + 4 索引齐（不改 0001_initial.sql）', () => {
  const db = freshDb()
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != 'schema_migrations' ORDER BY name").all().map((r) => r.name)
  assert.equal(tables.length, 16, `实际表：${tables.join(', ')}`)
  for (const t of ['profiles', 'surgery_facts', 'lab_reports', 'lab_values', 'metric_defs', 'pn_regimens',
    'infusions', 'daily_records', 'events', 'screenings', 'life_records', 'questions', 'catheters',
    'documents', 'import_jobs', 'import_candidates']) {
    assert.ok(tables.includes(t), `缺表 ${t}`)
  }
  const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND sql IS NOT NULL").all()
  assert.ok(indexes.length >= 4, `索引不足：${indexes.length}`)
  close(db)
})

test('迁移幂等：重复 migrate 不重复执行、不报错', () => {
  const db = freshDb()
  const second = migrate(db)
  assert.deepEqual(second.executed, [], '第二次 migrate 应无新增执行')
  close(db)
})

test('种子：两套档案灌入，幂等不重复；行数与唯一源一致', () => {
  const db = freshDb()
  const counts = seedDemo(db)
  assert.equal(counts.skipped, false)
  assert.equal(counts.profiles, 2)
  assert.ok(counts.rows > 250, `B 档案 90 天输液支撑：行数 ${counts.rows}`)
  const again = seedDemo(db)
  assert.equal(again.skipped, true, '已有档案必须整批跳过')
  assert.equal(hasDemoData(db), true)
  close(db)
})

test('版本链纪律：surgery_facts / pn_regimens 每档案恰一条 in_use=1 且是最大 version', () => {
  const db = freshDb()
  seedDemo(db)
  for (const table of ['surgery_facts', 'pn_regimens']) {
    for (const pid of db.prepare('SELECT id FROM profiles ORDER BY rowid').all().map((r) => r.id)) {
      const rows = db.prepare(`SELECT version, in_use FROM ${table} WHERE profile_id = ? ORDER BY rowid`).all(pid)
      assert.ok(rows.length >= 1)
      const inUse = rows.filter((r) => r.in_use === 1)
      assert.equal(inUse.length, 1, `${table} profile ${pid}：in_use=1 应恰一条，实得 ${inUse.length}`)
      assert.equal(inUse[0].version, Math.max(...rows.map((r) => r.version)))
    }
  }
  close(db)
})

test('显式 null 纪律：未知值存 null 不存空串（回肠长度 / 未知日期 / 未做过筛查）', () => {
  const db = freshDb()
  seedDemo(db)
  /* A 档案：剩余空肠/回肠长度未知 → null（出院小结未写明） */
  const a = db.prepare("SELECT id FROM profiles WHERE memo LIKE '%\"key\":\"A\"%'").get()
  const sf = db.prepare('SELECT jejunum_cm, ileum_cm FROM surgery_facts WHERE profile_id = ? AND in_use = 1').get(a.id)
  assert.equal(sf.jejunum_cm, null)
  assert.equal(sf.ileum_cm, null)
  /* B 档案：daily_records 有一条 record_date = null（未知日期示例） */
  const b = db.prepare("SELECT id FROM profiles WHERE memo LIKE '%\"key\":\"B\"%'").get()
  const unknownDate = db.prepare('SELECT COUNT(*) AS n FROM daily_records WHERE profile_id = ? AND record_date IS NULL').get(b.id)
  assert.equal(unknownDate.n, 1, 'B 档案应有 1 条未知日期出入量')
  /* 未取得原件：has_original=0（据二次来源那条） */
  const noOrig = db.prepare('SELECT COUNT(*) AS n FROM lab_reports WHERE profile_id = ? AND has_original = 0').get(b.id)
  assert.equal(noOrig.n, 1)
  close(db)
})

test('私密纪律：life_records 默认 private=1，visibility 跟随唯一源', () => {
  const db = freshDb()
  seedDemo(db)
  const rows = db.prepare('SELECT visibility, private FROM life_records ORDER BY rowid').all()
  assert.ok(rows.length >= 3)
  for (const r of rows) assert.equal(r.private, 1, 'life_records 一律 private=1（列默认）')
  assert.ok(rows.some((r) => r.visibility === 'shared') && rows.some((r) => r.visibility === 'private'))
  close(db)
})

test('无判定列断言延续到写入口：seedDemo 不写 deny 词表列（schema 冻结合同 1）', () => {
  const db = freshDb()
  seedDemo(db)
  const cols = db.prepare("SELECT name FROM pragma_table_info('events')").all().map((r) => r.name)
  for (const bad of ['severity', 'verdict', 'grade', 'stage', 'risk_level']) {
    assert.ok(!cols.includes(bad), `events 不应有判定列 ${bad}`)
  }
  close(db)
})

test('loadDemoData：vm 求值 window.DEMO，两档案 + 90 天输液确定性生成', () => {
  const demo = loadDemoData()
  assert.ok(demo.profiles.A && demo.profiles.B)
  assert.ok(demo.infusions.B.length > 100, `B 输液条数 ${demo.infusions.B.length}`)
  const again = loadDemoData()
  assert.deepEqual(again.infusions.B, demo.infusions.B, '固定种子 IIFE 必须逐字节一致')
})

test('sourceKindOf：来源词表归类（readmodels 用同一张表还原）', () => {
  assert.equal(sourceKindOf('出院小结 · 第 1 页（模拟）'), 'discharge_summary')
  assert.equal(sourceKindOf('手术记录 · 第 2 页（模拟）'), 'surgery_note')
  assert.equal(sourceKindOf('复诊记录 · 医生口述（模拟）'), 'doctor_words')
  assert.equal(sourceKindOf('护理记录（模拟）'), 'nursing')
  assert.equal(sourceKindOf('随手记的'), 'patient_entry')
})
