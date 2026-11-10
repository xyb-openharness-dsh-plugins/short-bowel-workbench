'use strict';
/* 小养宝 NutriPal v0.2.0 — 短肠综合征工作台（开发版页面，public/ 随包发出）。
   与 prototypes/v0.2/app.js（G2 签认的原型基准）的差异全部包在
   "DEV-BRIDGE-BEGIN … DEV-BRIDGE-END" 注释对里（ui-parity 白名单按这对标记登记）：
   1) APP_INFO 版本从 /api/short-bowel/bootstrap 取，拿不到回退 0.2.2 演示态并标注「未连接服务」；
   2) apiBase()/loadBootstrap()/applyData()：iframe 与独立打开（file://）双形态；
   3) sbs:agent-draft 链接：iframe 内 postMessage 给外壳，独立打开保留演示弹窗；
   4) MinerU 六部件：设置 Token UI / settings API / 上传解析 / 状态 / 降级 / 指引；
   5) 启动顺序：先取数据再 render。视图函数与原型逐行一致（不在 DEV-BRIDGE 对里的不许改）。 */

/* DEV-BRIDGE-BEGIN:app-info */
const APP_INFO = { version: '0.2.3', build: '2026-11-08', channel: 'prototype', channelLabel: '交互原型 · 未接入 DSH' };
/* DEV-BRIDGE-END:app-info */

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let uidSeq = 0;
const uid = (p) => p + (++uidSeq);
const NA = '<span class="pill grey">未知</span>';

const icons = {
  home: 'M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9',
  folder: 'M3 7h7l2 2h9v12H3ZM3 7V4h7l2 3',
  chart: 'M4 3v17h17M7 14l4-5 4 3 5-7',
  drop: 'M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11Z',
  lab: 'M9 3h6M10 3v6l-5 9a3 3 0 0 0 3 4h8a3 3 0 0 0 3-4l-5-9V3',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6Z',
  heart: 'M20 5c-3-3-6-1-8 1-2-2-5-4-8-1-5 5 8 15 8 15s13-10 8-15Z',
  calendar: 'M4 5h16v16H4ZM8 3v4m8-4v4M4 10h16',
  bookmark: 'M6 3h12v19l-6-4-6 4Z'
};
const icon = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="18" height="18"><path d="${icons[k]}"/></svg>`;

const PAGES = [
  ['home', '看板', 'home'], ['archive', '术后与档案', 'folder'], ['nutrition', '营养支持', 'drop'],
  ['labs', '化验随访', 'lab'], ['onechart', '病情一图秀', 'chart'], ['complications', '导管与并发症', 'shield'],
  ['life', '生活与心理', 'heart'], ['visits', '复诊准备', 'calendar'], ['resources', '资源与医保', 'bookmark']
];
const SUBPAGES = {
  home: ['概览', '最近变化'],
  archive: ['手术事实', '出院小结', '档案汇总'],
  nutrition: ['输液日历', '按次登记', '方案版本', '出入量'],
  labs: ['报告列表', '核对', '指标目录'],
  onechart: ['指标趋势', '事件泳道'],
  complications: ['导管档案', '事件时间线', '筛查节奏'],
  life: ['生活影响', '当下感受', '支持资源'],
  visits: ['问题清单', '最近报告', '就诊记录'],
  resources: ['资源目录']
};
const SUBTITLES = {
  home: '把眼前的记录补齐，让复诊时每个数都有出处。',
  archive: '手术事实按医生原文记，更正保留版本，不覆盖。',
  nutrition: '输了多少、输多久，一条条记清楚就行。',
  labs: '不同方法不合并，只和可比的比。',
  onechart: '趋势归趋势，事件归事件，放回同一段时间里。',
  complications: '导管是要盯紧的线；异常表现请直接联系医生。',
  life: '输液节律之外的生活，只记事实，不打分。',
  visits: '带着清单去，带着答案回。',
  resources: '能查什么、去哪找，先从这里开始。'
};

/* ---------------- state ---------------- */
const state = {
  page: 'home', sub: {}, profileId: 'A',
  session: null,
  cfg: { root: null, consent: false, dbStatus: '未接入', dbChecked: '—', tokenMasked: 'sk-····演示' },
  range: 'all', zoom: 100, sel: ['mg', 'alb'],
  toggles: { events: true, keypoints: true },
  pin: null, flipped: new Set(),
  calMonth: '2026-11',
  regDraft: { date: '2026-11-07', ml: '', hours: '', route: 'PICC' },
  privateOpen: {}, query: '', toastTimer: null
};

const DATA = () => window.DEMO;
const prof = () => DATA().profiles[state.profileId];
const infusions = () => DATA().infusions[state.profileId];
const labMetrics = () => DATA().labMetrics;
const labCats = () => DATA().labCats;
const labValues = () => DATA().labValues[state.profileId];
const daily = () => DATA().daily[state.profileId];
const events = () => DATA().events[state.profileId];

/* DEV-BRIDGE-BEGIN:data-bridge */
/* 数据层（开发版）：先向 /api/short-bowel/bootstrap 要真数据，拿不到才用 window.DEMO 演示态。
 *
 * 双形态契约（docs/02-DSH-CONTRACT「交界守卫、双形态回归、禁裸 throw」）：
 * - iframe 内（挂在宿主或 dev-server 的 /api/short-bowel/ui/）：fetch `${apiBase()}/api/short-bowel/bootstrap`；
 * - 独立打开（file://）：所有 fetch 走演示态分支（本地 DEMO 数据），不假装有服务；
 * - 接口失败：catch 成状态提示并降级演示态，**禁止裸 throw**——任何异常都不能让整页白屏。
 *
 * applyData 把 bootstrap 输出写回 window.DEMO 的同形键上：视图函数全部读 DATA()，
 * 所以两边共用同一套渲染代码（parity 要求），这里只改"数据从哪来"，不改任何视图函数。 */
let DATA_SOURCE = 'pending';   // 'api' | 'demo' | 'empty'

function apiBase() {
  /* 独立打开（file://）没有服务：直接回空串，调用方按 DATA_SOURCE 决定是否 fetch。 */
  if (location.protocol === 'file:') return '';
  /* 页面在 `<前缀>/api/short-bowel/ui/index.html`，接口在 `<前缀>/api/short-bowel/…`。
     所以这里要**把 `/api/short-bowel` 去掉**，只留挂载前缀（独立启动与 Desktop 都是空串）。
     踩过的坑：这里返回 `/api/short-bowel`，调用处再拼 `/api/short-bowel/xxx` →
     `/api/short-bowel/api/short-bowel/bootstrap` 404，页面静默回退演示数据，看着"有数据"其实没连上库。 */
  const m = location.pathname.match(/^(.*)\/ui(?:\/|$)/);
  const base = m ? m[1] : '';
  return base.replace(/\/api\/short-bowel$/, '');
}

function applyData(data) {
  if (!data) return;
  /* 库为空时不拿空对象盖掉演示数据：接口通了但档案为空 → 保留演示态并如实标注（init 里）。 */
  const nonEmpty = (v) => Array.isArray(v) ? v.length > 0 : (v && typeof v === 'object' && Object.keys(v).length > 0);
  const KEYS = ['profiles', 'surgeryFacts', 'pnRegimens', 'infusions', 'daily', 'labMetrics',
    'labCats', 'labValues', 'events', 'screenings', 'catheters', 'life', 'questions',
    'docs', 'candidates'];
  for (const k of KEYS) {
    if (nonEmpty(data[k])) window.DEMO[k] = data[k];
  }
  if (Array.isArray(data.resources) && data.resources.length) window.DEMO.resources = data.resources;
  if (data.primer) window.DEMO.primer = data.primer;
}

/** 拉真数据。返回 {reachable, data}：
 *  reachable=false 才允许回退演示数据；**接口通了但库是空的**必须显示空态，
 *  不能拿演示档案把空工作区填满（那会让用户以为数据被写进来了）。 */
async function loadBootstrap() {
  if (location.protocol === 'file:') return { reachable: false, data: null, offline: true };
  try {
    const res = await fetch(`${apiBase()}/api/short-bowel/bootstrap`, { headers: { accept: 'application/json' } });
    if (!res.ok) return { reachable: false, data: null, offline: false };
    const data = await res.json();
    return { reachable: true, data: data && data.profiles ? data : null, offline: false };
  } catch { return { reachable: false, data: null, offline: false }; }
}
/* DEV-BRIDGE-END:data-bridge */

/* 私密三出口共用过滤（Q35/Q36）：看板摘要、复诊摘要导出、AI 上下文都走这里；统一返回 {kept, note} */
const privateCount = (items) => items.filter((x) => x.visibility === 'private').length;
const filterPrivate = (items) => {
  const kept = items.filter((x) => x.visibility !== 'private');
  return { kept, note: items.length ? `${items.length} 条中私密 ${privateCount(items)} 条未包含在此出口。` : '' };
};

const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const dayGap = (from, to = todayISO()) => Math.round((Date.parse(`${to}T00:00:00`) - Date.parse(`${from}T00:00:00`)) / 86400000);
const shortDate = (d) => d ? String(d).slice(5).replace('-', '.') : '日期未知';
const longDate = (d) => d ? String(d).replace(/-/g, '.') : '日期未知';
const fmtNum = (v, dec) => v == null ? '—' : (dec === 0 ? String(Math.round(v)) : Number(v).toFixed(dec ?? 1));

/* ---------------- generic UI ---------------- */
const btn = (text, action, cls = '', attr = '') => `<button class="${cls}" data-action="${action}" ${attr}>${text}</button>`;
const go = (text, page, sub = '', cls = '') => btn(text, 'go', cls, `data-page="${page}" data-sub="${esc(sub)}"`);
const pill = (text, cls = '') => `<span class="pill ${cls}">${esc(text)}</span>`;
const aiBtn = (key, prompt) => `<a class="chip ai-link" href="sbs:agent-draft?prompt=${encodeURIComponent(prompt)}" data-ai-key="${key}">和 AI 讨论</a>`;

function toast(t) {
  clearTimeout(state.toastTimer);
  const el = $('#toast'); el.textContent = t; el.classList.add('visible');
  state.toastTimer = setTimeout(() => el.classList.remove('visible'), 3600);
}
function openModal(title, body, foot = '', eyebrow = '小养宝 · 交互演示') {
  $('#dialog-title').textContent = title;
  $('#dialog-eyebrow').textContent = eyebrow;
  $('#dialog-body').innerHTML = body;
  $('#dialog-foot').innerHTML = foot;
  if (!$('#dialog').open) $('#dialog').showModal();
  document.body.style.overflow = 'hidden';
}
const closeModal = () => $('#dialog').close();
$('#dialog').addEventListener('close', () => { document.body.style.overflow = ''; });

function navigate(page, sub) {
  state.page = page;
  if (sub) state.sub[page] = sub;
  state.query = ''; state.pin = null;
  try { history.pushState(null, '', '#' + page + (sub ? '/' + encodeURIComponent(sub) : '')); } catch (e) { /* file:// */ }
  render();
  $('#main').focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: 'instant' });
}
const section = (title, desc = '', action = '') => `<div class="section-title"><div><h2>${title}</h2>${desc ? `<p>${desc}</p>` : ''}</div>${action}</div>`;
const head = (title, desc, action = '') => `<div class="page-head"><div><span class="eyebrow">NUTRIPAL / YOUR CARE COMPANION</span><h1>${title}</h1><p>${desc}</p></div><div class="actions">${action}</div></div>`;
const subnav = () => {
  const items = SUBPAGES[state.page]; if (!items) return '';
  const sel = state.sub[state.page] || items[0];
  return `<nav class="subnav" role="tablist" aria-label="${PAGES.find((p) => p[0] === state.page)[1]}二级页面">${items.map((s) => `<button role="tab" aria-selected="${sel === s}" data-action="sub" data-sub="${esc(s)}">${s}</button>`).join('')}</nav>`;
};

/* ---------------- chart（一图秀：按可比组连线，不同方法不合并） ---------------- */
const CW = 980, CH = 420, CX0 = 62, CX1 = 954, CY0 = 96, CY1 = 300;
const LANE_Y = { rx: 330, comp: 356, visit: 382 };
const LANE_LABEL = { rx: '调药', comp: '并发症', visit: '就诊/检查' };

function dataEnd() {
  const all = [].concat(labValues().map((v) => v.d), infusions().map((v) => v.d), daily().map((v) => v.d).filter(Boolean));
  return all.sort().slice(-1)[0] || todayISO();
}
function domain() {
  const end = Date.parse(dataEnd());
  const months = { '3m': 3, '6m': 6, '12m': 12 }[state.range];
  const allStart = Math.min(...[].concat(labValues().map((v) => Date.parse(v.d) || end), [end]));
  const start = months ? new Date(new Date(end).setMonth(new Date(end).getMonth() - months)).getTime() : allStart;
  const span = end - start;
  const kept = span * state.zoom / 100;
  return [end - kept, end];
}
const inDomain = (d, t0, t1) => { const t = Date.parse(d); return Number.isFinite(t) && t >= t0 && t <= t1; };
const xOf = (t, t0, t1) => CX0 + (t - t0) / Math.max(1, t1 - t0) * (CX1 - CX0);

/* Fritsch–Carlson monotone cubic（家族基线：smoothPath 用单调样条） */
function smoothPath(coords) {
  if (!coords.length) return '';
  if (coords.length === 1) return `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
  const n = coords.length;
  const dx = [], dy = [], m = [];
  for (let i = 0; i < n - 1; i++) { dx.push(coords[i + 1].x - coords[i].x); dy.push(coords[i + 1].y - coords[i].y); m.push(dy[i] / dx[i]); }
  const t = [m[0]];
  for (let i = 1; i < n - 1; i++) t.push(m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2);
  t.push(m[n - 2]);
  for (let i = 0; i < n - 1; i++) if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; }
  let d = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const cx1 = coords[i].x + dx[i] / 3, cy1 = coords[i].y + t[i] * dx[i] / 3;
    const cx2 = coords[i + 1].x - dx[i] / 3, cy2 = coords[i + 1].y - t[i + 1] * dx[i] / 3;
    d += ` C ${cx1.toFixed(1)} ${cy1.toFixed(1)} ${cx2.toFixed(1)} ${cy2.toFixed(1)} ${coords[i + 1].x.toFixed(1)} ${coords[i + 1].y.toFixed(1)}`;
  }
  return d;
}

