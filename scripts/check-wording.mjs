#!/usr/bin/env node
/**
 * check-wording.mjs — 患者可见文案红线（本仓自定义）。
 *
 * SBS 工作台的口径：只做本机资料整理，不做医学判断。患者会读到的文件（public/ 的
 * 页面与测试文案）里**不许出现**肿瘤/判读语义的词；否定口径句统一写「不做医学判断」。
 *
 * 词表（一次写死，新词在 WORDS 里加一行）：
 *   分期 / 线序 / 疗效应答 / 生存期 / 肿瘤标志物 / 诊断
 * （dsh/ lib/ 的开发者注释不在本检查范围——那不是患者可见文案；患者可见面 = public/ + test/。）
 *
 * 用法：node scripts/check-wording.mjs [--root .]
 * 退出码 0 干净 / 1 有命中。命中输出文件:行号。
 */
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs'
import { join, resolve, dirname, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(process.argv.includes('--root') ? process.argv[process.argv.indexOf('--root') + 1] : '.')
const SELF = dirname(fileURLToPath(import.meta.url))

export const WORDS = [
  [/分期/, '分期语义（FIGO/分期是其他病种的判定列，SBS 不做）'],
  [/线序/, '线序语义（治疗线序不属于 SBS 事实记录）'],
  [/疗效应答/, '疗效应答语义（无判定列）'],
  [/生存期/, '生存期语义（预后判断）'],
  [/肿瘤标志物/, '肿瘤标志物语义（非肿瘤工作台）'],
  [/诊断/, '诊断语义（统一写「不做医学判断」）'],
]

function walk(dir, out = []) {
  if (!existsSync(dir)) return out
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) walk(p, out)
    else if (['.html', '.css', '.js', '.mjs', '.json'].includes(extname(name))) out.push(p)
  }
  return out
}

const files = [
  ...walk(join(ROOT, 'public')),
  ...readdirSync(join(ROOT, 'test')).filter((f) => f.endsWith('.test.mjs')).map((f) => join(ROOT, 'test', f)),
]
/* 注意：本脚本自己的词表文件不扫——词表里按定义含这些词，扫它必然自咬。 */

const hits = []
for (const file of files) {
  const text = readFileSync(file, 'utf8')
  text.split('\n').forEach((line, i) => {
    for (const [re, why] of WORDS) {
      if (re.test(line)) hits.push(`${file}:${i + 1}  ${why}  → ${line.trim().slice(0, 80)}`)
    }
  })
}

if (hits.length) {
  console.error('✗ 文案红线检查失败（患者可见文件里出现了判读/肿瘤语义词）：')
  for (const h of hits) console.error('  ' + h)
  console.error('\n修法：改写为事实口径，例如「不做医学判断」「是否异常归医生判断」「节奏由医生定」。')
  process.exit(1)
}
console.log(`✓ 文案红线干净：public/ 与 test/ 无 判读/肿瘤语义 词（词表 ${WORDS.length} 条）`)
