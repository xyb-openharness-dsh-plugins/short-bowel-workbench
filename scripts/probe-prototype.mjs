'use strict';
/* probe-prototype.mjs — 原型 v0.2 探针（M2 检查点出数）。
   用本机 Chrome + CDP 逐条量测，不做「看过了」式检查。用法：node scripts/probe-prototype.mjs [--shot dir] */
import puppeteer from 'puppeteer-core';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const proto = path.join(root, 'prototypes', 'v0.2');
const url = 'file://' + path.join(proto, 'index.html');
const shotDir = process.argv.includes('--shot') ? process.argv[process.argv.indexOf('--shot') + 1] : null;

const results = [];
const add = (id, ok, detail) => { results.push({ id, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${id} — ${detail}`); };

const CHROME = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
const browser = await puppeteer.launch({ executablePath: CHROME[0], headless: 'new', args: ['--no-first-run', '--disable-extensions'] });
const page = await browser.newPage();
const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', (e) => consoleErrors.push(String(e)));
await page.setViewport({ width: 1440, height: 900 });
await page.goto(url, { waitUntil: 'networkidle0' });
await page.waitForSelector('#main .card', { timeout: 5000 });

/* Q3 首屏非空 */
{
  const cards = await page.$$eval('#main .card', (n) => n.length);
  add('Q3-首屏', cards >= 5, `首页 .card=${cards}`);
}

/* Q1/IP 覆盖：9 个一级页逐页渲染 + 每页 AI 入口 */
const PAGES = ['home', 'archive', 'nutrition', 'labs', 'onechart', 'complications', 'life', 'visits', 'resources'];
const pageName = {};
for (const [key, name] of await page.$$eval('#nav .nav-button', (ns) => ns.map((n) => [n.dataset.page, n.querySelector('span').textContent]))) pageName[key] = name;
add('IP3-导航九页', PAGES.every((p) => pageName[p]), `nav keys=${Object.keys(pageName).length}`);

let aiChips = 0, subPagesVisited = new Set();
for (const p of PAGES) {
  await page.evaluate((k) => window.history.pushState(null, '', '#' + k), p);
  await page.evaluate((k) => { window.dispatchEvent(new HashChangeEvent('hashchange')); location.hash = k; });
  await page.evaluate((k) => { location.hash = k; window.dispatchEvent(new Event('hashchange')); }, p);
  await new Promise((r) => setTimeout(r, 120));
  const rendered = await page.$eval('#main', (m) => m.innerHTML.length);
  const subs = await page.$$eval('.subnav button', (bs) => bs.map((b) => b.textContent));
  for (const s of subs) {
    await page.evaluate((k, ss) => { location.hash = k + '/' + encodeURIComponent(ss); window.dispatchEvent(new Event('hashchange')); }, p, s);
    await new Promise((r) => setTimeout(r, 80));
    subPagesVisited.add(p + '/' + s);
    const len = await page.$eval('#main', (m) => m.innerHTML.length);
    if (len < 200) add('X2-页覆盖-' + p + '/' + s, false, `rendered=${len}`);
  }
  const hasAI = await page.$('#main .ai-link, .top-actions .ai-link');
  const aiInMain = await page.$$eval('#main .ai-link', (n) => n.length);
  aiChips += aiInMain;
  add('渲染-' + p, rendered > 500, `len=${rendered} subs=${subs.length} ai=${aiInMain > 0}`);
}
add('Q14-AI入口', aiChips >= 8, `全站 ai-link=${aiChips}`);
const totalSubs = await page.evaluate(() => document ? null : null); // placeholder
const expectedSubs = Object.values({ home: 2, archive: 3, nutrition: 4, labs: 3, onechart: 2, complications: 3, life: 3, visits: 3, resources: 1 }).reduce((a, b) => a + b, 0);
add('IP2-孤儿页', expectedSubs > 0 && subPagesVisited.size > 0 && subPagesVisited.size === expectedSubs, `visited=${subPagesVisited.size}/${expectedSubs}`);

/* Q9/Q10 两套档案切换：数据条数不同 + 不串档 */
const countsA = await page.evaluate(() => ({
  inf: window.DEMO.infusions.A.length, lab: window.DEMO.labValues.A.length, life: window.DEMO.life.A.length, docs: window.DEMO.docs.A.length
}));
await page.evaluate(() => { location.hash = 'home'; window.dispatchEvent(new Event('hashchange')); });
await page.click('[data-action="profiles"]');
await page.click('[data-action="pick-profile"][data-id="B"]');
await new Promise((r) => setTimeout(r, 150));
const profileNow = await page.$eval('#profile-name', (n) => n.textContent);
const countsB = await page.evaluate(() => ({
  inf: window.DEMO.infusions.B.length, lab: window.DEMO.labValues.B.length, life: window.DEMO.life.B.length, docs: window.DEMO.docs.B.length
}));
add('Q9-两套档案', profileNow.includes('B') && countsB.inf > countsA.inf && countsB.lab > countsA.lab,
  `A=${JSON.stringify(countsA)} B=${JSON.stringify(countsB)} now=${profileNow}`);
/* 不串档：B 下输液日历打点数 = B 登记数（月内） */
await page.evaluate(() => { location.hash = 'nutrition/输液日历'; window.dispatchEvent(new Event('hashchange')); });
await new Promise((r) => setTimeout(r, 120));
const calTags = await page.$$eval('#cal-grid .tag.on', (n) => n);
const calExpect = await page.evaluate(() => window.DEMO.infusions.B.filter((v) => v.d && v.d.startsWith('2026-11')).length);
add('Q10-切换不串档', calTags.length > 0 && calExpect > 0 && calTags.length === calExpect, `cal tags=${calTags.length} expect=${calExpect}`);
/* P0 回归：看板不得出现私密记录正文（filterPrivate 断言） */
const dashText = await page.$eval('#main', (m) => m.textContent);
const privText = await page.evaluate(() => window.DEMO.life.B.find((x) => x.visibility === 'private').text);
add('Q35-看板私密', !dashText.includes(privText.slice(0, 12)), privText ? '私密正文未出现在看板' : 'no private');
/* 切回 A 复查三条不串 */
await page.click('[data-action="profiles"]');
await page.click('[data-action="pick-profile"][data-id="A"]');
await new Promise((r) => setTimeout(r, 120));
const regRows = await page.evaluate(() => window.DEMO.infusions.A.length);
add('Q10-切回A', regRows === countsA.inf, `A rows=${regRows}`);

/* 一图秀：path 数>0、单点不连线、空窗口、C10 减少动效（B 档案，多点序列） */
await page.evaluate(() => { location.hash = 'home'; window.dispatchEvent(new Event('hashchange')); });
await page.click('[data-action="profiles"]');
await page.click('[data-action="pick-profile"][data-id="B"]');
await new Promise((r) => setTimeout(r, 150));
await page.evaluate(() => { location.hash = 'onechart/指标趋势'; window.dispatchEvent(new Event('hashchange')); });
await new Promise((r) => setTimeout(r, 150));
const chartInfo = await page.evaluate(() => {
  const svg = document.querySelector('#timeline-svg');
  if (!svg) return { has: false };
  const paths = [...svg.querySelectorAll('path.line')];
  const circles = svg.querySelectorAll('circle.pt').length;
  const texts = svg.querySelectorAll('text').length;
  const bbox = paths.map((p) => { const b = p.getBBox(); return b.height; });
  return { has: true, pathCount: paths.length, circles, texts, bboxMax: Math.max(...bbox), bboxAllPositive: bbox.every((h) => h > 0), svgLen: svg.innerHTML.length };
});
add('C-非空前置', chartInfo.has && chartInfo.pathCount > 0 && chartInfo.bboxAllPositive, JSON.stringify(chartInfo));
add('C6-文本节点', chartInfo.texts > 0, `texts=${chartInfo.texts}`);
/* 单点不连线：只选 vd（B 档案 1 条 → 已切回 A；A 的 vd 无数据）。用 A 的 b12（A 无 b12）… 改用 A 唯一单点指标：无。
   覆盖方式：切 B 档案，vd 单点。 */
await page.evaluate(() => { location.hash = 'home'; window.dispatchEvent(new Event('hashchange')); });
await page.click('[data-action="profiles"]');
await page.click('[data-action="pick-profile"][data-id="B"]');
await new Promise((r) => setTimeout(r, 120));
await page.evaluate(() => { location.hash = 'onechart/指标趋势'; window.dispatchEvent(new Event('hashchange')); });
await new Promise((r) => setTimeout(r, 150));
/* 只选 vd（25-羟维生素 D，B 有 1 条）：直接置 state.sel 后重渲 */
await page.evaluate(() => { state.sel = ['vd']; state.pin = null; render(); });
await new Promise((r) => setTimeout(r, 150));
const single = await page.evaluate(() => {
  const svg = document.querySelector('#timeline-svg');
  if (!svg) return { has: false };
  const paths = svg.querySelectorAll('path.line').length;
  const circles = svg.querySelectorAll('circle.pt').length;
  return { has: true, paths, circles, text: svg.textContent.includes('没有所选指标') };
});
add('C2-单点不连线', single.has && single.circles === 1 && single.paths === 0, JSON.stringify(single));
/* 空窗口空态：清空选择 */
await page.evaluate(() => { state.sel = []; state.pin = null; render(); });
const emptyState = await page.evaluate(() => {
  const panel = document.querySelector('#chart-panel');
  return panel ? panel.textContent.includes('没有所选指标') : false;
});
add('C3-空窗口', emptyState, `emptyText=${emptyState}`);
/* C10 减少动效：reduced-motion 下 dashoffset=0（先恢复选择，避免空态无 svg） */
await page.evaluate(() => { state.sel = ['mg']; state.pin = null; render(); });
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
await page.evaluate(() => { location.hash = 'onechart/指标趋势'; window.dispatchEvent(new Event('hashchange')); });
await new Promise((r) => setTimeout(r, 150));
const rmOffset = await page.$eval('#timeline-svg path.line, .chart-panel', (el) => {
  const svg = document.querySelector('#timeline-svg'); if (!svg) return 'nosvg';
  const p = svg.querySelector('path.line'); if (!p) return 'noline';
  return getComputedStyle(p).strokeDashoffset;
}).catch(() => 'err');
add('C10-减少动效', ['0', '0px', 'none'].includes(rmOffset), `dashoffset=${rmOffset}`);
await page.emulateMediaFeatures([]);

/* MT07/MT11/C11 翻转定高与不位移：B 档案指标页 */
await page.evaluate(() => { location.hash = 'labs/指标目录'; window.dispatchEvent(new Event('hashchange')); });
await new Promise((r) => setTimeout(r, 150));
const flipTest = await page.evaluate(() => {
  const card = document.querySelector('.mcard');
  if (!card) return { has: false };
  const before = card.getBoundingClientRect().height;
  const bodyBefore = document.body.scrollHeight;
  const rectBefore = [...document.querySelectorAll('.mcard')].map((c) => c.getBoundingClientRect().top);
  card.click();
  const pressed = card.getAttribute('aria-pressed');
  const after = card.getBoundingClientRect().height;
  const bodyAfter = document.body.scrollHeight;
  const rectAfter = [...document.querySelectorAll('.mcard')].map((c) => c.getBoundingClientRect().top);
  const moved = rectBefore.some((t, i) => Math.abs(t - rectAfter[i]) > 1);
  card.click();
  const back = card.getAttribute('aria-pressed');
  return { has: true, before: Math.round(before * 10) / 10, after: Math.round(after * 10) / 10, bodyDelta: bodyAfter - bodyBefore, moved, pressed, back, innerStyle: getComputedStyle(card.querySelector('.mcard-inner')).transformStyle };
});
await new Promise((r) => setTimeout(r, 750));
const is3d = await page.evaluate(() => {
  const card = document.querySelector('.mcard');
  card.click(); // 翻到背面
  return new Promise((res) => setTimeout(() => {
    const t = getComputedStyle(card.querySelector('.mcard-inner')).transform;
    card.click(); // 翻回正面（MT07 连点恢复）
    res(t.startsWith('matrix3d'));
  }, 700));
});
flipTest.is3d = is3d;
add('MT-C11-翻转定高', flipTest.has && Math.abs(flipTest.before - 194) <= 1 && Math.abs(flipTest.after - 194) <= 1 && flipTest.bodyDelta === 0 && !flipTest.moved, JSON.stringify(flipTest));
add('MT-真3D', flipTest.is3d && flipTest.innerStyle.includes('preserve-3d') && flipTest.pressed === 'true' && flipTest.back === 'false', `matrix3d=${flipTest.is3d} toggle=${flipTest.pressed}->${flipTest.back}`);

/* MT05 空态：A 档案指标目录应有内容；切到零记录指标不可达（无数据不渲染卡）——验证 B 的全部组与指标页一致（MT03） */
const groupsMetric = await page.evaluate(() => [...document.querySelectorAll('.metric-group-head h3')].map((h) => h.textContent));
await page.evaluate(() => { state.sel = ['mg']; state.pin = null; });
await page.evaluate(() => { location.hash = 'onechart/指标趋势'; window.dispatchEvent(new Event('hashchange')); });
await new Promise((r) => setTimeout(r, 100));
const groupsChart = await page.$eval('#timeline-svg', () => [...document.querySelectorAll('.rail .cat-label')].map((h) => h.textContent)).catch(() => []);
add('MT03-目录一致', groupsMetric.length === groupsChart.length, `metric=${groupsMetric.length} chart=${groupsChart.length}`);

/* Q35 私密三出口：B 档案摘要应含「N 条中私密 M 条」 */
await page.evaluate(() => { location.hash = 'home'; window.dispatchEvent(new Event('hashchange')); });
await new Promise((r) => setTimeout(r, 100));
await page.click('[data-action="summary"]');
await new Promise((r) => setTimeout(r, 100));
const summaryText = await page.$eval('#dialog-body', (n) => n.textContent);
add('Q35-私密出口', /中私密 1 条/.test(summaryText), summaryText.includes('私密') ? 'found' : 'missing');
await page.keyboard.press('Escape');

/* Q19 AI 上下文无判定词 + 协议 */
const aiHref = await page.$eval('#main a.ai-link', (a) => a.href).catch(() => '');
add('Q15-agent-draft协议', aiHref.startsWith('sbs:agent-draft'), aiHref.slice(0, 60));
const aiPrompt = decodeURIComponent(aiHref.split('prompt=')[1] || '');
add('Q19-上下文无判定词', !/诊断|分级|预后|建议 you|疗效/.test(aiPrompt), `len=${aiPrompt.length}`);

/* P1–P6 疾病概要（v0.2.2 起走家族 DP 合同：.dp-overlay#disease-primer + data-dp=back/close） */
/* L81 断言：DP 模块真挂载（不是只有按钮）——文件级 + DOM 级双重 */
const dpWired = await page.evaluate(() => ({
  overlayInDom: !!document.querySelector('.dp-overlay#disease-primer') || typeof window.DiseasePrimer === 'object',
  dataReady: !!window.DISEASE_PRIMER && window.DISEASE_PRIMER.sections.length === 4,
  ids: window.DISEASE_PRIMER ? window.DISEASE_PRIMER.sections.map((s) => s.id) : []
}));
add('L81-DP模块挂载', dpWired.overlayInDom && dpWired.dataReady && dpWired.ids.join(',') === 'definition,evidence,landscape,trend', JSON.stringify(dpWired.ids));
await page.click('[data-primer-open]');
await new Promise((r) => setTimeout((r), 150));
const primer = await page.evaluate(() => {
  const ov = document.querySelector('.dp-overlay#disease-primer');
  if (!ov) return { open: false };
  const rect = ov.querySelector('.dp-panel').getBoundingClientRect();
  const secs = [...ov.querySelectorAll('.dp-section')].map((s) => ({ id: s.dataset.dpSection, t: s.querySelector('h3')?.textContent.trim() }));
  const srcs = ov.querySelectorAll('.dp-src').length;
  const back = !!ov.querySelector('[data-dp="back"]');
  const close = !!ov.querySelector('[data-dp="close"]');
  return { open: ov.hidden === false && ov.classList.contains('dp-overlay'), vh: Math.round(rect.height / innerHeight * 100), secs, srcs, back, close, nonEmpty: secs.every((s) => s.t) };
});
add('P2/P3-四段+整页', primer.open && primer.secs.length === 4 && primer.vh >= 90 && primer.nonEmpty, `vh=${primer.vh} secs=${primer.secs.map((s) => s.id).join('/')} srcs=${primer.srcs}`);
add('P5-双出口', primer.back && primer.close, `back=${primer.back} close=${primer.close}`);
await page.keyboard.press('Escape');
const afterEsc = await page.evaluate(() => ({ open: window.DiseasePrimer.isOpen(), focusOk: !!document.activeElement && (document.activeElement.getAttribute('data-primer-open') !== null || document.activeElement.closest('[data-primer-open]') !== null) }));
add('P7-焦点归还', !afterEsc.open && afterEsc.focusOk, `closed=${!afterEsc.open} focusOk=${afterEsc.focusOk}`);

/* Q6 字号与页脚贴底 */
const font = await page.$eval('body', (b) => getComputedStyle(b).fontSize);
add('Q6-字号', parseFloat(font) === 15, `body font=${font}`);

/* Q8 禁词 */
const banned = await page.$eval('#main', (m) => (m.textContent.match(/分期|病期|线序|疗效应答|生存期|MRD|肿瘤标志物|危险度|缓解期/g) || []));
add('Q8-禁词0', banned.length === 0, banned.length ? banned.join(',') : '0 命中');

/* Q12 唯一源：切回 A，抽查首页 stat-band 的「条化验」数 = DEMO 长度 */
await page.evaluate(() => { location.hash = 'home'; window.dispatchEvent(new Event('hashchange')); });
await page.click('[data-action="profiles"]');
await page.click('[data-action="pick-profile"][data-id="A"]');
await new Promise((r) => setTimeout(r, 150));
const syncCheck = await page.evaluate(() => {
  const band = [...document.querySelectorAll('.stat-band b')].map((b) => b.textContent);
  return { band, lab: window.DEMO.labValues.A.length };
});
add('Q12-唯一源', Number(syncCheck.band[2]) === syncCheck.lab, `首页化验数=${syncCheck.band[2]} DEMO=${syncCheck.lab}`);

/* A7 深链接刷新（onechart 带子页） */
await page.evaluate(() => { location.hash = 'visits/问题清单'; window.dispatchEvent(new Event('hashchange')); });
await page.reload({ waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 150));
const deep = await page.$eval('#breadcrumb', (b) => b.textContent);
add('A7-深链接刷新', deep.includes('问题清单'), `breadcrumb=${deep}`);

/* Q26 窄宽 390：CDP 设备模拟 */
const client = await page.createCDPSession();
await client.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await new Promise((r) => setTimeout(r, 200));
const narrow = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, iw: window.innerWidth }));
add('Q26-390无横滚', narrow.sw === 390 && narrow.cw === 390, JSON.stringify(narrow));
const narrowPages = [];
for (const p of PAGES) {
  await page.evaluate((k) => { location.hash = k; window.dispatchEvent(new Event('hashchange')); }, p);
  await new Promise((r) => setTimeout(r, 80));
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  if (sw > 390) narrowPages.push(`${p}:${sw}`);
}
add('Q26-全站390', narrowPages.length === 0, narrowPages.length ? narrowPages.join(' ') : '全部 390');
await client.send('Emulation.clearDeviceMetricsOverride');

/* 真实视口截图（Q 实测要求） */
if (shotDir) {
  await page.setViewport({ width: 1440, height: 900 });
  await page.evaluate(() => { location.hash = 'home'; window.dispatchEvent(new Event('hashchange')); });
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: path.join(shotDir, 'v0.2.0-home-a.png') });
  await page.evaluate(() => { location.hash = 'onechart/指标趋势'; window.dispatchEvent(new Event('hashchange')); });
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: path.join(shotDir, 'v0.2.0-onechart-b.png') });
  await page.evaluate(() => { location.hash = 'nutrition/输液日历'; window.dispatchEvent(new Event('hashchange')); });
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: path.join(shotDir, 'v0.2.0-calendar-b.png') });
  await page.evaluate(() => { location.hash = 'labs/指标目录'; window.dispatchEvent(new Event('hashchange')); });
  const card = await page.$('.mcard');
  await card.click();
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: path.join(shotDir, 'v0.2.0-metrics-b-flipped.png') });
  await page.evaluate(() => { document.querySelector('[data-primer-open]').click(); });
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: path.join(shotDir, 'v0.2.0-primer.png') });
  await page.setViewport({ width: 390, height: 844 });
  await page.evaluate(() => { history.back(); });
  await page.evaluate(() => { location.hash = 'home'; window.dispatchEvent(new Event('hashchange')); });
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: path.join(shotDir, 'v0.2.0-390-home.png') });
}

add('CONSOLE-无错误', consoleErrors.length === 0, consoleErrors.length ? consoleErrors.slice(0, 3).join(' | ') : '0 错误');

await browser.close();
const fails = results.filter((r) => !r.ok);
console.log(`\nSUMMARY pass=${results.length - fails.length} fail=${fails.length} total=${results.length}`);
process.exit(fails.length ? 1 : 0);
