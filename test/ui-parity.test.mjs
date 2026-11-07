/* ui-parity.test.mjs — public/ 与 prototypes/v0.2（G2 签认基准）的一致性断言。
 *
 * 语义：6 个非 app 文件逐字节一致；app.js 的全部视图函数逐字符一致，
 * 客户端链路差异只允许出现在显式登记的 DEV-BRIDGE 注释对里（文件头 manifest 列出全部对）。
 * 这是「原型即基准、开发版只改数据来源与宿主交界」的机械保证。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const pub = (f) => readFileSync(join(root, 'public', f), 'utf8')
const proto = (f) => readFileSync(join(root, 'prototypes/v0.2', f), 'utf8')

test('六个非 app 文件与原型基线逐字节一致', () => {
  for (const f of ['index.html', 'style.css', 'demo-data.js', 'primer-data.js', 'primer.css', 'primer.js']) {
    assert.equal(pub(f), proto(f), `public/${f} 必须与 prototypes/v0.2/${f} 逐字节一致`)
  }
})

test('app.js 的 DEV-BRIDGE 标记成对出现且 manifest 完整（差异必须显式登记）', () => {
  const s = pub('app.js')
  const begins = [...s.matchAll(/DEV-BRIDGE-BEGIN:([a-z-]+)/g)].map((m) => m[1])
  const ends = [...s.matchAll(/DEV-BRIDGE-END:([a-z-]+)/g)].map((m) => m[1])
  assert.deepEqual(begins, ends, 'BEGIN/END 必须成对且顺序一致')
  assert.deepEqual(begins, ['app-info', 'data-bridge', 'mineru', 'ai-link', 'boot'],
    `差异清单以 DEV-BRIDGE 对为准，实得：${begins.join(', ')}`)
  assert.match(s, /不在 DEV-BRIDGE 对里的不许改/, '文件头必须写明白名单纪律')
})

/** 抽取一个函数的完整源码（首个 `{` 起花括号配平）。 */
function extractFn(src, name) {
  const start = src.indexOf(`function ${name}(`)
  if (start === -1) return null
  const brace = src.indexOf('{', start)
  let depth = 0
  for (let i = brace; i < src.length; i++) {
    if (src[i] === '{') depth++
    else if (src[i] === '}') { depth--; if (depth === 0) return src.slice(start, i + 1) }
  }
  return null
}

const VIEW_FNS = [
  /* 一图秀与图表 */
  'smoothPath', 'seriesFor', 'domain', 'monthTicks', 'chartSVG', 'pinHTML', 'legendHTML', 'chartPanel', 'rail',
  /* 指标卡 / 日历 / 状态卡 */
  'sparkline', 'metricCard', 'metricGroups', 'calGrid', 'stageCard', 'miniWeightChart',
  /* 九个一级页 */
  'pageHome', 'pageArchive', 'pageNutrition', 'pageLabs', 'pageOnechart',
  'pageComplications', 'pageLife', 'pageVisits', 'pageResources',
  /* 表格与弹层（settingsModal 除外：它带 MinerU 设置块，属 DEV-BRIDGE 域） */
  'docsTable', 'aboutModal', 'profilesModal', 'summaryModal', 'helpModal',
  /* 渲染 */
  'paintVersion', 'paintReady', 'paintProfile', 'renderNav', 'render',
];

test(`app.js 的 ${VIEW_FNS.length} 个视图/渲染函数与原型逐字符一致（开发版只改数据来源，不改视图）`, () => {
  const p = pub('app.js')
  const q = proto('app.js')
  const missing = []
  for (const name of VIEW_FNS) {
    const a = extractFn(p, name)
    const b = extractFn(q, name)
    if (a === null || b === null) { missing.push(name); continue }
    assert.equal(a, b, `视图函数 ${name} 与原型不一致——视图层禁止改动（要改请在原型改并重新签认）`)
  }
  assert.equal(missing.length, 0, `函数抽取失败：${missing.join(', ')}`)
})

test('demo-data.js 唯一源：public 与 prototypes 同文件（双形态共用一份演示数据）', () => {
  assert.equal(pub('demo-data.js'), proto('demo-data.js'))
  assert.match(pub('app.js') ? pub('index.html') : '', /demo-data\.js/, 'index.html 必须先载入 demo-data.js（演示态数据源）')
})
