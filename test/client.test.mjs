/* client.test.mjs — 外壳与面板参数（客户端链路第 1 环）。 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const { PANEL, AGENT_PANE, assertPanelConfig, clampAgentRatio, businessPanePx } = await import(join(root, 'lib', 'layout.js'))

test('面板参数单一来源：businessSide=left · businessWidth=0.65 · customFrame=true', () => {
  assert.equal(PANEL.businessSide, 'left')
  assert.equal(PANEL.businessWidth, 0.65)
  assert.equal(PANEL.customFrame, true)
  assert.deepEqual(assertPanelConfig(), [])
})

test('businessWidth 越界与贴上限都被拦（宿主 register() 会抛错的那几条）', () => {
  assert.ok(assertPanelConfig({ ...PANEL, businessWidth: 0.72 }).length > 0, '0.72 越界必须报')
  assert.ok(assertPanelConfig({ ...PANEL, businessWidth: 0.2 }).length > 0, '0.2 越界必须报')
  assert.ok(assertPanelConfig({ ...PANEL, businessWidth: 0.7 }).length > 0, '贴上限 0.7 本项目不用')
  assert.ok(assertPanelConfig({ ...PANEL, businessSide: 'up' }).length > 0)
})

test('AGENT_PANE 会话区 25%–45%，def 落在区间内；clamp 非数字回默认', () => {
  assert.equal(AGENT_PANE.min, 0.25)
  assert.equal(AGENT_PANE.max, 0.45)
  assert.ok(AGENT_PANE.def >= AGENT_PANE.min && AGENT_PANE.def <= AGENT_PANE.max)
  assert.equal(clampAgentRatio(0.9), 0.45)
  assert.equal(clampAgentRatio(-1), 0.25)
  assert.equal(clampAgentRatio('abc'), AGENT_PANE.def)
})

test('业务区像素宽度：1440×0.65=936', () => {
  assert.equal(businessPanePx(1440), 936)
  assert.equal(businessPanePx(1280), 832)
  assert.throws(() => businessPanePx(0))
})

test('lib/client.js 是构建产物且注入了 SBS 常量（包名/会话消息类型/宽度记忆键）', () => {
  const client = readFileSync(join(root, 'lib', 'client.js'), 'utf8')
  assert.match(client, /window\.__ModuleLoader__\.load\(/)
  assert.match(client, /id: '@xyb-community\/short-bowel-workbench'/)
  assert.match(client, /sbs:agent-draft/, '页面→外壳的草稿消息类型必须是 sbs:agent-draft')
  assert.match(client, /nutripal\.sbs\.agent-pane\.v1/, '宽度记忆键用 sbs 前缀')
  assert.match(client, /nutripal\.sbs\.initial-drafts\.v1/)
  assert.match(client, /--dsh-frame-leading-clearance/, 'macOS 窗口按钮避让')
  assert.match(client, /icon: '🌿'/, '品牌图标 🌿')
  assert.doesNotMatch(client, /cervi:agent-draft/, '不得残留底本的消息类型')
})

test('构建守卫：lib/client.js 与 src/client.js + 常量来源同步（build-client --check）', async () => {
  const { execFileSync } = await import('node:child_process')
  execFileSync('node', ['scripts/build-client.mjs', '--check'], { cwd: root, stdio: 'pipe' })
})

test('build-version --check：lib/version.js 与 VERSION 同步', async () => {
  const { execFileSync } = await import('node:child_process')
  execFileSync('node', ['scripts/build-version.mjs', '--check'], { cwd: root, stdio: 'pipe' })
})
