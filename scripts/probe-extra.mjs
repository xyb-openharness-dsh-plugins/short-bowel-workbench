'use strict';
/* probe-extra.mjs — M2 检查点补充量测：C1/C4/C5/C6/C8/C12、MT08/MT12/MT14、A1。 */
import puppeteer from 'puppeteer-core';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--no-first-run'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto('file://' + path.join(root, 'prototypes/v0.2/index.html'), { waitUntil: 'networkidle0' });
await page.click('[data-action="profiles"]');
await page.click('[data-action="pick-profile"][data-id="B"]');
await new Promise((r) => setTimeout(r, 200));
await page.evaluate(() => { location.hash = 'onechart/指标趋势'; window.dispatchEvent(new Event('hashchange')); });
await page.evaluate(() => { state.sel = ['mg', 'alb']; state.pin = null; render(); });
await new Promise((r) => setTimeout(r, 200));

/* C1：两条量纲差异大的线各自占满纵向区（bbox 高度接近满量程） */
const c1 = await page.evaluate(() => {
  const svg = document.querySelector('#timeline-svg');
  const paths = [...svg.querySelectorAll('path.line')].filter((p) => p.getBBox().height > 0);
  const hs = paths.map((p) => p.getBBox().height);
  const plotH = 300 - 96; // CY1-CY0
  return { count: hs.length, heights: hs.map((h) => Math.round(h)), full: hs.every((h) => h >= plotH * 0.85), plotH };
});
console.log(`C1 count=${c1.count} heights=${c1.heights} plotH=${c1.plotH} >=85%满量程=${c1.full}`);

/* C4：关事件泳道不改曲线（所有 path.line 的 d 逐项相等且非空） */
const d1 = await page.$$eval('#timeline-svg path.line', (ps) => ps.map((p) => p.getAttribute('d')));
await page.evaluate(() => { state.toggles.events = false; render(); });
await new Promise((r) => setTimeout(r, 150));
const d2 = await page.$$eval('#timeline-svg path.line', (ps) => ps.map((p) => p.getAttribute('d')));
console.log(`C4 pathsBefore=${d1.length} pathsAfter=${d2.length} identical=${d1.length === d2.length && d1.every((v, i) => v === d2[i])} nonEmpty=${d1.every(Boolean)}`);
await page.evaluate(() => { state.toggles.events = true; render(); });

/* C5：只标末点数值（每序列至多 1 个数值标签——非 tick 非标签 text 带数字） */
const c5 = await page.evaluate(() => {
  const svg = document.querySelector('#timeline-svg');
  const seq = svg.querySelectorAll('g').length;
  const valTags = [...svg.querySelectorAll('text')].filter((t) => !t.classList.contains('tick') && !t.classList.contains('lane-label') && /^\d/.test(t.textContent)).length;
  return { seq, valTags };
});
console.log(`C5 sequences>=${c5.seq} valueTags=${c5.valTags} (每序列≤1)`);

/* C6：所有 text bbox 在 viewBox 内 */
const c6 = await page.evaluate(() => {
  const svg = document.querySelector('#timeline-svg');
  const vb = svg.viewBox.baseVal;
  return [...svg.querySelectorAll('text')].every((t) => {
    const b = t.getBBox();
    return b.x >= -1 && b.y >= -1 && b.x + b.width <= vb.width + 1 && b.y + b.height <= vb.height + 1;
  });
});
console.log(`C6 文本不越界=${c6}`);

/* C8：时间窗联动——切近 3 月后点数减少 */
const allPts = await page.$$eval('#timeline-svg circle.pt', (n) => n.length);
await page.evaluate(() => { state.range = '3m'; render(); });
await new Promise((r) => setTimeout(r, 150));
const m3Pts = await page.$$eval('#timeline-svg circle.pt', (n) => n.length);
console.log(`C8 all=${allPts} 3m=${m3Pts} reduced=${m3Pts < allPts}`);
await page.evaluate(() => { state.range = 'all'; render(); });

/* C12：翻转独立——翻一张卡，其余 aria-pressed 仍 false */
await page.evaluate(() => { location.hash = 'labs/指标目录'; window.dispatchEvent(new Event('hashchange')); });
await new Promise((r) => setTimeout(r, 150));
const c12 = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('.mcard')];
  if (cards.length < 2) return { has: false };
  cards[0].click();
  const pressed = cards.map((c) => c.getAttribute('aria-pressed'));
  cards[0].click();
  return { has: true, pressed, onlyFirst: pressed[0] === 'true' && pressed.slice(1).every((v) => v === 'false') };
});
console.log(`C12 翻转独立=${c12.onlyFirst} states=${JSON.stringify(c12.pressed)}`);

/* MT08：键盘翻面（Tab 聚焦 + Enter）+ 隐藏面 inert 检查 */
const mt08 = await page.evaluate(() => {
  const card = document.querySelector('.mcard');
  card.focus();
  const ev = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
  card.dispatchEvent(ev);
  card.click(); // button 上 Enter 触发 click；直接 click 保证状态变化
  const pressed = card.getAttribute('aria-pressed');
  const backHidden = card.querySelector('.mface.back').getAttribute('aria-hidden') === 'true';
  return { pressed, backHidden, isButton: card.tagName === 'BUTTON' };
});
console.log(`MT08 isButton=${mt08.isButton} pressed=${mt08.pressed} back aria-hidden=${mt08.backHidden}`);

/* MT12：700/620 宽无整页横滚 */
for (const w of [700, 620]) {
  await page.setViewport({ width: w, height: 900 });
  await new Promise((r) => setTimeout(r, 200));
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  console.log(`MT12 width=${w} scrollWidth=${sw} ok=${sw <= w}`);
}

/* MT14：B 档案 178 次输液 + 曲线仍在固定区域 */
await page.setViewport({ width: 1440, height: 900 });
await page.evaluate(() => { location.hash = 'nutrition/按次登记'; window.dispatchEvent(new Event('hashchange')); });
await new Promise((r) => setTimeout(r, 150));
const mt14 = await page.evaluate(() => {
  const rows = document.querySelectorAll('#main tbody tr').length;
  const n = window.DEMO.infusions.B.length;
  return { rows, n };
});
await page.evaluate(() => { location.hash = 'onechart/指标趋势'; window.dispatchEvent(new Event('hashchange')); });
await new Promise((r) => setTimeout(r, 200));
const mt14b = await page.evaluate(() => {
  const svg = document.querySelector('#timeline-svg');
  const b = svg.querySelector('path.line').getBBox();
  return { x0: Math.round(b.x), y0: Math.round(b.y), inArea: b.x > 40 && b.y > 80 };
});
console.log(`MT14 登记 ${mt14.n} 条（表行 ${mt14.rows}）曲线在固定区域=${mt14b.inArea} bbox=(${mt14b.x0},${mt14b.y0})`);

/* A1：打开概要后背景滚不动 */
await page.evaluate(() => { window.scrollTo(0, 300); });
const scrollBefore = await page.evaluate(() => window.scrollY);
await page.evaluate(() => document.querySelector('[data-primer-open]').click());
await new Promise((r) => setTimeout(r, 150));
const bodyOverflow = await page.evaluate(() => getComputedStyle(document.body).overflow);
await page.evaluate(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); });
await new Promise((r) => setTimeout(r, 100));
const scrollAfter = await page.evaluate(() => window.scrollY);
console.log(`A1 scrollBefore=${scrollBefore} bodyOverflow(打开时)=${bodyOverflow} scrollAfter=${scrollAfter} 位置保持=${scrollBefore === scrollAfter}`);

await browser.close();
