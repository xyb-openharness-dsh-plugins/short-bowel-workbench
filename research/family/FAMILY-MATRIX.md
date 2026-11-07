# 家族结构对比矩阵 — SBS 工作台 M1 调研

对比对象（只抄结构，不抄病种语义）：
- **BRE** = breast-cancer-workbench `prototypes/v0.4/`（index.html / app.js / style.css / primer-data.js）
- **AML** = aml-workbench `prototypes/v0.2/`（重点 #mind / mind-burden）
- **CX** = cervical-workbench（src→build→lib 客户端链路底本）

---

## 1. BRE v0.4（单页原型，结构最全）

### 1.1 页面骨架（index.html 53 行）
- skip link + prototype-bar（声明"全部模拟"）：index.html:13-14
- `.workspace` = `aside.sidebar` + `.work-area`（topbar / main#main / footer）：index.html:15-42
- sidebar 内四件套：`.brand`（图+名+slogan）、`.profile.profile-btn`（档案切换）、`nav#nav`（JS 渲染）、`.sidebar-bottom`（家族标语 eyebrow）：index.html:17-24
- topbar：面包屑 `小粉宝工作台 / <b id=breadcrumb>` + 右侧 status 双胶囊（资料目录/对话就绪态）+ 设置 + 大字 Aa + `?`（疾病概要入口，带 data-primer-open）+ `.ver-chip`：index.html:27-38
- `<dialog id=dialog>` 三段式（eyebrow+title / body / foot）+ `#toast[role=status]`：index.html:44-49
- 脚本顺序 primer-data.js → primer.js → app.js：index.html:50-52

### 1.2 导航树（逐字）
一级 PAGES（app.js:33-37）：`看板 / 病情整理 / 病情一图秀 / 临床 / 营养支持 / 心理支持 / 全程与康复 / 收藏与回顾`
二级 SUBPAGES（app.js:38-45）：
- records: `资料库 / 整理草稿 / 核对 / 病情档案 / 指标检测 / 病情汇总`
- clinical: `治疗历程 / 病理 / 分子档案 / 试验线索 / 资料对照 / 我的关注 / 数据来源`
- nutrition: `当下困扰 / 进食与体重 / 建议与回顾`
- mind: `当下感受 / 我的记录 / 支持资源 / 身体与亲密`
- care: `近期安排 / 术后恢复 / 上肢与淋巴水肿 / 不适记录 / 就诊准备 / 长期生活`
- review: `问题清单 / 已保留结果 / 报告与任务`

SUBTITLES 每页一句温和副题（app.js:46-55）。页头 `head()` 模板：eyebrow 固定 `PINKYPAL / YOUR CARE COMPANION` + h1 + desc + actions（app.js:238）。

### 1.3 首页 hero / 看板
- hero = head('今天，先照顾眼前的一件事。', SUBTITLES.dashboard, 阶段 chip)（app.js:712）
- D+N 状态卡 `.stage-card`：eyebrow=`D+N 状态卡 · 距下次安排 X 天`，`.stage-day`（第 N 天 + 锚点说明）、`.stage-now`（阶段 pill + 下次安排）、`.stage-actions`；空态分支 `is-empty` + 三步初始化引导（app.js:619-657）
- alert-strip（最近变化一句话 + 差值 + 跳转按钮）：app.js:716-720
- 三个 `.task-entry` 按钮卡（icon + 标题 + 副文 + ↗）：app.js:721-725
- `.dashboard-grid` 左右两栏；左栏 `section('最近的变化')` + 指标卡 + mini chart（app.js:726-740）

### 1.4 指标卡（真 3D 翻转，SBS 可直接搬）
- DOM（app.js:462-473）：`button.mcard[data-action=flip][aria-pressed]` > `span.mcard-inner` > `span.mface.front`（.cat/.name/.val/.delta/.rec/.meta+hint）+ `span.mface.back`（.cat/.name/sparkline/.spark-labels/.foot）
- CSS（style.css:221-250）：`.mcard{perspective:1200px;height:194px;border-radius:16px}`；`.mcard-inner{transform-style:preserve-3d;transition:transform .62s cubic-bezier(.2,.72,.2,1)}`；`[aria-pressed=true] .mcard-inner{transform:rotateY(180deg)}`；`.mface{backface-visibility:hidden}`；`.mface.back{transform:rotateY(180deg)}`；`.metric-grid{repeat(auto-fill,minmax(206px,1fr));gap:11px}`
- 正面信息结构 = 分类色点 / 名称 / **最近值(大字)+单位** / **差值行**（`较前次 ↑↓→ +em`）/ **次数行**（`共 N 次记录`）/ 底部 meta（日期 · 来源 + 翻转提示）：app.js:467-470
- 空态：只有 1 次记录 → back 显示 `.na`「只有 1 次记录，暂不连线」（app.js:458-461）
- 分类区块眉题：CATS 数组 + `.metric-group-head h3`（style.css:224-226，app.js:476-479）

