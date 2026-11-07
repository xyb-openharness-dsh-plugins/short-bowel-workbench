'use strict';
/* primer.js — 疾病概要入口（36 号 v2）。
   顶栏「?」与状态卡副按钮都带 data-primer-open，由这里接管：整页面板（≥90% 视口）、
   四段固定顺序、每段强制来源行、返回/关闭双出口、history 一进一退、Esc 只退一层、焦点归还。 */
(function () {
  const P = window.DISEASE_PRIMER;
  const overlay = document.createElement('div');
  overlay.className = 'primer-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', '疾病概要：' + P.title);
  overlay.innerHTML = `
    <div class="primer-panel">
      <div class="primer-head">
        <div><span class="eyebrow">NUTRIPAL / DISEASE PRIMER</span><h2>${P.title}</h2></div>
        <button class="icon-button" data-primer-close aria-label="关闭疾病概要">×</button>
      </div>
      <div class="primer-body">
        ${P.sections.map((s) => `<h3>${s.h}</h3><p>${s.body}</p><div class="primer-src">${s.src}</div>`).join('')}
        <div class="notice plain" style="margin-top:20px">本概要只做名词与边界解释（第②层），不生成个体判断；出口口径固定：「按受累器官与病情轻重排列」「不代表任何一项适合你」「需要问你的医生」。未取得原件处已注明「据二次来源」。</div>
      </div>
      <div class="primer-foot">
        <button class="soft" data-primer-close aria-label="返回工作台">返回</button>
        <span class="primer-notice">合成示例 · 仅演示 · 未连接宿主</span>
        <button class="primary" data-primer-close aria-label="关闭疾病概要">关闭</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  let lastFocus = null;
  function open() {
    if (overlay.classList.contains('open')) return;
    lastFocus = document.activeElement;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden'; /* A1：背景文档滚不动 */
    try { history.pushState({ primer: true }, '', '#disease-primer'); } catch (e) { /* file:// */ }
    overlay.querySelector('[data-primer-close]').focus();
  }
  function close() {
    if (!overlay.classList.contains('open')) return;
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
  }
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-primer-open]');
    if (t) { e.preventDefault(); open(); return; }
    if (e.target.closest('[data-primer-close]')) { close(); try { history.back(); } catch (err) {} }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) { close(); try { history.back(); } catch (err) {} }
  });
  window.addEventListener('popstate', () => { if (location.hash !== '#disease-primer') close(); });
})();
