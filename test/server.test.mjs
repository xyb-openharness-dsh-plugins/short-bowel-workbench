/* server.test.mjs — 两条链路共用的路由表（bootstrap / profile / export / candidate / mineru 设置 / UI）。 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const { Workbench } = await import(join(root, 'dsh', 'workbench.js'))
const { startWorkbenchServer } = await import(join(root, 'dsh', 'server.js'))

/* 测试工作区放仓内 .test-tmp/：workspaceProblems 按纪律拒绝 /tmp 与 /var（资料目录口径），测试同样守规矩。 */
const workspace = mkdtempSync(join(root, '.test-tmp', 'sbs-wb-'))
const wb = await Workbench.open(workspace)
const { server, url } = await startWorkbenchServer({ port: 0, workbench: wb })
const base = url.replace(/\/$/, '')

const get = async (path, opts = {}) => {
  const res = await fetch(`${base}${path}`, opts)
  const text = await res.text()
  let json = null
  try { json = JSON.parse(text) } catch { /* 非 JSON 响应（UI/导出）原样返回 */ }
  return { status: res.status, headers: res.headers, text, json }
}

test.after(async () => {
  server.close()
  wb.close()
  rmSync(workspace, { recursive: true, force: true })
})

test('GET /api/short-bowel/bootstrap：两套档案、版本来自 lib/version.js', async () => {
  const r = await get('/api/short-bowel/bootstrap')
  assert.equal(r.status, 200)
  assert.equal(r.json.version, wb.version)
  assert.ok(r.json.profiles.A && r.json.profiles.B)
  assert.equal(r.json.infusions.A.length, 3)
  assert.ok(r.json.infusions.B.length > 100)
})

test('GET /api/short-bowel/profile/A：私密生活记录默认不给原文，?private=1 才给', async () => {
  const hidden = await get('/api/short-bowel/profile/B')
  assert.equal(hidden.status, 200)
  assert.equal(hidden.json.profile.life.filter((x) => x.visibility === 'private').length, 0)
  assert.equal(hidden.json.profile.lifePrivateCount, 1, 'B 档案有 1 条私密生活记录')
  const shown = await get('/api/short-bowel/profile/B?private=1')
  assert.equal(shown.json.profile.life.filter((x) => x.visibility === 'private').length, 1)
  assert.equal(await get('/api/short-bowel/profile/ZZ').then((r) => r.status), 404)
})

test('GET /api/short-bowel/export/B.md：私密条数如实标注、看法不当结论、只抄不解释', async () => {
  const r = await get('/api/short-bowel/export/B.md')
  assert.equal(r.status, 200)
  assert.match(r.headers.get('content-type') || '', /text\/markdown/)
  assert.match(r.text, /私密 1 条未包含/)
  assert.match(r.text, /本人看法，不当结论/)
  assert.doesNotMatch(r.text, /建议|需要注意/, '导出不写判读词')
  assert.match(r.headers.get('content-disposition') || '', /attachment/)
})

test('POST candidate accept：只改候选状态（接受 ≠ 医学审核）', async () => {
  const candId = (await get('/api/short-bowel/bootstrap')).json.candidates.A[0].id
  const r = await get(`/api/short-bowel/candidate/A/${encodeURIComponent(candId)}/accept`, { method: 'POST' })
  assert.equal(r.status, 200)
  assert.equal(r.json.changed, 1)
})

test('MinerU 设置 API：读状态只给掩码与路径；保存/清除走同一前缀', async () => {
  /* 清除后的「未配置」判定会被机器上遗留的 MINERU_TOKEN 环境变量兜底盖住（文件优先、env 次之是既定口径），
     所以本测试先把 env 隔离干净，结束时还原。 */
  const savedToken = process.env.MINERU_TOKEN
  delete process.env.MINERU_TOKEN
  const secret = join(workspace, 'mineru.json')
  writeFileSync(secret, JSON.stringify({ token: 'sk-test-token-abcdef123456' }), { mode: 0o600 })
  process.env.NUTRIPAL_MINERU_SECRET = secret
  try {
    const r = await get('/api/short-bowel/settings/mineru')
    assert.equal(r.status, 200)
    assert.equal(r.json.configured, true)
    assert.match(r.json.masked, /^sk-t\*\*\*\*56$/)
    assert.doesNotMatch(r.text, /sk-test-token-abcdef123456/, 'Token 原文永不出现在响应里')
    const cleared = await get('/api/short-bowel/settings/mineru', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'clear' }),
    })
    assert.equal(cleared.json.configured, false)
  } finally {
    if (savedToken !== undefined) process.env.MINERU_TOKEN = savedToken
    delete process.env.NUTRIPAL_MINERU_SECRET
  }
})

test('UI 静态出口：/api/short-bowel/ui/ 出 index.html；未知 /api 路径回 JSON 404 不回 HTML', async () => {
  const ui = await get('/api/short-bowel/ui/')
  assert.equal(ui.status, 200)
  assert.match(ui.text, /<title>小养宝 NutriPal/)
  const missing = await get('/api/short-bowel/definitely-not-a-route')
  assert.equal(missing.status, 404)
  assert.equal(missing.json?.error, 'not_found')
  const rootPage = await get('/')
  assert.equal(rootPage.status, 200)
  assert.match(rootPage.text, /<title>小养宝 NutriPal/)
})