### 1.5 表格列（最近报告类）
- 资料库表列：`材料名称 / 日期 / 类型 / 整理状态 / 操作`（app.js:758）
- 上肢测量表列：`日期 / 腕横纹 / 前臂中段 / 肘上 10cm / 腋下 10cm / 最大差(cm)`（app.js:936）；点位详情表：`点位 / 患侧（左） / 健侧（右） / 差值`（app.js:1205）
- 所有表均套 `.table-wrap`（横向滚动容器）

### 1.6 demo 数据组织（全在 app.js 顶部常量区）
- `CATS`（指标分类，app.js:58）→ `METRICS{code:{name,unit,dec,color,cat,points:[{d,v,src}]}}`（app.js:62-113）→ `ARM`（四点位测量数组，app.js:116）+ `ARM_PROTOCOL`/`ARM_POINT_LABEL`（app.js:114-115）→ `TREATMENTS`（按次治疗，app.js:127）→ `PROFILES`（双演示档案：full / 资料极少画像，app.js:136-145）→ 单一 `state`（app.js:147）
- 每个数据点都带 `src`（来源字符串）与日期 —— 来源字段是结构不是语义

## 2. AML v0.2（导航命名与泳道）

### 2.1 导航树（逐字，app.js:57-73）
一级 PAGES：`看板 / 诊断与基因 / 诱导与疗程 / 粒缺血象与支持 / MRD 与随访 / 移植 / 病情一图秀 / 营养与生活 / 心理与家庭 / 临床研究 / 资料与复诊`
- mind 二级（app.js:70）：`mind-feel 当下感受（双主体） / mind-death 对死亡的准备（私密） / mind-burden 家庭负担与照护者`
- SUBTITLES.mind（app.js:83）：`双主体各自记录、并列不平均；"对死亡的准备"默认私密三出口；不承诺、不判读。`
- 13 场景直达 SCENES（`['S01','开始 7+3',页,子页,[跳转目标],一句话]`，app.js:89-103）

### 2.2 心智负担与生活影响线（pageMindBurden，app.js:1194-1201）
结构 = 记录列表卡（feelRow 行：日期+正文+记录人 roleTag+可见性 pill private/shared+「改为共享/私密」切换，app.js:1172-1175）→ 照护者提示 notice plain（只记录事实声明）→ 动作行（＋记一条照护记录 / 看体温代记轨道 → / 回到看板）。生活影响（上班/经济）以"只记事实"的 notice 声明承接，不做评分。

### 2.3 时间线事件泳道（一图秀，app.js:427-499）
- 泳道常量 `const LANES = { cycle: 36, feverb: 56, tx: 66 }`（app.js:347）——曲线区下方三条独立 y 段
- 疗程节点 = 菱形 path + 标签（LANES.cycle，app.js:443）；发作期带 = 半透明圆角 rect（LANES.feverb，app.js:446）；输注 = 小圆点 + title，标签按 x 排序**两行错行**防叠（`<34 单位换行`，H-05，app.js:454-460）
- 行标 `<text x=6>`：`疗程 / 发作/输注`（app.js:461）
- 末点标签三向避让（排序后 cursor+13 下移、溢出整体回收，app.js:463-471）
- 小时级泳道（粒缺发热轨道）`svg.hourlane`：曲线 + 事件线 laneLine + 左侧 laneLab（app.js:590-612）
- 三粒度合同：月=一图秀 / 天=诱导日历 / 小时=发热轨道，互不混轴（app.js:1144）

### 2.4 空态样式
`.empty{h3+p}` 结构，文案带引导：「这个时间窗里没有所选指标 / 扩大时间范围，或在左侧加选一个指标」（app.js:430）；「暂无候选 / 从看板三步开始…」（app.js:1219）；单点不连线文字提示（app.js:494）。列表类空态用 `<p class="small-note">暂无记录。</p>`（app.js:1198）。

