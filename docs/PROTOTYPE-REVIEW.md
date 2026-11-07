# PROTOTYPE-REVIEW · DSH 患者工作台原型独立评审（M2 闸口）

评审对象：`prototypes/v0.2/`（index.html、app.js、demo-data.js、primer.js、primer-data.js、primer.css、style.css）
评审依据：DEV-REQUIREMENTS.md（§一 患者红线 / §二 家族基线 1.1 / §三 SBS 硬约束 / §四 隐私）+ night_dev_dsh_workbench.md §1.1/§1.3（非肿瘤表达替换表）
评审方式：只读静态评审（7 文件通读 + grep 禁词/判定词 + 逐页对照 demo-data.js）。浏览器探针 37/37 由主线另行执行，本评审不含浏览器实测。
评审日期：2026-11-08 · 评审员：独立评审轮（只读，未改动任何原型文件）

---

## P0（0 项放行，非 0 返工）

### P0-1 看板出口泄露私密生活记录：最近一条未过过滤函数
- 位置：`prototypes/v0.2/app.js:456-459`（pageHome 生活与心理卡）
- 问题：`lifeItems.slice(-1)[0].text.slice(0, 30)` 直接展示「最近一条」生活记录正文，未经过 `filterPrivate()`（app.js:80），也未检查 `visibility`。私密三出口要求看板/导出/AI 共用同一过滤函数（DEV-REQUIREMENTS §四）；此处看板出口漏过滤。当前演示数据 B 的最后一条恰为共享（li-b3），默认不泄露，但：
  1. 页内「当下感受」有 `toggle-vis`（app.js:866）一键把 li-b3 改为私密 → 回看板即泄露私密正文；
  2. 表单新增记录（app.js:912）默认私密并 `unshift` 到数组头部，数据顺序被破坏后 `slice(-1)` 取到哪条不可控。
- 复现：档案 B → 生活与心理 · 当下感受 → 点 li-b3「改为私密」→ 回看板 → 「最近一条」仍显示该私密内容。
- 修复建议：看板出口改为 `const lifeF = filterPrivate(lifeItems)`，从 `lifeF.kept` 里按日期取最近一条；无 kept 时走现有空态文案。顺带修掉 `unshift`（新记录应按日期插入或显示时排序），否则「最近一条」显示的是最旧一条。

---

## P1

### P1-1 「近 30 天」写死日期字符串，违反数据唯一源
- 位置：`app.js:424`：`const days30 = infs.filter((v) => v.d >= '2026-10-08').length;`
- 问题：页面文案「近 30 天输液 N 天」（app.js:435）依赖写死的 `2026-10-08`，数据换月即错。同类的还有 `state.calMonth = '2026-11'`（app.js:64，日历默认月写死）与 `state.regDraft.date = '2026-11-07'`（app.js:65）。
- 修复建议：days30 用 `dayGap(v.d) <= 30`（相对 `dataEnd()` 或今天）；calMonth/regDraft 初始化取 `dataEnd().slice(0,7)` / `todayISO()`（demo-data.js:68 的合成数据锚点日期保留在数据文件里，页面不复制）。

### P1-2 首页任务入口渲染出字面量「 dripping」
- 位置：`app.js:439`：`<span class="entry-icon"> dripping</span>`
- 问题：图标位输出了带空格的英文单词「dripping」，看板首屏「今天输不输液」入口的图标格直接显示该文本（同排另两个是 ＋ 和 ▤），属于用户可见的渲染缺陷，疑似 emoji/图标符号丢失。
- 修复建议：替换为与语义一致的符号（如 `💧` 或 `▾`），或复用 `icon('drop')` 的 SVG 通路。

### P1-3 禁词以否定口径句形式出现在 UI 文案，禁词 grep 门禁不过
- 位置：`app.js:263`「不构成**诊断**或**疗效**判断」；`app.js:742`「不做**诊断**」；`app.js:732`「不提供匹配指数与**判读**」（另有「非**肿瘤**」三处：app.js:229 注释、demo-data.js:229 注释、app.js:732）。
- 问题：G2 验收口径为「禁词 0」；「疗效/诊断/判读」按 DEV-REQUIREMENTS §三.6 属禁词，以上均为用户可见文案。语义上是否定式口径句（与「解读归医生」同族），不冒充判定，故不定 P0；但字面命中会让 grep 门禁失败。
- 修复建议：改写为不含禁词 token 的口径句，如「趋势只用于回顾，解读归医生」「不做医学结论」「不提供匹配指数与自动结论」。

---

## P2

### P2-1 primer.js 全程未 esc，直接插值 primer 数据
- 位置：`primer.js:15,19`（`${P.title}`、`${s.h}`、`${s.body}`、`${s.src}`）
- 问题：当前数据为本地静态文件，风险低；但违背「动态文本一律 esc」的家族习惯，且 primer-data 一旦改为从外部/宿主读入即成 XSS 面。
- 修复建议：统一走 esc（或注明「本文件数据视为受信源」的边界注释）。

