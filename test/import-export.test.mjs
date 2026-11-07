/* import-export.test.mjs — MinerU 导入链路（只抄不推测 / 候选不是记录）与复诊摘要导出（私密三出口）。 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const { extractLabCandidates, guessReportDate, ImportService } = await import(join(root, 'dsh', 'import.js'))
const { openDatabase, migrate, close } = await import(join(root, 'dsh', 'store.js'))
const { seedDemo } = await import(join(root, 'dsh', 'demo.js'))
const { renderVisitSummaryMarkdown, exportFilename } = await import(join(root, 'dsh', 'export.js'))
const { getProfile } = await import(join(root, 'dsh', 'readmodels.js'))

test('抽候选：只抄单一数值；参考范围 / 两数一格 / 认识的单位才收', () => {
  const md = [
    '| 项目 | 结果 | 单位 | 提示 |',
    '| --- | --- | --- | --- |',
    '| 血镁 | 0.72 | mmol/L | — |',
    '| 血钾 | 3.4-3.6 | mmol/L | 参考内 |',      // 两数一格：整行放弃
    '| 白蛋白 | 38.6 | g/L | — |',
    '| 血钠 | 139 | mmol/L | — |',               // 字典里没有 → 不生成候选
    '| ALT | <40 | U/L | — |',                   // 带比较符：留原文，value_num 为 null
  ].join('\n')
  const { candidates, skipped } = extractLabCandidates(md)
  assert.deepEqual(candidates.map((c) => [c.key, c.value, c.unit]), [
    ['mg', 0.72, 'mmol/L'],
    ['alb', 38.6, 'g/L'],
    ['alt', '<40', 'U/L'],
  ])
  assert.ok(skipped.some((s) => s.name === '血钾'), '两数一格整行放弃')
})

test('guessReportDate：文件名优先，取不到不猜今天', () => {
  assert.equal(guessReportDate('检验 2026-05-11.pdf'), '2026-05-11')
  assert.equal(guessReportDate('2026年5月11日化验单'), '2026-05-11')
  assert.equal(guessReportDate('没有日期.pdf', null), null)
})

test('ImportService.record：只写 documents + import_jobs + import_candidates，不碰 lab_values', async () => {
  const db = openDatabase(':memory:')
  migrate(db)
  seedDemo(db)
  const fakeClient = { parse: async ({ bytes, filename }) => ({
    markdown: '| 项目 | 结果 |\n| --- | --- |\n| 血镁 | 0.72 |',
    pages: 1,
    batchId: 'b-1',
  }) }
  const svc = new ImportService(db, { client: fakeClient })
  const parsed = await svc.parse(Buffer.from('%PDF-fake'), { filename: '检验 2026-05-11.pdf', profileKey: 'A' })
  assert.equal(parsed.candidates.length, 1)
  assert.equal(parsed.document.date, '2026-05-11')

  const before = db.prepare('SELECT COUNT(*) AS n FROM lab_values').get().n
  const rec = svc.record({ profileKey: 'A', document: parsed.document, candidates: parsed.candidates })
  assert.equal(rec.candidates, 1)
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM lab_values').get().n, before, '候选核对前不入事实层')

  const cand = db.prepare("SELECT id, status FROM import_candidates WHERE profile_id = (SELECT id FROM profiles WHERE memo LIKE '%\"key\":\"A\"%') ORDER BY rowid DESC").get()
  assert.equal(cand.status, 'candidate')
  const accepted = svc.accept('A', `c-${cand.id}`)
  assert.equal(accepted.changed, 1)
  assert.equal(db.prepare('SELECT status FROM import_candidates WHERE id = ?').get(cand.id).status, 'accepted')
  close(db)
})

test('空文件 / 没有客户端：明确报错，不静默成功', async () => {
  const db = openDatabase(':memory:')
  migrate(db)
  const svc = new ImportService(db, { client: null })
  await assert.rejects(() => svc.parse(Buffer.from('x'), { filename: 'a.pdf' }), /MinerU/)
  const svc2 = new ImportService(db, { client: { parse: async () => ({ markdown: '' }) } })
  await assert.rejects(() => svc2.parse(Buffer.alloc(0), { filename: 'a.pdf' }), /空/)
  close(db)
})

test('复诊摘要导出：私密生活记录不进导出；热量未知显式留空；看法带标注', () => {
  const db = openDatabase(':memory:')
  migrate(db)
  seedDemo(db)
  const full = getProfile(db, 'B', { includePrivate: true })
  const excludedPrivate = full.lifePrivateCount
  const profile = { ...full, life: full.life.filter((x) => x.visibility !== 'private') }
  const md = renderVisitSummaryMarkdown(profile, { version: '0.2.0', excludedPrivate })
  assert.match(md, /私密 1 条未包含/)
  assert.doesNotMatch(md, /配液和冲管都是我在弄/, '私密原文不得出现在导出')
  assert.match(md, /本人看法，不当结论/)
  assert.match(exportFilename(profile), /^复诊摘要-/)

  /* A 档案最新方案热量未写明 → 显式「未记录」，不猜 */
  const fullA = getProfile(db, 'A', { includePrivate: true })
  const mdA = renderVisitSummaryMarkdown({ ...fullA, life: fullA.life }, { version: '0.2.0', excludedPrivate: 0 })
  assert.match(mdA, /热量：未记录（未知值显式留空，不猜）/)
  close(db)
})