### 2.5 AI 面板（34 号一键发送契约）
- 每页头 `aiBtn(key)` = `<a class="chip ai-link" href="aml:agent-draft?prompt=…">AI 协助</a>`（app.js:323）
- 独立打开时拦截链接 → `window.parent.postMessage({type:'aml:agent-draft', prompt, send:true}, origin)`（app.js:1650），拿不到宿主则 toast 演示声明（app.js:1656）；点击委托在全局 `closest('a[href^="aml:agent-draft"]')`（app.js:1747-1748）
- 提示词预写 + 病情上下文拼装：aiPromptWithCtx（app.js:126 等）

## 3. CX（客户端链路底本）

### 3.1 src→build→lib
- `src/client.js` 是唯一手写源（注释明确"不要直接改 lib/client.js"，src/client.js:2）；`scripts/build-client.mjs` 用**零依赖字符串替换**注入常量：PANEL/AGENT_PANE（lib/layout.js）、API_PREFIX（dsh/routes.js）、version（lib/version.js）、包名仓库（package.json），支持 `--check` 校验漂移（scripts/build-client.mjs:1-30）
- `npm run check` 链 = build:version → build:demo → 六项 check → build:client --check → node:test（package.json scripts）
- `lib/` 产物：client.js（客户端入口）/ layout.js（面板参数唯一来源）/ version.js / zip.js
- `dsh/` 服务端：index.js（入口四件套）+ routes/store/readmodels/demo/export/import/mineru/settings/workbench/server
- `public/` = 独立前端：index.html + app.js + style.css + demo-data.js + primer{data,css,js}（与 BRE/AML 原型同构，直接复用）

### 3.2 dsh/index.js register 结构（file:line）
- 四件套 `name / inject / Config / apply`（dsh/index.js:27-36）：`export const name='cervical-main'; export const inject=['webServer','connection']`
- `Config = Schema.object({ root: Schema.string() })`（Schemastery，dsh/index.js:34）
- `openDataSource(root)`：root→sqlite 文件，否则 `:memory:`+seedDemo（dsh/index.js:45-57）
- `apply()`：鉴权 `ctx.connection.requestRejection(req)`（dsh/index.js:84-88）→ 交给共用路由 `createApiHandler`（dsh/index.js:70-92）→ `ctx.webServer.register({kind:'prefix', path:API_PREFIX, handler})`（dsh/index.js:94-100），effect 卸载时关库

### 3.3 agent-draft 桥接（lib/client.js）
- iframe 监听（lib/client.js:404-418）：`window.addEventListener('message')`，三重校验——`data.type==='cervi:agent-draft'`、`event.source===frame.contentWindow`、`event.origin===location.origin`；prompt 截断 8000
- `deliverContext(prompt)`（lib/client.js:385-398）：有会话→`rememberDraft` 暂存+`setPaneOpen(true)`+`flushDraft()`（500ms 轮询重试）；无会话→`openAgent(prompt)` 调起原生会话
- opener 侧：effect 里 `deliverRef.current` 闭包保鲜（lib/client.js:400-403）
- 面板形态：`PANEL={customFrame:true}`（lib/layout.js:47-54），AGENT_PANE 区间 25%–45%（lib/layout.js:64-74，注释 lib/client.js:23-27）；splitter：鼠标拖+键盘 ←/→ 步进 2%、`role="separator"`、宽度存 localStorage、<760px 转抽屉（src/client.js 注释 23-27；drag 样式 lib/client.js:128-164、308）
- AML 对比：AML 用 `aml:agent-draft` 链接+postMessage；CX 用自定义 `cervi:agent-draft` —— SBS 换成自己的 `<sbs>:agent-draft` 类型即可，结构照抄 CX 三重校验

### 3.4 apiBase 契约（public/app.js:100-108）
```js
function apiBase(){ const m=location.pathname.match(/^(.*)\/ui(?:\/|$)/); return (m?m[1]:'').replace(/\/api\/cervical$/,''); }
```
页面自挂 `/ui/` 前缀下，接口基址从自身路径推出——本地 dev-server 与 Desktop 同一份前端。调用形如 `${apiBase()}/api/cervical/bootstrap`（public/app.js:155）、`/export/<profile>.md`（:1278）、`/import?name=&profile=&persist=1`（:1537）。

## 4. 令牌体系（file:line）

