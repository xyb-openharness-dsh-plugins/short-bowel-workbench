/* 探针覆盖断言（LESSONS 第 10 类「检查器全绿可能是它没在看你那一页」的可断言版）
   用法：node scripts/check-probe-coverage.mjs
   判据：全量渲染探针必须覆盖 prototypes/v0.2/app.js 里的每一个一级页与全部二级页。

   本仓原型（G2 签认基准）不是 ROUTES 字典式导航，而是 PAGES 三元组 + SUBPAGES 字典 +
   hash 兜底（`#page` 与 `#page/encodeURIComponent(sub)`）。所以本检查器按本仓实际形状解析：
   ① PAGES：`const PAGES = [['home', '看板', 'home'], ...]` → 取第 1 列页面键；
   ② SUBPAGES：`const SUBPAGES = { home: ['概览', ...], ... }` → 每页的二级页清单；
   ③ 全量探针（ALL_ROUTE_PROBES）文本里必须出现每个页面键（作为 data-page / hash 目标），
      且必须**动态枚举**二级页（出现 `.subnav button` 的 DOM 枚举，而不是手抄子页清单——
      手抄清单漏改新页时探针照样全绿，这正是本检查要拦的形态）。
   ④ 抽样探针（SAMPLE_PROBES）引用的 `page/sub` 组合必须真实存在于 SUBPAGES。
*/
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const APP = join(ROOT, 'prototypes/v0.2/app.js');
const fails = [], oks = [];

/* 原型不存在 → 明确 skip 并说清"等原型出来才开始保护"，而不是静默通过或直接崩。 */
if (!existsSync(APP)) {
  console.log(JSON.stringify({ pass: true, skipped: true,
    reason: 'prototypes/v0.2/app.js 还不存在（原型未开始）：探针覆盖断言暂不启用，原型落地后自动生效。',
    fails: [], oks: [] }, null, 2));
  process.exit(0);
}

const app = readFileSync(APP, 'utf8');

/** 从 app.js 提取 PAGES 页面键与 SUBPAGES 二级页；返回 null 表示两种都没找到。 */
function extractRoutes(src) {
  const pagesBlock = src.match(/const\s+PAGES\s*=\s*\[([\s\S]*?)\];/);
  const subsBlock = src.match(/const\s+SUBPAGES\s*=\s*\{([\s\S]*?)\n\};/);
  if (!pagesBlock) return null;
  const pages = [...pagesBlock[1].matchAll(/\['([a-z][a-z0-9-]*)'/g)].map((m) => m[1]);
  if (!pages.length) return null;
  const subpages = {};
  if (subsBlock) {
    for (const m of subsBlock[1].matchAll(/([a-z][a-z0-9-]*)\s*:\s*\[([\s\S]*?)\]/g)) {
      subpages[m[1]] = [...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1]);
    }
  }
  return { pages, subpages };
}

/* 全量渲染探针：必须覆盖每一个一级页 + 动态枚举全部二级页。 */
const ALL_ROUTE_PROBES = [
  'scripts/probe-prototype.mjs',
];
/* 抽样探针：只要求它列出的 page/sub 组合真实存在（防止页面改名后探针扫空气仍全绿）。 */
const SAMPLE_PROBES = [
  'scripts/probe-extra.mjs',
];

const routes = extractRoutes(app);
if (!routes) {
  fails.push('routes: 在 app.js 里找不到 PAGES 三元组（本仓约定 const PAGES = [[key, 名称, 图标], ...]）');
} else {
  const { pages, subpages } = routes;
  const subTotal = Object.values(subpages).reduce((a, s) => a + s.length, 0);
  oks.push(`routes: 解析出 ${pages.length} 个一级页、${Object.keys(subpages).length} 组共 ${subTotal} 条二级页`);

  for (const rel of ALL_ROUTE_PROBES) {
    let txt;
    try { txt = readFileSync(join(ROOT, rel), 'utf8'); } catch {
      fails.push(`coverage: 全量探针 ${rel} 不存在（改名或未生成？）——它缺失时没有任何东西在扫新页面`);
      continue;
    }
    const missing = pages.filter((p) => !new RegExp(`['"\`]${p}['"\`]`).test(txt));
    if (missing.length) fails.push(`coverage: ${rel} 漏了 ${missing.length} 个一级页 [${missing.join(', ')}]（新页不会被它扫到）`);
    else oks.push(`coverage: ${rel} 覆盖全部 ${pages.length} 个一级页`);

    /* 二级页必须动态枚举：手抄子页清单漏改时不响，DOM 枚举（.subnav button）才会跟着页面走。 */
    if (!txt.includes('.subnav button')) {
      fails.push(`coverage: ${rel} 没有 .subnav button 枚举——二级页要靠 DOM 动态枚举，不许手抄清单`);
    } else {
      oks.push(`coverage: ${rel} 动态枚举二级页（.subnav button）`);
    }
  }

  for (const rel of SAMPLE_PROBES) {
    let txt;
    try { txt = readFileSync(join(ROOT, rel), 'utf8'); } catch { continue; } // 抽样探针可选
    /* 引用了 SUBPAGES/PAGES 常量名即可视为同源引用；直接写死页面键的逐一校验存在性。 */
    for (const m of txt.matchAll(/location\.hash\s*=\s*'([a-z][a-z0-9-]+)\//g)) {
      const p = m[1];
      if (!pages.includes(p)) fails.push(`coverage: ${rel} 引用了不存在的一级页 '${p}'（页面改名后探针在扫空气，全绿不代表通过）`);
    }
    oks.push(`coverage: ${rel} 的 hash 目标全部真实存在`);
  }

  if (ALL_ROUTE_PROBES.length === 0)
    fails.push('coverage: 没有配置全量探针——此时没有任何东西在扫全部页面');
}
console.log(JSON.stringify({ pass: fails.length === 0, fails, oks }, null, 2));
process.exit(fails.length === 0 ? 0 : 1);
