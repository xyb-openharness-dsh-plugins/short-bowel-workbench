/* ui-base.test.mjs — public/ 页面基座：静态引用完整、apiBase 契约、双形态分支、MinerU 六部件、版本字面量。 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const P = (f) => join(root, 'public', f)
const app = () => readFileSync(P('app.js'), 'utf8')

test('public/ 七件齐', () => {
  for (const f of ['index.html', 'style.css', 'app.js', 'demo-data.js', 'primer-data.js', 'primer.css', 'primer.js']) {
    assert.ok(existsSync(P(f)), `缺 public/${f}`)
  }
})

test('index.html 的静态引用都真实存在（防「HTML 当 JS」的静默空白）', () => {
  const html = readFileSync(P('index.html'), 'utf8')
  const refs = [...html.matchAll(/(?:src|href)="(?!https?:|data:|#)([^"]+)"/g)].map((m) => m[1])
  assert.ok(refs.length >= 5, `应有本地资源引用：${refs.join(', ')}`)
  for (const ref of refs) assert.ok(existsSync(P(ref)), `index.html 引用了不存在的 ${ref}`)
})

test('apiBase 契约：剥 /api/short-bowel 前缀、file:// 演示态、bootstrap 前缀正确', () => {
  const s = app()
  assert.match(s, /function apiBase\(\)/)
  assert.match(s, /location\.protocol === 'file:'/, '独立打开（file://）必须走演示态分支')
  assert.match(s, /base\.replace\(\/\\\/api\\\/short-bowel\$\/, ''\)/, '挂载前缀必须剥掉 /api/short-bowel（否则拼出两次前缀 404）')
  assert.match(s, /\/api\/short-bowel\/bootstrap/, 'bootstrap 走 /api/short-bowel 前缀')
})

test('禁裸 throw：bootstrap / MinerU 状态 / Token 保存全部 catch 成状态提示', () => {
  const s = app()
  /* 函数体内检查（.then 链里的受控 throw 会把错误送进 .catch，属于链路内合法用法） */
  const fnBody = (name) => {
    const start = s.indexOf(`function ${name}(`)
    assert.ok(start !== -1, `缺少 ${name}`)
    const brace = s.indexOf('{', start)
    let depth = 0
    for (let i = brace; i < s.length; i++) {
      if (s[i] === '{') depth++
      else if (s[i] === '}') { depth--; if (depth === 0) return s.slice(start, i + 1) }
    }
    return ''
  }
  /* loadBootstrap 是 async/await：体内不得出现 throw（全部转状态提示）。
     其余三个走 promise 链：链内的受控 throw（if (!r.ok) throw → .catch）合法，要求有 .catch 收口。 */
  const boot = fnBody('loadBootstrap')
  assert.doesNotMatch(boot, /throw /, 'loadBootstrap 不得裸 throw')
  assert.ok(/catch/.test(boot), 'loadBootstrap 必须 catch 成状态文案')
  for (const name of ['loadMineruStatus', 'mineruPost', 'uploadToWorkbench']) {
    const body = fnBody(name)
    assert.match(body, /\.catch\(/, `${name} 必须 .catch 成状态文案`)
  }
})

test('双形态 AI 链接：iframe 内 postMessage(sbs:agent-draft)，独立打开保留演示弹窗', () => {
  const s = app()
  assert.match(s, /type: 'sbs:agent-draft', prompt, send: true/)
  assert.match(s, /window\.parent\.postMessage/)
  assert.match(s, /和 AI 讨论（本地演示）/, '独立打开的演示弹窗必须保留')
  assert.match(s, /DATA_SOURCE === 'api' && inIframe/, '只在「已连接 + iframe」形态才 postMessage')
  assert.doesNotMatch(s, /cervi:agent-draft/, '不得残留底本消息类型')
})

test('MinerU 六部件齐：设置 UI / settings API / 上传解析 / 状态 / 降级 / 指引', () => {
  const s = app()
  assert.match(s, /function mineruSettingsBlock\(/, '① 设置 UI')
  assert.match(s, /\/api\/short-bowel\/settings\/mineru/, '② settings API')
  assert.match(s, /function uploadToWorkbench\(/, '③ 上传解析')
  assert.match(s, /function loadMineruStatus\(/, '④ 状态')
  assert.match(s, /离线演示：未连接工作台，读不到 Token 状态/, '⑤ 演示态降级')
  assert.match(s, /mineru\.net\/apiManage\/token/, '⑥ 申请指引')
  assert.match(s, /persist=1/, '导入只进候选（persist=1 落 documents+candidates）')
})

test('版本回退态：APP_INFO 回退与 VERSION 同值，bootstrap 成功后取服务端版本并标注连接态', () => {
  const s = app()
  assert.match(s, /const APP_INFO = \{ version: '0\.2\.2'/)
  assert.match(s, /未连接服务/, '拿不到服务时界面必须标注「未连接服务」')
  assert.match(s, /APP_INFO\.version = data\.version/, '连接后版本从 bootstrap 取')
})

test('index.html 版本字面量与 VERSION 一致（存量字面量约定 B）', () => {
  const version = readFileSync(join(root, 'VERSION'), 'utf8').trim()
  const html = readFileSync(P('index.html'), 'utf8')
  const literals = [...html.matchAll(/v\d+\.\d+\.\d+(?:-[\da-zA-Z.-]+)?/g)].map((m) => m[0])
  assert.ok(literals.length > 0, '页面必须显示版本')
  for (const v of literals) assert.equal(v, `v${version}`, `版本字面量 ${v} ≠ VERSION v${version}`)
})