| 令牌 | BRE v0.4（style.css:1-11 :root） | AML v0.2（style.css:8-16 :root） | CX（assets/） |
|---|---|---|---|
| brand | `--pink:#ffa1bd --pink-soft --pink-deep`（:5） | `--org:#C46A2B --org-soft --org-ink`（:8） | `--wb-mint:#e2f2ea` 系列（tokens.css:3-4） |
| action | `--action:#a8410a --action-hover`（:6） | `--act:#1F6E6B --act-soft --act-ink`（:9） | `--wb-action:#b95023 --wb-action-ink`（tokens.css:5） |
| danger | 无独立（--rose/#c2416b 兼） | `--red:#B3372E --red-soft`（:11） | 无独立 |
| warn | `--warn:#a16a10 --warn-bg:#fff8ea`（:8） | `--amber:#9A6B12 --amber-soft`（:11） | `--wb-yellow:#faf2d8`（:6） |
| ok | `--ok:#2f7d6b`（:8） | `--green:#3E7A44 --green-soft`（:12） | 无独立 |
| soft | `--pink-soft` 等浅底族 | `--grey-soft:#F0EDE6`（:12） | `--wb-paper/--wb-surface`（:3） |
| 圆角 16 | `--radius:16px; --radius-sm:10px`（:9）；mcard/卡 16px | `--radius:16px`（:16）；卡多用 14px | `--wb-radius:18px`（tokens.css:7，注意 CX 是 18 不是 16） |
| 间距 14 | 无 --gap（用 14px 字面量，如 app.js:734 inline） | `--gap:14px`（:16） | `--wb-gap:16px --wb-group-gap:24px`（:7） |
| 深色/降动效 | 无 | `--faint` 降权族（:13） | dark media + prefers-reduced-motion（tokens.css:19-24） |

CX 令牌双文件：`assets/tokens.css`（.wb-root 作用域 CSS 变量 + dark/降动效）与 `assets/tokens.json`（W3C Design Tokens 格式：color/font $value，含 action/mint/pink），加 `assets/manifest.json`、`assets/brand/BRAND.md`。

---

## 5. SBS 可直接复用结构清单

| # | 结构 | 来源 file:line | 复用方式 |
|---|---|---|---|
| R1 | 页面骨架：skip+prototype-bar+sidebar/brand/profile/nav+topbar(status 双胶囊/大字/？)+dialog+toast | BRE index.html:13-49 | 逐行照搬，改品牌与眉题 |
| R2 | PAGES/SUBPAGES/SUBTITLES 三张常量表驱动的双级导航 | BRE app.js:33-55；AML app.js:57-86 | 同构直接换名 |
| R3 | head() 页头：eyebrow+h1+desc+actions | BRE app.js:238 | 换 eyebrow 文案 |
| R4 | 真 3D 指标翻转卡 DOM+CSS（perspective/rotateY/backface，正面=最近值+差值+次数+来源，背面=sparkline） | BRE app.js:462-473；style.css:221-250 | 结构与 CSS 全套照搬 |
| R5 | sparkline/mini-chart SVG（smoothPath Fritsch–Carlson、参考虚线、末点大点+数值标签） | AML app.js:382-407；BRE app.js:688-701 | 函数级复制（AML 注释已声明"从 thyroid 复制"的家族传承） |
| R6 | 泳道图三层结构：曲线区+LANES 事件带（菱形疗程/半透明期带/输注点+错行标签+末点避让） | AML app.js:347,427-499 | 直接抄为 SBS 泳道 |
| R7 | 状态卡 stage-card（D+N eyebrow / stage-day / stage-now / actions，含 is-empty 分支与三步初始化） | BRE app.js:619-657 | 换锚点语义 |
| R8 | task-entry 三入口卡 + alert-strip + dashboard-grid | BRE app.js:716-740 | 照搬 |
| R9 | .table-wrap 表格列模式（名称/日期/类型/状态/操作） | BRE app.js:758,936 | 列名按 SBS 指标换 |
| R10 | 空态两档：.empty{h3+p} 带引导 / small-note 单行 | AML app.js:430,1198,1219 | 照搬 |
| R11 | agent-draft 桥：postMessage 三重校验（type/source/origin）+ rememberDraft+flushDraft 轮询 + deliverRef 闭包保鲜 | CX lib/client.js:385-418 | type 改 `sbs:agent-draft` |
| R12 | customFrame 面板：PANEL 唯一来源（lib/layout.js）+ AGENT_PANE 25-45% + splitter 拖/键盘/localStorage/窄屏抽屉 | CX lib/layout.js:47-80；lib/client.js:128-164 | 全套 |
| R13 | src→build:client 字符串注入常量（--check 防漂移）+ dsh/index.js 四件套 register（name/inject/Config/apply+requestRejection+prefix 注册） | CX scripts/build-client.mjs:1-30；dsh/index.js:27-100 | 逐条对齐 |
| R14 | apiBase() 自路径推导契约（去 /ui 尾巴、防 /api 重复拼接） | CX public/app.js:100-108 | 前缀换 /api/sbs |
| R15 | tokens 双文件（.wb-root 作用域 CSS 变量+dark/降动效；W3C tokens.json） | CX assets/tokens.css/tokens.json | 作用域与文件结构照搬 |
| R16 | 数据组织：顶部常量区 CATS→METRICS→专项数组→PROFILES→state，每点带 d/v/src | BRE app.js:58-147 | 换 SBS 指标 |
| R17 | aiBtn 链接式契约 + 演示面板兜底 toast | AML app.js:323,1650-1656 | href 换前缀 |