function seriesFor(code, t0, t1) {
  const m = labMetrics()[code];
  const vals = labValues().filter((v) => v.code === code);
  const all = vals.map((v) => v.v); const lo = Math.min(...all), hi = Math.max(...all);
  const span = hi - lo || Math.max(Math.abs(hi) * 0.08, 0.1);
  /* 关键口径：按 group（指标+方法+机构）分组，不同组各自归一、各自连线、不做差（MT06） */
  const groups = {};
  vals.filter((v) => inDomain(v.d, t0, t1)).sort((a, b) => Date.parse(a.d) - Date.parse(b.d))
    .forEach((v) => { (groups[v.group] = groups[v.group] || []).push(v); });
  return { code, m, lo, hi, span, groups };
}

function monthTicks(t0, t1) {
  const out = []; const d = new Date(t0); let cur = new Date(d.getFullYear(), d.getMonth(), 1);
  if (cur.getTime() < t0) cur.setMonth(cur.getMonth() + 1);
  while (cur.getTime() <= t1) {
    const x = xOf(cur.getTime(), t0, t1);
    if (x > CX0 + 6 && x < CX1 - 6) out.push({ x, label: `${cur.getMonth() + 1}月` });
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
  }
  if (out.length > 7) return out.filter((_, i) => i % 2 === 0);
  return out;
}

function chartSVG(t0, t1) {
  const series = state.sel.map((c) => seriesFor(c, t0, t1));
  const hasData = series.some((s) => Object.keys(s.groups).length);
  if (!hasData) {
    return `<div class="empty"><h3>这个时间窗里没有所选指标</h3><p>扩大时间范围，或在左侧加选一个指标。</p><div class="actions" style="justify-content:center;margin-top:10px">${go('看全部指标 →', 'labs', '指标目录', 'soft')}</div></div>`;
  }
  const yOf = (s, v) => CY1 - (v - s.lo) / s.span * (CY1 - CY0);
  const grid = [0, 1, 2, 3, 4].map((i) => { const y = CY0 + i * (CY1 - CY0) / 4; return `<line class="grid" x1="${CX0}" x2="${CX1}" y1="${y}" y2="${y}"/>`; }).join('');

  let lineSeq = 0;
  const lines = series.map((s) => Object.entries(s.groups).map(([g, pts], gi) => {
    const color = s.m.groups[g] || s.m.color;
    const coords = pts.map((p) => ({ x: xOf(Date.parse(p.d), t0, t1), y: yOf(s, p.v) }));
    const path = pts.length > 1 ? `<path class="line" d="${smoothPath(coords)}" stroke="${color}" pathLength="1"/>` : '';
    const points = coords.map((c, i) => {
      const p = pts[i]; const isLast = i === coords.length - 1;
      const r = isLast ? 5.2 : 4;
      let tag = '';
      if (isLast && state.toggles.keypoints) {
        tag = `<text x="${(c.x - 4).toFixed(1)}" y="${(c.y - 10 - (lineSeq % 3) * 12).toFixed(1)}" text-anchor="end" fill="${color}" font-size="11" font-weight="600">${fmtNum(p.v, s.m.dec)}</text>`;
      }
      return `<circle class="pt${state.pin && state.pin.id === p.id ? ' active' : ''}" data-action="pin" data-id="${p.id}" cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="${r}" fill="${color}"><title>${esc(s.m.name)}（${esc(g)}） ${fmtNum(p.v, s.m.dec)} ${esc(s.m.unit)} · ${longDate(p.d)}</title></circle>${tag}`;
    }).join('');
    lineSeq++;
    return `<g>${path}${points}</g>`;
  }).join('')).join('');

  /* 事件泳道（AML 结构；SBS 语义：调药/并发症/就诊检查；输液日太多不放泳道，日历承载） */
  let lanes = '', laneTags = '';
  if (state.toggles.events) {
    const laneEvs = events().filter((e) => LANE_Y[e.lane] && inDomain(e.d, t0, t1));
    Object.entries(LANE_Y).forEach(([lane, y]) => {
      lanes += `<line class="lane-line" x1="${CX0}" x2="${CX1}" y1="${y}" y2="${y}"/><text class="lane-label" x="8" y="${y + 3}">${LANE_LABEL[lane]}</text>`;
    });
    let lastX = { rx: -999, comp: -999, visit: -999 };
    laneTags = laneEvs.sort((a, b) => Date.parse(a.d) - Date.parse(b.d)).map((e) => {
      const x = xOf(Date.parse(e.d), t0, t1);
      const flip = (x - lastX[e.lane]) < 34;
      const tx = flip ? x + 5 : x;
      const anchor = flip ? 'start' : 'middle';
      lastX[e.lane] = flip ? x + 34 : x;
      const y = LANE_Y[e.lane];
      return `<circle class="lane-dot" data-action="event" data-id="${e.id}" cx="${x.toFixed(1)}" cy="${y}" r="4" fill="#5c4770"><title>${esc(e.kind)} · ${longDate(e.d)}</title></circle><text class="band-label" x="${tx.toFixed(1)}" y="${(y - 8).toFixed(1)}" text-anchor="${anchor}" font-size="9.5" fill="#5c4770">${esc(e.kind)} ${shortDate(e.d)}</text>`;
    }).join('');
  }

  const ticks = monthTicks(t0, t1).map((t) => `<text class="tick" x="${t.x.toFixed(1)}" y="${CY1 + 22}" text-anchor="middle">${t.label}</text>`).join('');

  return `<div class="chart-wrap" id="chart-wrap">
    <svg class="chart" id="timeline-svg" viewBox="0 0 ${CW} ${CH}" role="img"
      aria-label="已选指标趋势与事件泳道；每条线按自身记录范围缩放，不同方法分线不合并">
      ${grid}
      <line class="axis" x1="${CX0}" x2="${CX1}" y1="${CY1}" y2="${CY1}"/>
      ${lines}${lanes}${laneTags}${ticks}
      <text class="tick" x="${CX0}" y="${CH - 4}">↑ 每条线按该指标该可比组全部记录范围缩放；不同方法/机构不合并、不互比</text>
    </svg>
    <div class="chart-tip" id="chart-tip"></div>
  </div>
  <p class="small-note scroll-hint">图表可左右滑动，查看完整时间段</p>`;
}

function pinHTML() {
  if (!state.pin) return `<p class="small-note">点击曲线上的记录点，可查看数值、日期与来源。</p>`;
  const v = labValues().find((x) => x.id === state.pin.id);
  if (!v) return `<p class="small-note">这个记录点已不在当前时间窗内。</p>`;
  const m = labMetrics()[v.code];
  return `<div class="pin"><div><b>${esc(m.name)} ${fmtNum(v.v, m.dec)} ${esc(m.unit)}</b>
    <p>${longDate(v.d)} · 可比组：${esc(v.group)} · 来源：${esc(v.report)}</p>
    <p class="small-note">这是合成示例记录；趋势只用于回顾，不做医学判断。</p></div>
    <div class="actions">${btn('查看原文 ↗', 'source', 'source-link', `data-source="${esc(v.report)}"`)}${btn('收起', 'unpin', 'text-button')}</div></div>`;
}

function legendHTML() {
  const sel = state.sel.map((c) => labMetrics()[c]);
  return `<div class="legend">${sel.map((m) => {
    const vals = labValues().filter((v) => v.code === state.sel.find((c) => labMetrics()[c] === m));
    const g = Object.entries(m.groups).map(([name, color]) => `<span><i style="background:${color}"></i>${esc(name)}</span>`).join('');
    return `<span style="display:block"><b>${esc(m.name)}</b> ${esc(m.unit)} ${g}</span>`;
  }).join('')}</div>`;
}

function chartPanel() {
  const [t0, t1] = domain();
  return `<section class="chart-panel" id="chart-panel">
    <div class="chart-top"><div><h2>趋势与事件</h2>
      <p class="small-note" style="margin-top:2px">${longDate(new Date(t0).toISOString().slice(0, 10))} — ${longDate(new Date(t1).toISOString().slice(0, 10))} · 只呈现合成示例记录</p></div>
      <div class="actions">${pill(`${state.sel.length} 个指标`, 'green')}${aiBtn('onechart', `讨论病情一图秀：当前档案 ${prof().short}，共 ${labValues().length} 条化验记录、${infusions().length} 次输液登记。请基于已记录的事实，帮我准备描述趋势的措辞，不添加医学结论。`)}</div></div>
    ${legendHTML()}
    ${chartSVG(t0, t1)}
    <div id="pin-slot">${pinHTML()}</div>
  </section>`;
}

function rail() {
  const groups = labCats().map(([cat]) => `<div class="cat-label">${esc(cat)}</div>${Object.entries(labMetrics()).filter(([, m]) => m.cat === cat).map(([code, m]) => {
    const vals = labValues().filter((v) => v.code === code);
    const last = vals[vals.length - 1];
    return `<label class="metric-pick"><input type="checkbox" data-metric="${code}" ${state.sel.includes(code) ? 'checked' : ''}><i style="background:${m.color}"></i><span>${esc(m.name)}</span><small>${last ? fmtNum(last.v, m.dec) : '—'}</small></label>`;
  }).join('')}`).join('');
  return `<aside class="rail" aria-label="一图秀筛选项">
    <section><h3>时间范围</h3><div class="chips">
      ${[['3m', '近 3 月'], ['6m', '近 6 月'], ['12m', '近 12 月'], ['all', '全部']].map(([k, l]) => `<button class="chip" data-range="${k}" aria-pressed="${state.range === k}">${l}</button>`).join('')}
    </div></section>
    <section><details class="pick" ${window.innerWidth > 900 ? 'open' : ''}>
      <summary><span>选择指标</span><small>最多 3 个 · 已选 ${state.sel.length}</small></summary>
      <div class="metric-list">${groups}</div>
      <p class="small-note" style="margin-top:6px">共 ${Object.keys(labMetrics()).length} 项 · 点选后图表立即更新</p>
    </details></section>
    <section><h3>显示内容</h3><div class="chips">
      <button class="chip" data-toggle="events" aria-pressed="${state.toggles.events}">事件泳道</button>
      <button class="chip" data-toggle="keypoints" aria-pressed="${state.toggles.keypoints}">关键点数值</button>
    </div>
    <label class="form-label" style="margin-top:14px">缩放</label>
    <div class="zoom"><input type="range" id="zoom" min="40" max="100" step="5" value="${state.zoom}" aria-label="时间窗缩放"><span id="zoom-val">${state.zoom}%</span></div>
    </section>
  </aside>`;
}