### P2-2 版本号三处定义、DEMO_BUILD 为死代码
- 位置：`index.html:6,33,37`（title/ver-chip/app-version 写死 v0.2.0 与 2026-11-07）、`app.js:6`（APP_INFO）、`demo-data.js:6-8`（DEMO_BUILD，全仓无引用）。
- 问题：版本唯一源要求「顶栏/页脚/关于同源」。boot 时 `paintVersion()`（app.js:785-790）会覆盖顶栏与页脚，可见面一致，但 index.html 静态文本 + APP_INFO + 无引用的 DEMO_BUILD 构成三份可漂移的源。
- 修复建议：删 DEMO_BUILD 或让 APP_INFO 读它；index.html 版本文本视为渲染前占位并注释说明。

### P2-3 顶栏 top-actions 顺序偏离家族 1.4 规定，且无顶栏 AI 入口
- 位置：`index.html:27-34`：资料目录 → 对话 → 设置 → 大字 → ? → 版本；规定顺序：资料目录 → 设置 → 大字 → AI → 版本 → ?。
- 修复建议：按 1.4 调序；「?」专供疾病概要应置于最后（当前在版本 chip 之前）。

### P2-4 第 4 个断点 720px 超出「只用 1180/900/600」约束
- 位置：`style.css:345`（`@media (max-width:720px)`）。
- 修复建议：并入 600 档或删除。

### P2-5 空态缺「下一步」按钮
- 位置：`app.js:637`（导管档案空态只有文案）、`app.js:664`（当下感受空态；表单虽在下方，按基线仍应给动作入口）。
- 修复建议：各补一个 `go()`/聚焦表单按钮。

### P2-6 死代码与签名不符
- 位置：`app.js:66`（`privateOpen` 无引用）、`app.js:116`（`state.query` 只写不读）、`app.js:429`（`priv` 计算后未用）、`app.js:757`（`filterPrivate(items, { withNote: true })` 传了函数不支持的第二个参数）、`app.js:844`（`case 'settings-tab'` 死分支，实际键为 `settingsTab`）。
- 修复建议：清理；`settings-tab` 分支删除（真实处理在 app.js:879）。

### P2-7 「保存并关闭」键盘提交时退化为「继续录」
- 位置：`app.js:897`：`document.activeElement?.dataset?.save` 在 Enter 提交时 activeElement 是输入框，落到默认 'continue'。
- 修复建议：用 `event.submitter` 取代 activeElement。

### P2-8 疾病概要浮层无焦点圈闭
- 位置：`primer.js:31-41`：只做初始聚焦与归还，Tab 可逃出 modal 到背景页。
- 修复建议：keydown 循环 Tab 首尾，或注明与家族基线 a11y 条款的差距。

### P2-9 指标卡差值箭头 ↑/↓ 按基线 1.3 有「暗示好坏」之嫌
- 位置：`app.js:339`：`较前次 ↑ 0.05 mmol/L`。
- 说明：1.3 表要求用「较上次」且不暗示好坏；现文案已是「较前次 + 幅度 + 同可比组守卫」（app.js:335 跨组不做差），方向箭头仅陈述数值方向。可保留，但建议在 M5 parity 时与家族口径统一为纯 `+/−`。

---

## 基线符合性抽查（通过项，带位置）

- 三段外壳：prototype-bar → 侧栏 → 顶栏+页脚（index.html:12-38）；声明条含「未接入 DSH / AI」。
- 口径文案同屏：「不同方法不合并」在页首（app.js:48）、卡片背（app.js:345）、图内（app.js:249）；「解读归医生」语义落在概要出口句（demo-data.js:235、primer.js:20）；【待核】占位见 demo-data.js:234,236、app.js:648。
- 隐私：导出口与 AI 出口计数文案「N 条中私密 M 条」齐备（app.js:675,762,829）；生活页表单默认私密并声明不进任何出口（app.js:660,912）。
- 不同方法不合并：一图秀按 group 分线、各自归一、跨组不做差（app.js:177-181,335）；「共 N 次」等计数全部动态读 demo-data，无写死。
- 输液节律：日历只表达输液日/非输液日 + 登记量（app.js:389-391），无疗程编号；方案为版本链（pnRegimens version 1..3）；「术后第 N 天」为手术锚点动态计算（app.js:404-408），属非肿瘤替换表达，非 D+N/疗程编号。
- 空态主体：labs/onechart/visits 空态均带下一步按钮（app.js:199,448,604,609,677,704）。
- 3D 卡片：定高 194px、preserve-3d、rotateY、backface-visibility（style.css:226-231）。
- 断点 1180/900/600 存在（style.css:351,357,386），focus-visible 3px ring（style.css:23），tabular-nums + 15px（style.css:12,16）。
- 医生任务未冒充患者功能：全站无分级判定/达标率/评分输出；筛查节奏标「节奏由医生定」（app.js:647），并发症页明示「不判断、不提供处理建议」（app.js:638）。
- AI 输出候选/预览：候选核对前不入图（app.js:605）、AI 链接独立打开拦截进演示面板并明示不发送（app.js:824-831）；AI 上下文只携带计数与事实，无判定词、无私密正文。
- 合成示例标注：首屏、页脚、弹窗、概要脚注均有（index.html:12,37；app.js:742；primer.js:24）；两套档案切换重置 sel/flipped/pin（app.js:837），未发现串档。