## 6. SBS 必须替换的病种语义清单

| # | 原语义 | 出处 | SBS 替换 |
|---|---|---|---|
| W1 | 乳腺癌全部病名/解剖词：左乳、病理报告·左乳、腋窝清扫、放疗部位胸壁+锁骨上、患侧/健侧 | BRE app.js:167,781,1205 | 短肠解剖与术式词（切除范围/残余肠长等，由 SBS 领域资料定） |
| W2 | 乳腺癌指标集 METRICS：CA15-3、CEA 等肿瘤标志物与参考线 2cm 臂围差 | BRE app.js:62-113,930 | SBS 指标（体重/电解质/出入量等），参考线另行临床确认 |
| W3 | 四点位臂围测量协议（腕横纹/前臂中段/肘上 10cm/腋下 10cm）与淋巴水肿子页 | BRE app.js:114-115,870 | 仅当 SBS 需要时保留测量成对差值结构，点位重定义 |
| W4 | 治疗按次 TREATMENTS：化疗周期/放疗 25 次/来曲唑 | BRE app.js:127-135,736 | SBS 手术/肠康复治疗事件 |
| W5 | AML 血液学泳道事件：疗程 cycle / 粒缺发作 feverb / 输注 tx 三条带 | AML app.js:347,440-452 | SBS 事件类型重定义（手术/感染/营养支持等），**泳道机制保留** |
| W6 | AML 心理三级：当下感受（双主体）/ 对死亡的准备（私密）/ 家庭负担与照护者及其 K6/FCR 表述 | AML app.js:70,83,1172-1201 | SBS 心理子页可沿用"双主体+私密+照护者负担"三段**结构**，文案与字段按 SBS 人群重写 |
| W7 | 疾病概要 primer 全部内容与 aria 文案（定义/指南/治疗全景/趋势，36 号） | BRE app.js:625；primer-data.js | SBS 自己的 DISEASE-PRIMER（口径文档→window.DISEASE_PRIMER，CX public/primer-data.js:11） |
| W8 | 阶段/分期语义：乳腺癌阶段 pill、FIGO（CX） | BRE app.js:712；CX public/app.js:121 | SBS 病程阶段（术后/适应期/康复期等） |
| W9 | 品牌三件套：小粉宝 PinkyPal / 小橙宝 OrangePal / 小莲宝 CerviPal 名称、色板、品牌图 assets/brand | BRE index.html:6-17 | SBS 新品牌名+组织色（结构照 assets/brand/BRAND.md 组织方式） |
| W10 | 演示档案人设：林女士/周女士、何秀云及其 DEMO-1/DEMO-2 画像 | BRE app.js:136-145 | SBS 双画像：资料充分/资料极少（画像机制照搬） |
| W11 | 泳道标签行文字「疗程 / 发作/输注」与图注免责句 | AML app.js:461,497 | SBS 事件名+对应免责声明 |
| W12 | AI 提示词 aiPromptWithCtx 的病种上下文拼接 | AML app.js:126 等 | SBS 指标与页面上下文 |

## 7. 结论要点

1. **原型层三仓同构**：CX 的 public/ 与 BRE/AML 原型是同一套骨架（index.html 53 行内的 skip/prototype-bar/sidebar/topbar/dialog/toast + PAGES/SUBPAGES/SUBTITLES 常量表）。SBS 原型可直接以 BRE v0.4 为底本克隆。
2. **客户端层只有 CX 走通**：src（手写）→ build-client.mjs（注入）→ lib（产物）→ dsh/index.js（四件套 register）→ apiBase 契约。SBS 的 M1 应直接复制这条链路，改包名/前缀/`sbs:agent-draft`。
3. **令牌体系无统一源**：三仓各自 :root；AML 是唯一有 `--radius:16px + --gap:14px` 双令牌的仓；CX 是唯一有 dark mode、reduced-motion 和 W3C tokens.json 的仓。SBS 令牌建议以 CX 文件结构 + AML 数值（16/14）+ 新品牌色起步。
4. 引用共 17 复用 + 12 替换条目，每条带 file:line，可直接做 M1 搭建 checklist。