/* ---------------- metric cards（真 3D 翻转，定高 194） ---------------- */
function sparkline(pts, color, dec) {
  const w = 220, h = 62, pad = 7;
  const vals = pts.map((p) => p.v); const lo = Math.min(...vals), hi = Math.max(...vals);
  const span = hi - lo || Math.max(Math.abs(hi) * .08, .1);
  const coords = pts.map((p, i) => ({ x: pad + i * (w - pad * 2) / Math.max(pts.length - 1, 1), y: h - 12 - (p.v - lo) / span * (h - 24) }));
  const path = pts.length > 1 ? smoothPath(coords) : '';
  const last = coords[coords.length - 1];
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" role="img" aria-label="最近 ${pts.length} 次记录折线">
    <line class="base" x1="${pad}" x2="${w - pad}" y1="${h - 12}" y2="${h - 12}"/>
    ${path ? `<path class="sp-line" d="${path}" stroke="${color}" pathLength="1"/>` : ''}
    ${coords.map((c, i) => `<circle class="sp-dot" cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="${i === coords.length - 1 ? 3.6 : 2.6}" fill="${color}" style="animation-delay:${i * 45}ms"/>`).join('')}
    <text x="${Math.min(last.x, w - 24)}" y="${Math.max(last.y - 8, 10)}" text-anchor="middle" font-size="9.5" fill="${color}" font-weight="600">${fmtNum(pts[pts.length - 1].v, dec)}</text>
  </svg>`;
}

function metricCard(code) {
  const m = labMetrics()[code];
  const pts = labValues().filter((v) => v.code === code).sort((a, b) => Date.parse(a.d) - Date.parse(b.d));
  if (!pts.length) return '';
  const last = pts[pts.length - 1], prev = pts[pts.length - 2];
  const flipped = state.flipped.has(code);
  const delta = prev && last.group === prev.group ? last.v - prev.v : null;
  const label = `${m.name}，${fmtNum(last.v, m.dec)} ${m.unit}，${longDate(last.d)}；${flipped ? '点击返回摘要' : `点击翻转查看最近 ${pts.length} 次记录`}`;
  const trend = delta === null
    ? (prev ? '跨可比组不做差' : '首次记录')
    : `较前次 ${delta > 0 ? '↑' : delta < 0 ? '↓' : '→'} <em>${fmtNum(Math.abs(delta), m.dec)} ${esc(m.unit)}</em>`;
  const back = pts.length > 1
    ? `<span class="cat"><i style="background:${m.color}"></i>${esc(m.cat)}</span>
       <span class="name">${esc(m.name)} · 最近 ${pts.length} 次</span>
       ${sparkline(pts, m.color, m.dec)}
       <span class="spark-labels"><span>${longDate(pts[0].d)}</span><span>${longDate(last.d)}</span></span>
       <span class="foot">仅回顾合成示例 · 不同方法不合并 · 点击返回</span>`
    : `<span class="cat"><i style="background:${m.color}"></i>${esc(m.cat)}</span>
       <span class="name">${esc(m.name)}</span>
       <span class="na">只有 1 次记录，暂不连线。<br>再记录一次后显示趋势。</span>
       <span class="foot">${longDate(last.d)} · 点击返回</span>`;
  return `<button class="mcard" data-action="flip" data-code="${code}" aria-pressed="${flipped}" aria-label="${esc(label)}">
    <span class="mcard-inner">
      <span class="mface front" aria-hidden="true">
        <span class="cat"><i style="background:${m.color}"></i>${esc(m.cat)}</span>
        <span class="name">${esc(m.name)}<small style="margin-left:6px">${esc(last.group || '')}</small></span>
        <span class="val">${fmtNum(last.v, m.dec)}<small>${esc(m.unit)}</small></span>
        <span class="delta">${trend}</span>
        <span class="rec">共 ${pts.length} 次记录${pts.length > 1 ? ' · 点击翻转看趋势' : ''}</span>
        <span class="meta"><span>${longDate(last.d)} · ${esc(last.report)}</span><span class="hint">翻转 ↗</span></span>
      </span>
      <span class="mface back" aria-hidden="true">${back}</span>
    </span></button>`;
}

function metricGroups() {
  return labCats().map(([cat]) => {
    const codes = Object.keys(labMetrics()).filter((c) => labMetrics()[c].cat === cat && labValues().some((v) => v.code === c));
    if (!codes.length) return '';
    return `<div class="metric-group"><div class="metric-group-head"><h3>${esc(cat)}</h3><span>${codes.length} 项</span></div>
      <div class="metric-grid">${codes.map(metricCard).join('')}</div></div>`;
  }).join('');
}

/* ---------------- 输液日历 ---------------- */
function calGrid() {
  const [y, m] = state.calMonth.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const days = new Date(y, m, 0).getDate();
  const lead = (first.getDay() + 6) % 7; // 周一起
  const byDate = {};
  infusions().forEach((v) => { byDate[v.d] = v; });
  const dailyByDate = {};
  daily().forEach((v) => { if (v.d) dailyByDate[v.d] = v; });
  let cells = ['一', '二', '三', '四', '五', '六', '日'].map((w) => `<div class="wd">${w}</div>`).join('');
  for (let i = 0; i < lead; i++) cells += `<div class="day off"></div>`;
  for (let d = 1; d <= days; d++) {
    const ds = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const inf = byDate[ds];
    const isToday = ds === todayISO();
    cells += `<div class="day" ${isToday ? 'style="border-color:var(--green-deep)"' : ''}><span class="n">${d}</span>${
      inf ? `<span class="tag on">${inf.ml != null ? inf.ml + 'ml' : '量未记'} · ${inf.hours != null ? inf.hours + 'h' : ''}</span>` : ''
    }${dailyByDate[ds] && dailyByDate[ds].weight_kg != null ? `<div style="margin-top:3px;font-size:10px;color:var(--muted)">${dailyByDate[ds].weight_kg}kg</div>` : ''}</div>`;
  }
  const monthCount = infusions().filter((v) => v.d && v.d.startsWith(state.calMonth)).length;
  return `<div class="card">
    <div class="card-head"><div><h3>${y} 年 ${m} 月</h3><p>本月输液 ${monthCount} 天 · 打点来自按次登记（唯一源）</p></div>
      <div class="actions">${btn('←', 'cal-prev', 'soft', 'aria-label="上一个月"')}${btn('→', 'cal-next', 'soft', 'aria-label="下一个月"')}</div></div>
    <div class="cal" id="cal-grid">${cells}</div>
    <div class="cal-legend"><span><i style="background:#e2f2e9"></i>输液日（登记量）</span><span><i style="background:#fff;border:1px solid var(--line)"></i>非输液日</span><span>体重行来自出入量记录</span></div>
  </div>`;
}

/* ---------------- 术后状态卡（非肿瘤：术后第 N 天 / 距手术 N 天） ---------------- */
function stageCard(p) {
  const gap = dayGap(p.anchor);
  const eyebrow = `术后状态卡 · 距手术 ${gap} 天`;
  return `<section class="card stage-card" aria-label="术后状态卡：${esc(p.tag)}">
    <span class="eyebrow">${eyebrow}</span>
    <div class="stage-day"><b>术后第 ${gap} 天</b><small>锚点 ${longDate(p.anchor)}（${esc(p.anchorLabel)} = 第 0 天）· 由档案日期算出，不手填</small></div>
    <div class="stage-now">
      <span>${pill(p.stageState.split('·')[0].trim(), 'green')}<span class="stage-state">${esc(p.stageState)}</span></span>
      <span>${esc(p.unknownExample)}</span>
    </div>
    <div class="stage-actions">
      ${go('看输液日历 →', 'nutrition', '输液日历', 'primary')}
      ${'<button class="soft" data-primer-open aria-label="疾病概要：短肠综合征是什么？定义、医学资料与指南情况、治疗全景、发展趋势">疾病概要：短肠综合征是什么？</button>'}
    </div>
  </section>`;
}

/* ---------------- pages ---------------- */
function pageHome() {
  const p = prof();
  const infs = infusions();
  const days30 = infs.filter((v) => v.d >= new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10)).length;
  const lastInf = infs.slice(-1)[0];
  const dl = daily().filter((v) => v.weight_kg != null);
  const lastW = dl.slice(-1)[0];
  const lifeItems = DATA().life[state.profileId];
  const priv = privateCount(lifeItems);
  return `${head('今天，先把眼前的记录补齐。', SUBTITLES.home, btn(`<b>${esc(p.short)}</b> · 术后第 ${dayGap(p.anchor)} 天`, 'profiles', 'stage-chip'))}
  ${subnav()}${stageCard(p)}
  ${p.full ? '' : `<div class="notice warn">当前档案：<b>${esc(p.tag)}</b>。该画像演示「记录少 + 未知值」的空态与降级；切换到档案 B 可看长期随访的完整形态。全部数据为合成示例。</div>`}
  <div class="alert-strip">
    <div><b>${lastInf ? `最近输液 ${longDate(lastInf.d)} · ${lastInf.ml != null ? fmtNum(lastInf.ml, 0) + ' ml' : '量未记'}` : '还没有输液登记'}</b>
      <p>近 30 天输液 ${days30} 天 · 记录仅作回顾，是否调整方案请与医生讨论。</p></div>
    <div class="actions">${go('记一次输液 →', 'nutrition', '按次登记', 'primary')}${go('带去复诊的问题', 'visits', '问题清单', 'soft')}</div>
  </div>
  <div class="grid three" style="margin-bottom:16px">
    <button class="task-entry" data-action="go" data-page="nutrition" data-sub="输液日历"><span class="entry-icon">◷</span><b>今天输不输液</b><span>看日历打点与本月天数</span><span class="arrow">↗</span></button>
    <button class="task-entry" data-action="go" data-page="labs" data-sub="核对"><span class="entry-icon">＋</span><b>化验单来了</b><span>核对候选后入档，${DATA().candidates[state.profileId].length} 条待核对</span><span class="arrow">↗</span></button>
    <button class="task-entry" data-action="go" data-page="complications" data-sub="筛查节奏"><span class="entry-icon">▤</span><b>该查什么了</b><span>${DATA().screenings[state.profileId].length} 项筛查节奏</span><span class="arrow">↗</span></button>
  </div>
  <div class="dashboard-grid">
    <div>
      ${section('最近的变化', '同一份记录，同时出现在一图秀、指标卡和复诊准备里。', go('打开一图秀 ↗', 'onechart', '', 'text-button'))}
      <section class="card">
        <div class="card-head"><div><h3>体重</h3><p>${dl.length} 次记录 · 与出入量同源</p></div>${pill('营养状态', 'green')}</div>
        ${dl.length ? miniWeightChart() : `<div class="empty"><h3>还没有体重记录</h3><p>记一次就够开始。</p>${go('记一次体重 →', 'nutrition', '出入量', 'primary')}</div>`}
        ${lastW ? `<div class="stat-band"><span><b>${fmtNum(lastW.weight_kg, 1)}</b>kg 最新</span><span><b>${dl.length}</b>次记录</span><span><b>${labValues().length}</b>条化验</span></div>` : ''}
      </section>
      <div class="grid two" style="margin-top:14px">
        <section class="card"><div class="card-head"><h3>导管提醒</h3>${pill('登记不判定', 'grey')}</div>
          <p style="font-size:12.5px">${(DATA().catheters[state.profileId] || []).map((c) => `${esc(c.type)} · 置于 ${longDate(c.placed)} · ${esc(c.status)}`).join('<br>') || '未登记导管'}</p>
          ${go('导管与并发症 →', 'complications', '导管档案', 'text-button')}
        </section>
        <section class="card"><div class="card-head"><h3>生活与心理</h3>${pill(`${lifeItems.length} 条中私密 ${privateCount(lifeItems)} 条`, 'grey')}</div>
          <p style="font-size:12.5px">${(() => { const shared = filterPrivate(lifeItems).kept; return shared.length ? `最近一条（可共享）：${esc(shared[0].text.slice(0, 26))}…` : (lifeItems.length ? '现有记录都是私密，不出现在任何出口。' : '还没有记录。只写事实，不需要整理好情绪。'); })()}</p>
          ${go('记一条 →', 'life', '生活影响', 'text-button')}
        </section>
      </div>
    </div>
    <div>
      ${section('就诊前，想问的事', `${DATA().questions[state.profileId].filter((q) => q.selected).length} 项已勾选`, go('编辑', 'visits', '问题清单', 'text-button'))}
      <section class="card accent">${DATA().questions[state.profileId].filter((q) => q.selected).slice(0, 2).map((q) => `<div class="row"><div><b>${esc(q.text)}</b><p>${esc(q.source)}</p></div>${q.kind === 'view' ? pill('看法', 'grey') : ''}</div>`).join('')}
        <div class="small-note">标了「看法」的只作信息，不当结论。</div></section>
      <div class="card" style="margin-top:14px">${btn('生成复诊摘要（私密过滤）', 'summary', 'primary', 'style="width:100%"')}</div>
    </div>
  </div>`;
}

function miniWeightChart() {
  const pts = daily().filter((v) => v.weight_kg != null).sort((a, b) => Date.parse(a.d) - Date.parse(b.d));
  const w = 460, h = 108, pad = 10;
  const vals = pts.map((p) => p.weight_kg); const lo = Math.min(...vals) - 0.4, hi = Math.max(...vals) + 0.4;
  const coords = pts.map((p, i) => ({ x: pad + i * (w - pad * 2) / Math.max(pts.length - 1, 1), y: h - 18 - (p.weight_kg - lo) / (hi - lo || 1) * (h - 34) }));
  return `<svg class="mini-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="体重最近 ${pts.length} 次记录折线">
    <line x1="${pad}" x2="${w - pad}" y1="${h - 18}" y2="${h - 18}" stroke="#e2ece4"/>
    <path d="${smoothPath(coords)}" fill="none" stroke="#2f7d6b" stroke-width="2.2" stroke-linecap="round" pathLength="1" class="line"/>
    ${coords.map((c, i) => `<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="${i === coords.length - 1 ? 4.4 : 3}" fill="#2f7d6b" stroke="#fff" stroke-width="1.6" class="sp-dot"/>`).join('')}
    <text x="${coords[coords.length - 1].x - 6}" y="${coords[coords.length - 1].y - 9}" text-anchor="end" font-size="10" fill="#2f7d6b" font-weight="600">${fmtNum(pts[pts.length - 1].weight_kg, 1)}</text>
  </svg>`;
}

function pageArchive() {
  const p = prof();
  const subs = state.sub.archive || '手术事实';
  const facts = DATA().surgeryFacts[state.profileId];
  const latest = facts.slice(-1)[0];
  const factTable = (f) => `<div class="table-wrap"><table><tbody>${Object.entries(f.facts).map(([k, v]) => `<tr><th style="width:9em">${esc(k)}</th><td>${v == null ? NA : esc(v) + (k.endsWith('_cm') ? ' cm' : '')}</td></tr>`).join('')}</tbody></table></div>`;
  let body = '';
  if (subs === '手术事实') {
    body = `${facts.map((f, i) => `<details class="phase-fold" ${i === facts.length - 1 ? 'open' : ''}><summary>版本 ${f.version} · ${longDate(f.d)} · 来源：${esc(f.source)}</summary>
      <div class="fold-body">${factTable(f)}<p class="small-note">医生原话口径；更正 = 新增版本，不改旧记录。</p></div></details>`).join('')}
      <div class="actions" style="margin-top:12px">${btn('＋ 更正/补充一条（新版本）', 'fact-edit', 'primary')}${aiBtn('archive-fact', `讨论术后档案：档案 ${p.short} 共 ${facts.length} 个版本，最新版本 ${latest.version}（${longDate(latest.d)}）。请基于已记录的事实，帮我列出整理手术记录时容易漏记的字段。`)}</div>`;
  } else if (subs === '出院小结') {
    const docs = DATA().docs[state.profileId].filter((d) => d.type === '住院' || d.type === '门诊' || d.type === '手术');
    body = `${docsTable(docs)}<div class="actions" style="margin-top:12px">${btn('导入文档（演示）', 'import-doc', 'soft')}${aiBtn('archive-doc', `讨论出院小结整理：档案 ${p.short} 有 ${docs.length} 份住院/门诊/手术文档，其中 ${docs.filter((d) => d.status === '待核对').length} 份待核对。请基于已记录的事实，帮我准备核对时的注意点清单。`)}</div>`;
  } else {
    const lastInf = infusions().slice(-1)[0];
    const dl = daily().filter((v) => v.weight_kg != null);
    body = `<div class="grid three">
      <div class="stat-tile"><span>手术日锚点</span><b>${longDate(p.anchor)}</b></div>
      <div class="stat-tile"><span>输液登记</span><b>${infusions().length} 次</b></div>
      <div class="stat-tile"><span>化验记录</span><b>${labValues().length} 条</b></div>
      <div class="stat-tile"><span>体重记录</span><b>${dl.length} 次</b></div>
      <div class="stat-tile"><span>最近方案</span><b>${(DATA().pnRegimens[state.profileId].slice(-1)[0] || {}).freq || '未登记'}</b></div>
      <div class="stat-tile"><span>事件</span><b>${events().length} 条</b></div>
    </div>
    <div class="notice plain" style="margin-top:14px">档案汇总只汇总已记录的事实；没有的维度显示为空态，不编数字。${lastInf ? `最近一次输液：${longDate(lastInf.d)}。` : '还没有输液登记。'}</div>
    ${aiBtn('archive-summary', `讨论档案汇总：档案 ${p.short}，术后第 ${dayGap(p.anchor)} 天，共 ${infusions().length} 次输液、${labValues().length} 条化验、${events().length} 条事件。请基于已记录的事实，帮我组织一段事实描述。`)}`;
  }
  return `${head('术后与档案', SUBTITLES.archive)}${subnav()}<div class="page-enter">${body}</div>`;
}

function docsTable(docs) {
  return `<div class="table-wrap" id="docs-table"><table><thead><tr><th>材料名称</th><th>日期</th><th>类型</th><th>整理状态</th><th>操作</th></tr></thead><tbody>
    ${docs.map((d) => `<tr><td><b>${esc(d.name)}</b><br><small>合成示例 · 无真实文件</small></td><td>${longDate(d.date)}</td><td>${esc(d.type)}</td>
      <td>${pill(d.status, d.status === '已核对' ? 'green' : 'yellow')}</td>
      <td>${btn(d.status === '已核对' ? '查看' : '去核对', d.status === '已核对' ? 'source' : 'review-doc', 'source-link', `data-source="${esc(d.name)}" data-id="${d.id}"`)}</td></tr>`).join('')}
  </tbody></table></div>`;
}

function pageNutrition() {
  const p = prof();
  const subs = state.sub.nutrition || '输液日历';
  const infs = infusions();
  let body = '';
  if (subs === '输液日历') {
    body = `${calGrid()}
      <div class="card" style="margin-top:14px"><div class="card-head"><h3>本月输液天数</h3>${pill('唯一源：按次登记', 'green')}</div>
      <div class="stat-band"><span><b>${infs.filter((v) => v.d && v.d.startsWith(state.calMonth)).length}</b>天/月</span><span><b>${infs.length}</b>次总登记</span><span><b>${infs.filter((v) => v.ml == null).length}</b>条量未记</span></div>
      <p class="small-note">日历打点、登记表、一图秀读同一份数据（改一处三处同步）。</p>
      ${aiBtn('nutrition-cal', `讨论输液日历：档案 ${p.short} 本月输液 ${infs.filter((v) => v.d && v.d.startsWith(state.calMonth)).length} 天。请基于已记录的事实，帮我准备描述输液节律的说法。`)}</div>`;
  } else if (subs === '按次登记') {
    const r = state.regDraft;
    body = `<section class="card" id="reg-form-card">
      <div class="card-head"><h3>＋ 录一次输液</h3>${pill('数字键盘', 'grey')}</div>
      <form id="infusion-form">
        <div class="form-grid">
          <label><span class="form-label">日期</span><input name="date" type="date" value="${r.date}" required></label>
          <label><span class="form-label">输液量（ml，可留空）</span><input name="ml" inputmode="decimal" type="number" step="10" min="0" value="${r.ml}" placeholder="如 1900"></label>
          <label><span class="form-label">时长（小时，可留空）</span><input name="hours" inputmode="decimal" type="number" step="0.5" min="0" value="${r.hours}" placeholder="如 10"></label>
          <label><span class="form-label">途径</span><select name="route">${['PICC', 'Port（输液港）', 'CVC', '其他'].map((o) => `<option ${r.route === o ? 'selected' : ''}>${o}</option>`).join('')}</select></label>
        </div>
        <div class="form-actions">
          <button type="submit" class="primary" data-save="continue">保存并继续录</button>
          <button type="submit" class="soft" data-save="close">保存并关闭</button>
          <button type="button" class="text-button" data-action="reg-clear">清空</button>
        </div>
      </form>
      <p class="small-note">三态录入：保存并继续 / 保存并关闭 / 清空。不填量也能保存（缺字段显式为空）。</p>
      ${aiBtn('nutrition-reg', `讨论输液登记：档案 ${p.short} 已有 ${infs.length} 条登记，其中 ${infs.filter((v) => v.ml == null).length} 条量未记。请基于已记录的事实，帮我整理一条补录时的备忘。`)}
    </section>
    <div class="card" style="margin-top:14px"><div class="card-head"><h3>登记表</h3>${pill(`${infs.length} 条`, 'green')}</div>
      <div class="table-wrap"><table><thead><tr><th>日期</th><th>量 (ml)</th><th>时长 (h)</th><th>途径</th><th>来源</th></tr></thead><tbody>
      ${infs.slice().reverse().map((v) => `<tr><td>${longDate(v.d)}</td><td>${v.ml != null ? fmtNum(v.ml, 0) : NA}</td><td>${v.hours != null ? fmtNum(v.hours, 1) : NA}</td><td>${esc(v.route)}</td><td><small>${esc(v.src || '')}</small></td></tr>`).join('') || '<tr><td colspan="5">还没有登记。</td></tr>'}
      </tbody></table></div></div>`;
  } else if (subs === '方案版本') {
    const rgs = DATA().pnRegimens[state.profileId];
    body = `${rgs.map((rg, i) => `<details class="phase-fold" ${i === rgs.length - 1 ? 'open' : ''}><summary>版本 ${rg.version} · ${longDate(rg.d)} · ${esc(rg.source)}</summary>
      <div class="fold-body"><div class="table-wrap"><table><tbody>
      <tr><th style="width:8em">频次</th><td>${esc(rg.freq)}</td></tr>
      <tr><th>时长</th><td>${rg.hours != null ? esc(rg.hours) + ' 小时/次' : NA}</td></tr>
      <tr><th>途径</th><td>${esc(rg.route)}</td></tr>
      <tr><th>液体量</th><td>${rg.volume_ml != null ? fmtNum(rg.volume_ml, 0) + ' ml' : NA}</td></tr>
      <tr><th>热量</th><td>${rg.kcal != null ? fmtNum(rg.kcal, 0) + ' kcal' : NA}${rg.kcal == null ? ' <small>（未知，不猜）</small>' : ''}</td></tr>
      <tr><th>备注</th><td>${esc(rg.note || '—')}</td></tr>
      </tbody></table></div></div></details>`).join('')}
      <div class="notice plain" style="margin-top:12px">方案变化只记录「什么时候改了什么」，不评价好坏；不派生达标率。</div>
      ${aiBtn('nutrition-rg', `讨论营养方案版本：档案 ${p.short} 共 ${rgs.length} 个版本，最新 ${rgs.slice(-1)[0].freq}、${rgs.slice(-1)[0].route}。请基于已记录的事实，帮我准备复诊时描述方案演变的事实清单。`)}`;
  } else {
    const dl = daily().sort((a, b) => (Date.parse(b.d || 0)) - (Date.parse(a.d || 0)));
    body = `<section class="card"><div class="card-head"><h3>＋ 记体重 / 出入量</h3>${pill('数字键盘', 'grey')}</div>
      <form id="daily-form"><div class="form-grid">
        <label><span class="form-label">日期（可留空 = 未知日期）</span><input name="date" type="date" value="${todayISO()}"></label>
        <label><span class="form-label">体重 kg</span><input name="weight" inputmode="decimal" type="number" step="0.1" min="0"></label>
        <label><span class="form-label">尿量 ml</span><input name="urine" inputmode="decimal" type="number" step="50" min="0"></label>
        <label><span class="form-label">大便次数</span><input name="stool" inputmode="numeric" type="number" step="1" min="0"></label>
      </div><div class="form-actions"><button type="submit" class="primary">保存</button></div></form>
      <p class="small-note">日期留空会存为「日期未知」，不猜日期。</p></section>
      <div class="card" style="margin-top:14px"><div class="card-head"><h3>出入量记录</h3>${pill(`${dl.length} 条`, 'green')}</div>
      <div class="table-wrap"><table><thead><tr><th>日期</th><th>体重 kg</th><th>尿量 ml</th><th>大便次数</th><th>来源</th></tr></thead><tbody>
      ${dl.map((v) => `<tr><td>${v.d ? longDate(v.d) : pill('日期未知', 'yellow')}${v.note ? `<br><small>${esc(v.note)}</small>` : ''}</td><td>${v.weight_kg != null ? fmtNum(v.weight_kg, 1) : NA}</td><td>${v.urine_ml != null ? fmtNum(v.urine_ml, 0) : NA}</td><td>${v.stool_times != null ? v.stool_times : NA}</td><td><small>${esc(v.src || '')}</small></td></tr>`).join('') || '<tr><td colspan="5">还没有记录。</td></tr>'}
      </tbody></table></div>
      ${aiBtn('nutrition-daily', `讨论出入量：档案 ${p.short} 共 ${dl.length} 条记录，最近一次体重 ${dl.find((v) => v.weight_kg != null) ? fmtNum(dl.find((v) => v.weight_kg != null).weight_kg, 1) : '未记'} kg。请帮我准备描述出入量记录习惯的说明。`)}
      </div>`;
  }
  return `${head('营养支持', SUBTITLES.nutrition)}${subnav()}<div class="page-enter">${body}</div>`;
}

function pageLabs() {
  const subs = state.sub.labs || '报告列表';
  const docs = DATA().docs[state.profileId].filter((d) => d.type === '检验');
  const cands = DATA().candidates[state.profileId];
  let body = '';
  if (subs === '报告列表') {
    body = `${docsTable(docs)}<div class="actions" style="margin-top:12px">${btn('导入化验单（演示）', 'import-doc', 'primary')}${aiBtn('labs-docs', `讨论化验单管理：档案 ${prof().short} 有 ${docs.length} 份检验文档。请帮我列一份「化验单归档习惯」的备忘。`)}</div>`;
  } else if (subs === '核对') {
    body = `${cands.length ? cands.map((c) => `<div class="saved-item"><b>${esc(c.name)}</b><p>${esc(c.value)}</p><small>来源：${esc(c.source)}</small>
      <div class="actions" style="margin-top:8px">
        ${btn('接受入档', 'accept-candidate', 'primary', `data-id="${c.id}" ${c.status === 'needs_review' ? 'disabled' : ''}`)}
        ${btn('拒收', 'reject-candidate', 'soft', `data-id="${c.id}"`)}
        ${c.status === 'needs_review' ? pill('需人工复核', 'yellow') : pill('候选', 'grey')}
      </div></div>`).join('') : `<div class="empty"><h3>没有待核对的候选</h3><p>导入化验单后会出现在这里，逐项核对后才入档。</p>${go('去导入 →', 'labs', '报告列表', 'primary')}</div>`}
      <div class="notice plain">候选核对前不入图、不入指标卡；拒收零副作用（数据保持不变）。</div>
      ${aiBtn('labs-cand', `讨论化验候选核对：档案 ${prof().short} 有 ${cands.length} 条候选，其中 ${cands.filter((c) => c.status === 'needs_review').length} 条需人工复核。请基于已记录的事实，帮我列核对时的检查清单。`)}`;
  } else {
    const codes = Object.keys(labMetrics()).filter((c) => labValues().some((v) => v.code === c));
    body = codes.length ? metricGroups() : `<div class="empty"><h3>还没有指标</h3><p>先去「报告列表」导入，或手工录入一条。</p>${go('去导入 →', 'labs', '报告列表', 'primary')}</div>`;
    body += `<div class="actions" style="margin-top:12px">${go('打开一图秀 →', 'onechart', '', 'primary')}${aiBtn('labs-cat', `讨论指标目录：档案 ${prof().short} 有 ${codes.length} 项指标、${labValues().length} 条记录。请帮我解释「不同方法不合并」这句口径的含义。`)}</div>`;
  }
  return `${head('化验随访', SUBTITLES.labs)}${subnav()}<div class="page-enter">${body}</div>`;
}

function pageOnechart() {
  const subs = state.sub.onechart || '指标趋势';
  const [t0, t1] = domain();
  let body = '';
  if (subs === '指标趋势') {
    body = `<div class="overview">${rail()}<div class="timeline-main">${chartPanel()}</div></div>`;
  } else {
    body = `<section class="chart-panel">${chartSVG(t0, t1)}<div class="legend" style="border-top:1px solid var(--line);padding-top:9px;margin-top:12px">
      ${Object.entries(LANE_Y).map(([lane, y]) => `<span><i style="background:#5c4770;border-radius:50%"></i>${LANE_LABEL[lane]}</span>`).join('')}
      <span style="color:var(--muted)">输液日的逐日打点在「营养支持 · 输液日历」，不放泳道（避免日级事件挤爆月级轴）。</span></div>
      ${aiBtn('onechart-events', `讨论事件泳道：档案 ${prof().short} 有 ${events().length} 条事件。请基于已记录的事实，帮我整理描述并发症时间线的说法。`)}</section>`;
  }
  return `${head('病情一图秀', SUBTITLES.onechart)}${subnav()}<div class="page-enter">${body}</div>`;
}

function pageComplications() {
  const p = prof();
  const subs = state.sub.complications || '导管档案';
  const cats = DATA().catheters[state.profileId];
  const scs = DATA().screenings[state.profileId];
  let body = '';
  if (subs === '导管档案') {
    body = `${cats.length ? cats.map((c) => `<div class="saved-item"><b>${esc(c.type)}</b><p>置于 ${longDate(c.placed)} · ${esc(c.side)} · ${esc(c.status)}</p><small>${esc(c.note || '')}</small></div>`).join('') : `<div class="empty"><h3>还没有导管登记</h3><p>置管后记一条，方便回查维护与并发症。</p></div>`}
      <div class="notice warn">导管周围红、肿、痛、发热，或冲不通——这些表现请直接联系医生或护理团队；本页只登记，不做医学判断，处理方式请听医生安排。</div>
      ${btn('＋ 登记导管事件', 'cath-event', 'primary')}${aiBtn('comp-cath', `讨论导管档案：档案 ${p.short} 有 ${cats.length} 条导管记录。请帮我列一份「见医生前值得记录的导管观察点」。`)}`;
  } else if (subs === '事件时间线') {
    const evs = events().slice().sort((a, b) => Date.parse(b.d) - Date.parse(a.d));
    body = `<div class="table-wrap"><table><thead><tr><th>日期</th><th>类型</th><th>事件</th><th>来源</th></tr></thead><tbody>
      ${evs.map((e) => `<tr><td>${longDate(e.d)}</td><td>${pill(e.kind, e.lane === 'comp' ? 'red' : 'grey')}</td><td><b>${esc(e.label)}</b></td><td><small>${esc(e.src)}</small></td></tr>`).join('') || '<tr><td colspan="4">还没有事件。</td></tr>'}
      </tbody></table></div><p class="small-note">同一时间线在一图秀泳道里也可见（读同一份数据）。</p>
      ${aiBtn('comp-timeline', `讨论并发症时间线：档案 ${p.short} 有 ${evs.length} 条事件，其中并发症 ${evs.filter((e) => e.lane === 'comp').length} 条。请基于已记录的事实，帮我准备复诊时描述时间线的事实句。`)}`;
  } else {
    body = `${scs.map((s, i) => `<div class="row"><div class="row-main"><div><b>${esc(s.item)}</b><p>上次：${s.last ? longDate(s.last) : '未做过'} · ${esc(s.next_hint)}</p><small>来源：${esc(s.src)}</small></div></div>${pill('节奏由医生定', 'grey')}</div>`).join('')}
      <div class="notice plain">筛查项只做登记与「该问了」的提示；阈值与间隔一律【待核】，以医生安排为准。</div>
      ${aiBtn('comp-screen', `讨论筛查节奏：档案 ${p.short} 有 ${scs.length} 项筛查，其中 ${scs.filter((s) => !s.last).length} 项未做过。请基于已记录的事实，帮我准备复诊时要问的筛查问题。`)}`;
  }
  return `${head('导管与并发症', SUBTITLES.complications)}${subnav()}<div class="page-enter">${body}</div>`;
}

function pageLife() {
  const p = prof();
  const subs = state.sub.life || '生活影响';
  const items = DATA().life[state.profileId];
  let body = '';
  if (subs === '当下感受') {
    body = `<div class="notice plain">这里可以放下感受，不需要整理好情绪再开始；默认私密，不进任何导出与 AI 上下文。</div>
      ${items.length ? items.map((it) => `<div class="saved-item ${it.visibility === 'private' ? 'private' : ''}"><b>${longDate(it.d)} · ${it.owner === 'patient' ? '本人' : '照护者'}</b><p>${esc(it.text)}</p>
        <small>${it.visibility === 'private' ? '私密 · 三出口均不可见' : '共享 · 出现在摘要中'}</small>
        <div class="actions" style="margin-top:8px">${btn(it.visibility === 'private' ? '改为共享' : '改为私密', 'toggle-vis', 'soft', `data-id="${it.id}"`)}</div></div>`).join('')
      : `<div class="empty"><h3>还没有记录</h3><p>写一句今天的状态，只给自己看也行。</p></div>`}
      <form id="life-form" style="margin-top:14px"><label><span class="form-label">写一句（可留到只有自己看）</span>
        <textarea name="text" placeholder="今天……（不要求写完整，也不要求正面）"></textarea></label>
        <div class="form-actions"><label style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="caregiver" style="width:16px;height:16px">这条由照护者代记</label>
        <button type="submit" class="primary">私密保存</button></div></form>
      ${aiBtn('life-feel', `讨论生活与心理：档案 ${p.short} 的生活影响线有 ${items.length} 条记录（私密 ${privateCount(items)} 条不参与讨论）。请基于已记录的事实，帮我想想复诊时怎么开口聊生活影响，只组织措辞。`)}`;
  } else if (subs === '支持资源') {
    body = `<div class="notice plain">先记事实，再找资源；资源页在「资源与医保」，这里放的是「记录 → 沟通」的桥。</div>
      ${go('去资源与医保 →', 'resources', '', 'primary')}${go('回生活影响 →', 'life', '生活影响', 'soft')}`;
  } else {
    const pub = items.filter((it) => it.visibility !== 'private');
    body = `<section class="card"><div class="card-head"><h3>生活影响记录线</h3>${pill(`${items.length} 条中私密 ${privateCount(items)} 条`, items.length ? 'grey' : 'green')}</div>
      ${pub.length ? pub.map((it) => `<div class="row"><div class="row-main"><div><b>${esc(it.text)}</b><p>${longDate(it.d)} · ${it.owner === 'patient' ? '本人' : '照护者'}</p></div></div></div>`).join('')
      : `<div class="empty"><h3>没有可共享的记录</h3><p>${items.length ? '现有记录都是私密。' : '还没有记录。'}只写事实，不打分。</p>${go('记一条 →', 'life', '当下感受', 'primary')}</div>`}
      <p class="small-note">本页只记事实（出行/工作/社交被输液节律影响的具体事件），不做满意度评分。</p>
      ${aiBtn('life-impact', `讨论生活影响：档案 ${p.short} 有 ${pub.length} 条可共享记录（私密 ${privateCount(items)} 条不参与）。请基于已记录的事实，帮我把这些整理成一段向医生描述的话。`)}
      </section>`;
  }
  return `${head('生活与心理', SUBTITLES.life)}${subnav()}<div class="page-enter">${body}</div>`;
}

function pageVisits() {
  const p = prof();
  const subs = state.sub.visits || '问题清单';
  const qs = DATA().questions[state.profileId];
  let body = '';
  if (subs === '问题清单') {
    body = `<div class="card">${qs.length ? qs.map((q) => `<label class="check-row"><input type="checkbox" data-q-select="${q.id}" ${q.selected ? 'checked' : ''}>
      <span><b>${esc(q.text)}</b><br><small>${esc(q.source)}${q.kind === 'view' ? ' · 看法，不当结论' : ''}</small></span></label>`).join('')
      : `<div class="empty"><h3>还没有问题</h3><p>看到疑问随手记一条，复诊时勾选带走。</p></div>`}
      <form id="question-form" style="margin-top:14px"><div class="form-grid"><label class="wide"><span class="form-label">＋ 写一个问题</span>
        <input name="question" placeholder="下次想问什么？"></label></div>
        <div class="form-actions"><button type="submit" class="primary">保存</button></div></form>
      ${aiBtn('visits-q', `讨论复诊问题：档案 ${p.short} 有 ${qs.length} 个问题，勾选 ${qs.filter((q) => q.selected).length} 个。请基于已记录的事实，帮我给这些问题按信息依赖排一个「先问哪个」的顺序。`)}
      </div>`;
  } else if (subs === '最近报告') {
    const docs = DATA().docs[state.profileId];
    body = `${docsTable(docs)}<p class="small-note">同一报告 ID 的修订会合并展示；未知区间明确留空。</p>${go('回问题清单 →', 'visits', '问题清单', 'soft')}`;
  } else {
    const evs = events().filter((e) => e.lane === 'visit' || e.lane === 'check');
    body = `${evs.length ? `<div class="table-wrap"><table><thead><tr><th>日期</th><th>类型</th><th>事件</th><th>来源</th></tr></thead><tbody>${evs.map((e) => `<tr><td>${longDate(e.d)}</td><td>${esc(e.kind)}</td><td>${esc(e.label)}</td><td><small>${esc(e.src)}</small></td></tr>`).join('')}</tbody></table></div>` : `<div class="empty"><h3>还没有就诊记录</h3><p>就诊后在「导管与并发症 · 事件时间线」记录，会自动出现在这里。</p>${go('去记录 →', 'complications', '事件时间线', 'primary')}</div>`}`;
  }
  return `${head('复诊准备', SUBTITLES.visits)}${subnav()}<div class="page-enter">${body}</div>`;
}

function pageResources() {
  return `${head('资源与医保', SUBTITLES.resources)}${subnav()}
  <div class="page-enter">
    <div class="grid three">${DATA().resources.map((r) => `<div class="topic-card"><h3>${esc(r.name)}</h3><p>${esc(r.desc)}</p>
      <div class="actions"><span class="pill grey">${esc(r.kind)}</span>${btn('查看来源 ↗', 'source', 'source-link', `data-source="${esc(r.src)}"`)}</div></div>`).join('')}</div>
    <div class="notice plain" style="margin-top:14px">资源条目全部带来源；未核实的写「演示占位」。正式版按临床台账（M4）核数后逐条替换。</div>
    ${aiBtn('resources', `讨论资源与医保：档案 ${prof().short}。请基于已记录的事实，帮我整理见医生或社工时该问的报销问题清单。`)}
  </div>`;
}

/* ---------------- modals ---------------- */
function settingsModal(tab = 'store') {
  const c = state.cfg;
  const body = tab === 'store'
    ? `<div class="notice plain">下面是示意值。真实版本由宿主目录选择器返回<b>绝对路径</b>，并拒绝主目录、桌面与下载根目录。</div>
      <div class="cfg-block"><span class="form-label">业务资料根目录</span>
      <div class="path-row"><code>${esc(c.root || '未设置')}</code>${btn('更改位置（演示）', 'pick-dir', 'soft')}</div>
      <p class="small-note">患者资料目录须用户明确指定；主目录、桌面、下载根、tmp 一律拒绝。</p></div>`
    : tab === 'parse'
      ? `<div class="choice ${c.consent ? 'on' : ''}"><div class="choice-head"><b>MinerU 解析</b>${pill(c.consent ? '已启用' : '待确认', c.consent ? 'green' : 'yellow')}</div>
        <p class="small-note">扫描件/图片/PDF 送到 MinerU 解析；TXT/MD/CSV 先走本地抽取。可随时关闭。</p>
        <label class="check-row"><input type="checkbox" id="consent" ${c.consent ? 'checked' : ''} data-action="consent"><span>我了解：所选文件会上传到 MinerU 云端解析，只传文件本身。</span></label></div>
        <div class="row" style="margin-top:12px"><div><b>解析模型：pipeline（固定）</b><p>面向病历优先保留来源内容，不做生成式补写。</p></div>${pill('不可切换', 'grey')}</div>
        ${mineruSettingsBlock()}`
      : `<div class="notice plain">临床数据库用于试验与登记信息离线检索；SBS 为非肿瘤，本工作台按线索台账裁剪（不提供匹配指数与判读）。</div>
        <div class="row"><div><b>状态：${esc(c.dbStatus)}</b><p>最后检查：${esc(c.dbChecked)}</p></div>${pill('未接入', 'grey')}</div>`;
  openModal('设置', `<div class="cfg-tabs" role="tablist">${[['store', '工作区'], ['parse', '文档解析'], ['clinic', '临床数据库']].map(([id, l]) => `<button role="tab" aria-selected="${tab === id}" data-settings-tab="${id}">${l}</button>`).join('')}</div><div style="margin-top:16px">${body}</div>`, btn('完成', 'close', 'primary'), '本机设置 · 原型演示');
  /* DEV-BRIDGE: parse 页签打开时读取 Token 状态（演示态在 loadMineruStatus 内降级） */
  if (tab === 'parse') loadMineruStatus();
}

function aboutModal() {
  openModal('关于小养宝', `<div class="about"><div class="about-mark">养</div><div class="about-meta">
    <div class="about-ver"><b>v${esc(APP_INFO.version)}</b><span class="pill grey">${esc(APP_INFO.channelLabel)}</span></div>
    <dl><div><dt>构建日期</dt><dd>${esc(APP_INFO.build)}</dd></div><div><dt>版本来源</dt><dd>仓库根目录 VERSION 文件（唯一来源）</dd></div>
    <div><dt>页面渲染</dt><dd>顶栏、页脚、本弹窗同源，不各自手写</dd></div></dl></div></div>
    <div class="notice plain" style="margin-top:14px">当前是交互原型：所有资料、指标与结论都是合成示例，不读写本机文件，不调用模型，不做医学判断。</div>`,
    btn('关闭', 'close', 'primary'), '小养宝 · NutriPal');
}

function profilesModal() {
  openModal('切换演示档案', `<p class="small-note">两套均为合成示例；切换后整页数据、图表、卡片、日历、导出全部联动，不串档。</p>
    ${Object.values(DATA().profiles).map((p) => `<button class="profile-row ${state.profileId === p.id ? 'on' : ''}" data-action="pick-profile" data-id="${p.id}">
      <div><b>${esc(p.name)}</b><p>${esc(p.meta)}</p></div><span class="profile-caret">${state.profileId === p.id ? '✓' : '切换'}</span></button>`).join('')}`,
    btn('关闭', 'close', 'primary'), '演示档案 · 合成示例');
}

/* 复诊摘要（私密三出口之一） */
function summaryModal() {
  const qs = DATA().questions[state.profileId].filter((q) => q.selected);
  const lifeItems = DATA().life[state.profileId];
  const lifeF = filterPrivate(lifeItems, { withNote: true });
  const dl = daily().filter((v) => v.weight_kg != null);
  const lastInf = infusions().slice(-1)[0];
  const lastW = dl.slice(-1)[0];
  openModal('复诊摘要（预览）', `
    <div class="notice green">导出口：${infusions().length + labValues().length} 条记录中不含私密项；生活记录 ${lifeItems.length} 条中私密 ${privateCount(lifeItems)} 条未包含。${DATA().candidates[state.profileId].length ? `另有 ${DATA().candidates[state.profileId].length} 条候选未核对，不进入摘要。` : ''}</div>
    <div class="saved-item"><b>基本信息</b><p>${esc(prof().name)} · 术后第 ${dayGap(prof().anchor)} 天（锚点 ${longDate(prof().anchor)}）</p></div>
    <div class="saved-item"><b>营养支持</b><p>登记 ${infusions().length} 次，最近：${lastInf ? `${longDate(lastInf.d)}${lastInf.ml != null ? ` · ${fmtNum(lastInf.ml, 0)} ml` : ''}` : '无'}</p><p>当前方案：${(DATA().pnRegimens[state.profileId].slice(-1)[0] || {}).freq || '未登记'}</p></div>
    <div class="saved-item"><b>体重</b><p>${lastW ? `${fmtNum(lastW.weight_kg, 1)} kg（${longDate(lastW.d)}，${dl.length} 次记录）` : '未记录'}</p></div>
    <div class="saved-item"><b>想问的问题（本人勾选）</b><p>${qs.map((q) => '· ' + esc(q.text)).join('<br>') || '未勾选'}</p></div>
    <div class="saved-item"><b>生活影响（可共享）</b><p>${lifeF.kept.length ? lifeF.kept.map((it) => '· ' + esc(it.text)).join('<br>') : '无可共享记录'}</p><small>${lifeF.note}</small></div>
    <div class="notice plain">本摘要只汇总已核对/已勾选的合成示例，不做解读；打印后可直接带给医生。</div>`,
    `${btn('打印', 'print-summary', 'soft')}${btn('关闭', 'close', 'primary')}`, '复诊准备 · 私密过滤已生效');
}

function helpModal() {
  openModal('原型操作说明', `<div class="help-box" style="margin-top:0">
    <b>这是交互原型，不是正式产品。</b>
    <ul style="padding-left:18px;margin:8px 0;line-height:1.8">
      <li>所有数据是合成示例，刷新即重置。</li>
      <li>侧栏切换档案 A/B：A 刚确诊记录少，B 长期随访记录多；切换后整页联动。</li>
      <li>指标卡点击翻面看趋势；一图秀选指标、切时间窗、点事件。</li>
      <li>「和 AI 讨论」按钮携带本页上下文；独立打开时只做演示，不会发送。</li>
      <li>顶栏「?」打开疾病概要（四段，带来源）。</li>
    </ul></div>`, btn('开始使用', 'close', 'primary'), '小养宝 · NutriPal');
}

/* DEV-BRIDGE-BEGIN:mineru */
/* MinerU 六部件（18 号 v2）：① 设置 Token UI（本块）② settings API（loadMineruStatus/mineruPost）
   ③ 上传解析（pickImportFile/uploadToWorkbench）④ 状态展示 ⑤ 演示态降级 ⑥ 申请指引。
   契约：一律走 `${apiBase()}/api/short-bowel/settings|mineru` 前缀；演示态（DATA_SOURCE!=='api'）
   降级为本地提示，不发请求、不假装保存；任何 fetch 都 catch 成状态文案，禁止裸 throw。 */

/** ⑥ 指引 + Token 输入（① 设置 UI）。演示态时整块降级为一句说明（⑤）。 */
function mineruSettingsBlock() {
  if (DATA_SOURCE !== 'api') {
    return `<div class="notice plain" style="margin-top:12px">离线演示：未连接工作台，读不到 Token 状态。连接后可在这里粘贴 MinerU API Token（sk-…），Token 只写本机密钥文件（权限 600），不进患者资料、不进导出、不进提示词。</div>`;
  }
  return `<div class="cfg-block" style="margin-top:12px">
    <div class="token-row"><input id="mineru-token" type="password" autocomplete="new-password" placeholder="粘贴 MinerU API Token（sk-…）" aria-label="MinerU API Token"><button class="primary" data-action="mineru-save">保存</button><button class="soft" data-action="mineru-clear">清除</button></div>
    <p class="small-note" id="mineru-status" role="status">正在读取本机 Token 状态…</p>
    <p class="small-note">Token 只写进本机密钥文件（权限 600），只用于向 MinerU 发起解析请求，不进患者资料、不进导出、不进提示词。没有 Token 可以到 <a href="https://mineru.net/apiManage/token" target="_blank" rel="noopener">MinerU 申请页 ↗</a> 领取；解析结果永远是候选，核对后才入档。</p>
  </div>`;
}

/** Token 状态文案（④）：只显示掩码与来源，原文永不回显。 */
function mineruStatusText(s) {
  if (!s) return '读取 Token 状态失败：本机服务没有返回内容。';
  if (s.error) return `读取失败：${s.error}`;
  if (!s.configured) return '尚未配置 Token：扫描件与照片的自动识别会用不了；TXT / MD / CSV 仍在本机解析。';
  const where = s.source === 'file' ? `已保存于 ${s.file}` : '来自环境变量 MINERU_TOKEN（未写入文件）';
  return `当前生效：${s.masked} · ${where}`;
}

/** ② settings API：GET /api/short-bowel/settings/mineru。 */
function loadMineruStatus() {
  const el = $('#mineru-status');
  if (!el) return;
  if (DATA_SOURCE !== 'api') { el.textContent = '离线演示：未连接工作台，读不到 Token 状态。'; return; }
  fetch(`${apiBase()}/api/short-bowel/settings/mineru`, { headers: { accept: 'application/json' } })
    .then((r) => r.json().then((j) => { if (!r.ok) throw new Error(j.message || j.error || '读取失败'); return j; }))
    .then((s) => { const n = $('#mineru-status'); if (n) n.textContent = mineruStatusText(s); })
    .catch((e) => { const n = $('#mineru-status'); if (n) n.textContent = `读取 Token 状态失败：${e.message}`; });
}

/** ② settings API：POST /api/short-bowel/settings/mineru（保存/清除）。 */
function mineruPost(payload) {
  const el = $('#mineru-status');
  if (DATA_SOURCE !== 'api') { toast('离线演示不能保存 Token'); return; }
  fetch(`${apiBase()}/api/short-bowel/settings/mineru`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload),
  })
    .then((r) => r.json().then((j) => { if (!r.ok) throw new Error(j.message || j.error || '保存失败'); return j; }))
    .then((s) => {
      if (el) el.textContent = mineruStatusText(s);
      const input = $('#mineru-token'); if (input) input.value = '';
      toast(payload.action === 'clear' ? '已清除本机 Token' : 'Token 已保存到本机密钥文件');
    })
    .catch((e) => {
      if (el) el.textContent = `保存失败：${e.message}`;
      toast('Token 保存失败');
    });
}

/** ③ 上传解析：选文件 → POST /api/short-bowel/import?persist=1（写 documents + import_candidates）。
 *  演示态降级为原型原有 toast；解析结果永远是候选，核对后才入档。 */
function pickImportFile() {
  if (DATA_SOURCE !== 'api') { toast('演示：导入会先出候选，核对后才入档（见「核对」页）'); return; }
  let input = $('#import-file-input');
  if (!input) {
    input = document.createElement('input');
    input.id = 'import-file-input';
    input.type = 'file';
    input.accept = '.pdf,.jpg,.jpeg,.png,.txt,.md';
    input.style.display = 'none';
    input.addEventListener('change', () => { const files = Array.from(input.files || []); input.value = ''; uploadToWorkbench(files); });
    document.body.appendChild(input);
  }
  input.click();
}

function uploadToWorkbench(files) {
  if (!files.length) return;
  const f = files[0];
  toast(`正在解析「${f.name}」：原件已入资料目录，解析结果会先进候选…`);
  fetch(`${apiBase()}/api/short-bowel/import?name=${encodeURIComponent(f.name)}&profile=${encodeURIComponent(state.profileId)}&persist=1`, {
    method: 'POST', headers: { 'content-type': 'application/octet-stream' }, body: f,
  })
    .then(async (r) => {
      const j = await r.json().catch(() => null);
      if (!r.ok) throw new Error(j?.message || j?.error || `解析失败（HTTP ${r.status}）`);
      return j;
    })
    .then((j) => {
      const n = j?.record?.candidates ?? j?.candidates?.length ?? 0;
      toast(n ? `解析完成：${n} 条候选已入「化验随访 · 核对」，逐条核对后才入档` : '解析完成：没有解析出候选（原件已保留）');
      if (state.page === 'labs') render();
    })
    .catch((e) => toast(`解析失败：${e?.message ?? e}（原件仍在，可重试）`));
}
/* DEV-BRIDGE-END:mineru */

/* ---------------- paint ---------------- */
function paintVersion() {
  const v = `v${APP_INFO.version}`;
  const chip = $('#ver-chip'); if (chip) chip.textContent = v;
  const foot = $('#app-version'); if (foot) foot.textContent = v;
  const build = $('#app-build'); if (build) build.textContent = APP_INFO.build;
}
function paintReady() {
  const root = state.cfg.root, sess = state.session;
  const store = $('#ready-store'), chat = $('#ready-session');
  store.innerHTML = `<i class="${root ? '' : 'grey'}"></i><span>资料目录</span><b>${root ? '已激活' : '未设置'}</b>`;
  store.setAttribute('aria-label', root ? '资料目录：已激活（演示路径）' : '资料目录：未设置');
  chat.innerHTML = `<i class="${sess ? '' : 'grey'}"></i><span>对话</span><b>${sess ? '进行中' : '未进入激活'}</b>`;
}
function paintProfile() {
  const p = prof();
  $('#profile-name').textContent = p.name;
  $('#profile-meta').textContent = p.meta;
  $('#profile-avatar').textContent = p.avatar;
}
function renderNav() {
  const counts = { home: '', archive: '', nutrition: infusions().length || '', labs: labValues().length || '', onechart: '', complications: DATA().screenings[state.profileId].length || '', life: '', visits: DATA().questions[state.profileId].filter((q) => q.selected).length || '', resources: '' };
  $('#nav').innerHTML = PAGES.map(([key, name, ic]) => `<button class="nav-button" data-action="go" data-page="${key}" aria-current="${state.page === key ? 'page' : 'false'}">${icon(ic)}<span>${name}</span>${counts[key] !== '' ? `<span class="nav-count">${counts[key]}</span>` : ''}</button>`).join('');
}
function render() {
  const PAGES_FN = { home: pageHome, archive: pageArchive, nutrition: pageNutrition, labs: pageLabs, onechart: pageOnechart, complications: pageComplications, life: pageLife, visits: pageVisits, resources: pageResources };
  $('#main').innerHTML = (PAGES_FN[state.page] || pageHome)();
  $('#breadcrumb').textContent = PAGES.find((p) => p[0] === state.page)[1] + (state.sub[state.page] ? ' · ' + state.sub[state.page] : '');
  renderNav(); paintProfile(); paintReady();
  const ai = aiBtn(state.page, `讨论「${PAGES.find((p) => p[0] === state.page)[1]}」页：档案 ${prof().short}。请基于本页已记录的事实帮我组织语言，不添加医学结论。`);
  const h = $('#main .page-head .actions'); if (h && !h.querySelector('.ai-link')) h.insertAdjacentHTML('beforeend', ai);
}

/* ---------------- events ---------------- */
document.addEventListener('click', (event) => {
  const el = event.target.closest('[data-action], [data-range], [data-toggle], [data-metric], [data-settings-tab], [data-q-select], [data-primer-open], a[data-ai-key]');
  if (!el) return;
  const act = el.dataset.action;

  /* DEV-BRIDGE-BEGIN:ai-link */
  /* AI 链接双形态（Q16/Q17）：
     - iframe 内且已连接工作台：preventDefault 后向外壳 postMessage（sbs:agent-draft，只填草稿不发送）；
     - 独立打开（file://）或演示态：保留本地演示弹窗（不会发送）。
     两形态回归 = 两种打开方式都不报错、行为不同且都正确。 */
  if (el.matches('a[data-ai-key]')) {
    event.preventDefault();
    const prompt = new URL(el.href).searchParams.get('prompt') || '';
    const inIframe = window.parent && window.parent !== window;
    if (DATA_SOURCE === 'api' && inIframe) {
      try {
        window.parent.postMessage({ type: 'sbs:agent-draft', prompt, send: true }, window.location.origin);
        toast('已把本页上下文填入 AI 对话草稿，按回车发送');
      } catch (e) {
        toast(`没能把上下文交给 AI 对话：${e?.message ?? e}`);
      }
      return;
    }
    openModal('和 AI 讨论（本地演示）', `<div class="notice warn">当前独立打开原型，<b>未接入 AI，不会发送</b>。正式版中，下面这段上下文会作为草稿填入对话输入框，由你确认后再发送。</div>
      <div class="cfg-block"><code style="white-space:pre-wrap;word-break:break-all">${esc(prompt)}</code></div>
      <p class="small-note">草稿只填不发；上下文已过私密过滤（${esc(prof().short)}：生活记录私密条不参与）。</p>`, btn('关闭', 'close', 'primary'), 'AI 入口 · 演示');
    return;
  }
  /* DEV-BRIDGE-END:ai-link */
  if (el.dataset.primerOpen !== undefined) return; // primer.js 接管
  switch (act) {
    case 'go': navigate(el.dataset.page, el.dataset.sub || ''); break;
    case 'sub': state.sub[state.page] = el.dataset.sub; state.pin = null; render(); break;
    case 'profiles': profilesModal(); break;
    case 'pick-profile': state.profileId = el.dataset.id; state.sel = ['mg', 'alb']; state.flipped.clear(); state.pin = null; closeModal(); navigate('home'); toast(`已切换到 ${prof().name}；整页数据已联动`); break;
    case 'settings': settingsModal('store'); break;
    case 'about': aboutModal(); break;
    case 'help': helpModal(); break;
    case 'close': closeModal(); break;
    case 'start-session': state.cfg.root = prof().root || '/Users/demo/Documents/NutriPal'; state.session = { started: new Date().toLocaleString('zh-CN') }; paintReady(); toast('会话已创建（演示态）；无会话时业务面板本来就可用'); break;
    case 'open-store': case 'pick-dir': toast('演示：真实版本由宿主目录选择器返回绝对路径'); break;
    case 'settings-tab': break;
    case 'summary': summaryModal(); break;
    case 'print-summary': window.print(); break;
    case 'flip': {
      const code = el.dataset.code;
      if (state.flipped.has(code)) state.flipped.delete(code); else state.flipped.add(code);
      el.setAttribute('aria-pressed', String(state.flipped.has(code)));
      break;
    }
    case 'pin': state.pin = { id: el.dataset.id }; const ps = $('#pin-slot'); if (ps) ps.innerHTML = pinHTML(); $$('.pt').forEach((n) => n.classList.toggle('active', n.dataset.id === el.dataset.id)); break;
    case 'unpin': state.pin = null; const ps2 = $('#pin-slot'); if (ps2) ps2.innerHTML = pinHTML(); $$('.pt.active').forEach((n) => n.classList.remove('active')); break;
    case 'event': { const ev = events().find((x) => x.id === el.dataset.id); if (ev) openModal(`事件 · ${longDate(ev.d)}`, `<div class="saved-item"><b>${esc(ev.kind)}：${esc(ev.label)}</b><p>来源：${esc(ev.src)}</p><small>合成示例 · 仅回顾</small></div>`, btn('关闭', 'close', 'primary')); break; }
    case 'source': openModal('来源（演示）', `<div class="notice plain">「${esc(el.dataset.source || '未标注来源')}」<br><br>原型不读写真实文件；正式版将打开原件并标注解析方式。</div>`, btn('关闭', 'close', 'primary')); break;
    case 'import-doc': pickImportFile(); break; /* DEV-BRIDGE: 连接时走真实上传解析，演示态降级 toast */
    case 'mineru-save': { const input = $('#mineru-token'); mineruPost({ token: input ? input.value : '' }); break; }
    case 'mineru-clear': mineruPost({ action: 'clear' }); break;
    case 'review-doc': navigate('labs', '核对'); break;
    case 'accept-candidate': { const c = DATA().candidates[state.profileId].find((x) => x.id === el.dataset.id); if (c && c.status !== 'needs_review') { c.status = 'accepted'; render(); toast('已接受入档（演示）'); } else if (c) toast('需人工复核的候选请先在原件上确认'); break; }
    case 'reject-candidate': { const c2 = DATA().candidates[state.profileId].find((x) => x.id === el.dataset.id); if (c2) { c2.status = 'rejected'; render(); toast('已拒收；数据保持不变（零副作用）'); } break; }
    case 'fact-edit': openModal('更正手术事实（新版本）', `<div class="notice plain">更正 = 新增版本，旧版本保留可查；不会出现「不可恢复」操作。</div>
      <form id="fact-form"><div class="form-grid"><label class="wide"><span class="form-label">要更正的字段</span><select name="field">${['切除范围', '剩余空肠长度_cm', '剩余回肠长度_cm', '回盲瓣', '结肠', '造口'].map((f) => `<option>${f}</option>`).join('')}</select></label>
      <label class="wide"><span class="form-label">医生原话（照抄，不代写）</span><input name="value" placeholder="如：剩余空肠约 120cm"></label></div>
      <div class="form-actions"><button type="submit" class="primary">保存为新版本</button></div></form>`, '', '术后档案 · 版本链'); break;
    case 'cath-event': toast('演示：导管事件在正式版走与并发症时间线同一事实层'); break;
    case 'toggle-vis': { const it = DATA().life[state.profileId].find((x) => x.id === el.dataset.id); if (it) { it.visibility = it.visibility === 'private' ? 'shared' : 'private'; render(); toast(`已改为${it.visibility === 'private' ? '私密（三出口均不可见）' : '共享'}`); } break; }
    case 'reg-clear': state.regDraft = { date: todayISO(), ml: '', hours: '', route: 'PICC' }; render(); break;
    case 'cal-prev': { const [y, m] = state.calMonth.split('-').map(Number); const d = new Date(y, m - 2, 1); state.calMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; render(); break; }
    case 'cal-next': { const [y, m] = state.calMonth.split('-').map(Number); const d = new Date(y, m, 1); state.calMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; render(); break; }
  }
  if (el.dataset.range) { state.range = el.dataset.range; state.pin = null; render(); }
  if (el.dataset.toggle) { state.toggles[el.dataset.toggle] = !state.toggles[el.dataset.toggle]; render(); }
  if (el.dataset.metric !== undefined) {
    const code = el.dataset.metric;
    if (el.checked) { if (state.sel.length >= 3) { el.checked = false; toast('最多同时看 3 个指标；先取消一个再加'); return; } state.sel.push(code); }
    else state.sel = state.sel.filter((c) => c !== code);
    state.pin = null; render();
  }
  if (el.dataset.settingsTab) settingsModal(el.dataset.settingsTab);
});

document.addEventListener('change', (event) => {
  const el = event.target;
  if (el.id === 'consent') { state.cfg.consent = el.checked; settingsModal('parse'); toast(el.checked ? '已启用（演示；不真上传）' : '已关闭，不上传'); }
  if (el.dataset.qSelect) { const q = DATA().questions[state.profileId].find((x) => x.id === el.dataset.qSelect); if (q) q.selected = el.checked; renderNav(); }
});

document.addEventListener('input', (event) => {
  const el = event.target;
  if (el.id === 'zoom') { state.zoom = Number(el.value); const s = $('#zoom-val'); if (s) s.textContent = state.zoom + '%'; const pc = $('#chart-panel'); if (pc) { const [t0, t1] = domain(); pc.outerHTML = chartPanel(); } }
});

document.addEventListener('submit', (event) => {
  const form = event.target; event.preventDefault();
  const data = new FormData(form);
  if (form.id === 'infusion-form') {
    const save = document.activeElement?.dataset?.save || 'continue';
    const item = { id: uid('in-'), d: String(data.get('date')), ml: data.get('ml') ? Number(data.get('ml')) : null, hours: data.get('hours') ? Number(data.get('hours')) : null, route: String(data.get('route')), src: '本人记录（模拟）' };
    infusions().push(item); infusions().sort((a, b) => Date.parse(a.d) - Date.parse(b.d));
    if (save === 'close') { navigate('nutrition', '输液日历'); toast('已保存并回到日历'); } else { render(); toast('已保存；继续录下一条'); }
  } else if (form.id === 'daily-form') {
    daily().push({ id: uid('dr-'), d: data.get('date') || null, weight_kg: data.get('weight') ? Number(data.get('weight')) : null, urine_ml: data.get('urine') ? Number(data.get('urine')) : null, stool_times: data.get('stool') ? Number(data.get('stool')) : null, src: '本人记录（模拟）', note: !data.get('date') ? '日期未知（本人提交）' : '' });
    render(); toast('已保存' + (!data.get('date') ? '（日期未知）' : ''));
  } else if (form.id === 'question-form') {
    const text = String(data.get('question')).trim();
    if (!text) { toast('请写下一个问题'); return; }
    DATA().questions[state.profileId].push({ id: uid('q-'), text, source: '本人添加 · 模拟问题', selected: true, kind: 'fact' });
    render(); toast('已保存到问题清单');
  } else if (form.id === 'life-form') {
    const text = String(data.get('text')).trim();
    if (!text) { toast('写一句话再保存'); return; }
    DATA().life[state.profileId].unshift({ id: uid('li-'), d: todayISO(), owner: data.get('caregiver') ? 'caregiver' : 'patient', text, visibility: 'private' });
    render(); toast('已私密保存，不加入分享与 AI 上下文');
  } else if (form.id === 'fact-form') {
    const facts = DATA().surgeryFacts[state.profileId];
    const latest = facts.slice(-1)[0];
    const nf = { ...latest.facts, [String(data.get('field'))]: String(data.get('value')) || null };
    facts.push({ id: uid('sf-'), version: latest.version + 1, d: todayISO(), source: '本人更正 · 医生原话（模拟）', doctor: '—', facts: nf });
    closeModal(); render(); toast('已保存为新版本；旧版本保留可查');
  }
});

/* chart hover tooltip */
document.addEventListener('pointermove', (event) => {
  const svg = event.target.closest('#timeline-svg');
  const tip = $('#chart-tip');
  if (!svg || !tip) { if (tip) tip.classList.remove('on'); return; }
  const rect = svg.getBoundingClientRect();
  const sx = rect.width / CW, sy = rect.height / CH;
  const px = event.clientX - rect.left, py = event.clientY - rect.top;
  let best = null, bd = 1e9;
  $$('.pt', svg).forEach((c) => {
    const dx = +c.getAttribute('cx') * sx - px, dy = +c.getAttribute('cy') * sy - py, d = dx * dx + dy * dy;
    if (d < bd) { bd = d; best = c; }
  });
  if (!best || bd > 620) { tip.classList.remove('on'); return; }
  const v = labValues().find((x) => x.id === best.dataset.id);
  if (!v) { tip.classList.remove('on'); return; }
  const m = labMetrics()[v.code];
  tip.innerHTML = `<b>${esc(m.name)}</b> ${fmtNum(v.v, m.dec)} ${esc(m.unit)}<br><span style="opacity:.75">${longDate(v.d)} · ${esc(v.group)}</span>`;
  tip.style.left = (+best.getAttribute('cx') * sx) + 'px';
  tip.style.top = (+best.getAttribute('cy') * sy) + 'px';
  tip.classList.add('on');
}, { passive: true });

$('#font-toggle').addEventListener('click', () => {
  const large = document.body.classList.toggle('large');
  $('#font-toggle').setAttribute('aria-pressed', String(large));
  $('#font-toggle').textContent = large ? '标准字 Aa' : '大字 Aa';
});

/* ---------------- boot ---------------- */
function applyHash() {
  const raw = (location.hash || '').replace(/^#/, '');
  if (!raw) return false;
  const parts = raw.split('/');
  const p = decodeURIComponent(parts[0] || '');
  const s = parts[1] ? decodeURIComponent(parts[1]) : '';
  if (!PAGES.some((x) => x[0] === p)) return false;
  state.page = p;
  if (s && (SUBPAGES[p] || []).includes(s)) state.sub[p] = s;
  return true;
}
applyHash();
window.addEventListener('hashchange', () => { if (applyHash()) { render(); window.scrollTo({ top: 0 }); } });
window.addEventListener('popstate', () => { if (applyHash()) render(); });

/* DEV-BRIDGE-BEGIN:boot */
/* 启动顺序：必须先取数据再 render——视图函数全是同步的，数据没到就渲染会拿到空对象、
   整页显示 0 条记录，看起来像"数据丢了"。
   双形态：file:// 独立打开直接走演示态（不假装有服务）；iframe/独立服务先 fetch bootstrap，
   失败 catch 成状态提示并降级演示态（禁裸 throw），页脚标注「未连接服务」。 */
async function init() {
  const { reachable, data, offline } = await loadBootstrap();
  if (reachable && data) {
    const hasProfiles = Object.keys(data.profiles ?? {}).length > 0;
    if (hasProfiles) applyData(data);
    DATA_SOURCE = hasProfiles ? 'api' : 'empty';
    if (data.version) { APP_INFO.version = data.version; APP_INFO.build = data.build || APP_INFO.build; }
    APP_INFO.channel = 'dsh';
    APP_INFO.channelLabel = hasProfiles
      ? '开发版 · 已连接工作台数据'
      : '工作台已连接，资料目录还没有档案 · 暂显示演示数据';
    const note = document.querySelector('.footer .demo-note');
    if (note) note.textContent = hasProfiles
      ? '已连接本机工作台数据 · 只做资料整理，不做医学判断'
      : '已连接服务 · 资料目录为空，暂显示演示数据 · 只做资料整理，不做医学判断';
  } else if (offline) {
    DATA_SOURCE = 'demo';
    APP_INFO.channelLabel = '独立打开 · 演示数据（未连接服务）';
  } else {
    DATA_SOURCE = 'demo';
    APP_INFO.channelLabel = '未连接服务 · 演示数据（0.2.0 回退态）';
    const note = document.querySelector('.footer .demo-note');
    if (note) note.textContent = '未连接服务 · 显示演示数据 · 只做资料整理，不做医学判断';
  }
  const initialHash = location.hash.slice(1);
  if (initialHash) applyHash();
  paintVersion();
  render();
  const chip = $('#ver-chip');
  if (chip) chip.title = APP_INFO.channelLabel;
}
init();
/* DEV-BRIDGE-END:boot */