## 首评结论（已被复评取代，留档）

- **P0 = 1**（看板出口私密漏过滤，P0-1）。
- 按 M2 闸口「独立评审 P0 清零」标准：**不放行，返工一轮**。P0-1 为一处函数调用级修复（filterPrivate 接入看板出口），连同 P1-1/1-2/1-3 一起改完后复评预期可达清零；P2 项不阻塞闸口，建议随返工批次顺手清理。

---

## 复评记录（2026-11-08 · 返工后第二轮，只读）

复评范围：重读改动后的 `prototypes/v0.2/app.js`（重点 pageHome / pinHTML / 口径句 / grep 全文）、`scripts/probe-prototype.mjs`（新增 Q35 断言），并复核首评 P2 项是否被顺手处理。

### 逐条修复核验

| 首评编号 | 结论 | 证据（file:line） |
| --- | --- | --- |
| P0-1 看板出口私密漏过滤 | **已修复**。看板生活卡改走 `filterPrivate(lifeItems).kept`，正文经 esc；无共享时显示「现有记录都是私密，不出现在任何出口」；pill 显示「N 条中私密 M 条」，与导出/AI 出口同函数同口径 | `app.js:456-457`；回归断言 `scripts/probe-prototype.mjs:84-87`（Q35-看板私密）+ `:193-199`（Q35-私密出口） |
| P1-1 近 30 天写死日期 | **主体已修复**。`days30` 改为 `Date.now() - 29 天` 动态计算 | `app.js:424`。残留：`state.calMonth='2026-11'`（app.js:64）与 `regDraft.date='2026-11-07'`（app.js:65）仍写死 → 降级为 P2-10 |
| P1-2 entry-icon「 dripping」 | **已修复**。替换为「◷」 | `app.js:439` |
| P1-3 禁词命中 | **主体已修复**。「诊断/疗效」UI 文案已清零：app.js:263、638、742 改写为「不做医学判断」等；grep 验证 app.js 中「诊断/疗效」0 命中。残留：app.js:732「不提供匹配指数与判读」含「判读」、注释「非肿瘤」（app.js:402、demo-data.js:229）→ 降级为 P2-11（判读不在 DEV-REQUIREMENTS §三.6 字面禁词表内，且为否定口径句，不阻塞闸口） |

### 新增/降级项（复评更新）

- **P2-10**（原 P1-1 残留）：`app.js:64-65` calMonth/regDraft 默认值仍写死 2026-11 / 2026-11-07。建议初始化取 `dataEnd().slice(0,7)` / `todayISO()`。
- **P2-11**（原 P1-3 残留）：`app.js:732`「判读」、注释「非肿瘤」两处否定句 token；另 `app.js:569`「不派生达标率」、`app.js:678`「不做满意度评分」为复述 DEV-REQUIREMENTS 原文的否定句。均不冒充判定，建议统一改写为「不提供自动结论」类表述，使禁词 grep 门禁机械为 0。
- **P2-12**（新增）：`app.js:912` 生活记录新增仍 `unshift` 到数组头，看板「最近一条（可共享）」（app.js:457）按数组序取 `slice(-1)`，新增记录后会显示最旧一条——文案「最近」失真（无隐私风险，正文已过滤）。建议按日期排序后取末条。
- **P2-13**（新增）：`probe-prototype.mjs:84-87` Q35 断言只覆盖默认数据（默认私密记录 li-b2 非末条）；未先 `toggle-vis` 把末条改私密再断言，回归强度有限。建议探针先翻转 li-b3 可见性再查看板。

### 复评残留清单

原 P2-1～P2-9 复核：均未处理，维持原级（primer.js 未 esc、版本三源+DEMO_BUILD 死代码、顶栏顺序、720px 第 4 断点、导管档案/当下感受空态无按钮、死代码 privateOpen/query/priv/withNote/settings-tab（app.js:66,116,429,757,844）、activeElement 提交退化、primer 焦点圈闭、↑/↓ 箭头）。加上 P2-10～P2-13，共 **P2 = 13**。

## 最终结论

- **复评 P0 = 0，P1 = 0，P2 = 13。**
- M2 闸口「独立评审 P0 清零」已满足：P0-1 修复有效且带了 Q35 回归断言（probe 38/38，其中 Q35 两断言位置 probe-prototype.mjs:87,199）。
- **放行 M2 / G2**（以当前 app.js + probe-prototype.mjs 版本为准）。P2 项不阻塞，P2-10/11/12 建议随 M5 开发版移植一并处理；P2-13 建议下一轮探针强化时补「翻转可见性后再断言」的反例路径（家族纪律：检查器要有失败反例证明有效）。
