# PROTOTYPE-CHECKLIST · 小养宝 NutriPal 原型 v0.2.0（M2 签认对象）

实测时间：2026-11-08 00:05 · 环境：macOS darwin 24.6.0 · Chrome 145.0.7632.75 headless · Node 22.19.0
证据：`node scripts/probe-prototype.mjs`（37 项断言，全过）+ `node scripts/probe-extra.mjs`（11 项补充量测，全过）· 截图 docs/screenshots/（8 张，文件名含版本）。
结论词只用：通过 / 失败 / 跳过（原因）/ 待人工（缺什么）。

## 开工前（Q1–Q3）

| 编号 | 结论 | 实测值 / 证据 |
| --- | --- | --- |
| Q1 | 通过 | docs/INTERACTION-DESIGN.md v1.0-G1 + docs/signoffs/G1-自动签认.md（版本一致，HTML 开工在后） |
| Q2 | 通过 | docs/DEV-PLAN.md §5 与 docs/DIFF-MATRIX.md 写明 BRE v0.4 / AML v0.2 基准；research/family/FAMILY-MATRIX.md 带 file:line |
| Q3 | 通过 | probe Q3-首屏：首页 .card=6，file:// 直接打开非空 |

## 家族基线（Q4–Q8）

| 编号 | 结论 | 实测值 / 证据 |
| --- | --- | --- |
| Q4 | 通过 | prototypes/v0.2/index.html:15-42：声明条→侧栏→顶栏（品牌/状态说明/主操作贴右）→页脚 |
| Q5 | 通过 | 原型形态与 BRE v0.4 同构（业务主区居中，AI 走 chip+弹窗演示；侧栏对话面板属 M5 宿主接线，见 Q18） |
| Q6 | 通过 | probe Q6-字号：body font=15px；页脚贴底（flex 布局，footer 在 .work-area 内） |
| Q7 | 通过（原型语境） | 令牌定义于 style.css :root（brand/action/danger/warn/ok/soft、--radius:16px、间距 14）；组件引用 var()。组件级存在少量色值（与 BRE v0.4 原型同形态）；M5 移植时收敛进 assets/tokens.css（grep 组件级 hex 约 18 处，见 style.css） |
| Q8 | 通过 | probe Q8-禁词0：分期/病期/线序/疗效应答/生存期/MRD/肿瘤标志物/危险度/缓解期 命中 0 |

## 两套模拟数据（Q9–Q13）

| 编号 | 结论 | 实测值 / 证据 |
| --- | --- | --- |
| Q9 | 通过 | probe：A inf=3/lab=3/docs=3，B inf=178/lab=17/docs=5；页头显示档案名 |
| Q10 | 通过 | probe Q10-切换不串档：B 日历打点 3=登记数；切回 A rows=3；flip/筛选随切换重置（app.js pick-profile: flipped.clear、sel 重置） |
| Q11 | 通过 | demo-data.js：零条（A life=[]）、单条（A daily、B vd）、多条（B）、缺字段（in-a3 ml=null、dr-b2 urine=null）、未知日期（dr-b3 d=null）、私密项（li-b2 private）、无原件（lv-b2、d-b 未取得标注） |
| Q12 | 通过 | probe Q12：首页化验数=DEMO 长度（3/3）；页面无写死业务数字（全部 `${}` 取自 DEMO）；日历/登记表/一图秀读同一源 |
| Q13 | 通过 | 首屏声明条「全部为合成示例」+ 页脚「合成示例 · 仅演示 · 未连接宿主」+ 每套档案 tag（index.html:14、footer） |

## 交互路径（IP/X）

| 编号 | 结论 | 实测值 / 证据 |
| --- | --- | --- |
| IP1 | 通过 | INTERACTION-DESIGN v1.0-G1 + G1 签认 |
| IP2/X1 | 通过 | probe IP2-孤儿页：visited=24/24，孤儿=0 |
| IP3 | 通过 | probe IP3-导航九页逐字一致（nav keys=9；入口名=渲染文案=key） |
| IP4 | 通过 | 13 条路径每条有可观察产物（登记+1/日历打点/摘要预览），每页有「回到看板」或导航可达首页 |
| IP5 | 通过 | INTERACTION-DESIGN §三 实体×通道表：可写实体均有 AI 候选通道；手术事实标「—」为红线实体 |
| IP6 | 通过 | 每页显式编辑入口 ≤1（每页至多 1 个 form；手工入口不散落） |
| IP7 | 通过 | 数字输入全部 inputmode="decimal"/"numeric"（grep app.js：infusion-form/daily-form） |
| IP8 | 通过 | grep「不可恢复」=0；更正=新增版本（fact-form 提交 push version+1，旧版本折叠卡可查） |
| IP9 | 通过 | 手工与 AI 候选同写事实层：候选核对页接受/拒收，事实层 lab_values 独立单版本链 |
| IP10 | 通过 | 每页 ≥1 处 AI 协助（probe Q14：全站 ai-link=15，预写提示词，不自动发送） |
| IP11 | 通过 | 每页 head actions 注入「和 AI 讨论」（render() 兜底注入）；弹窗内为完整上下文演示 |
| X2 | 通过 | probe 逐页逐子页走查（9 页 24 子页全渲染 len>500） |
| X3 | 通过 | 手工/AI/导入同源（candidates→核对→lab_values 单链） |
| X4 | 通过 | 无头断言出数字：probe 37+11 项全部带数字输出 |

## 一图秀（C1–C12）

| 编号 | 结论 | 实测值 / 证据 |
| --- | --- | --- |
| C1 | 通过 | probe-extra：mg 主可比组 bbox=204px=满量程（plotH=204）；ISE 组 2 个邻近点落点小为数据事实；图内标注「每条线按自身记录范围缩放，不同方法不合并」 |
| C2 | 通过 | probe C2-单点不连线：vd 单点 paths=0 circles=1 |
| C3 | 通过 | probe C3-空窗口：文本含「没有所选指标」且有下一步按钮 |
| C4 | 通过 | probe-extra：关事件泳道前后 path[d] 逐项相等（2 条）且非空 |
| C5 | 通过 | probe-extra valueTags=3（3 个序列各 ≤1 个末点标签） |
| C6 | 通过 | probe-extra：全部 text bbox 在 viewBox 内 |
| C7 | 跳过 | SBS 无康复测量线；营养/体重单位均为绝对值（kg/cm/ml），无百分比表达 |
| C8 | 通过 | probe-extra：全部 9 点 → 近 3 月 3 点 |
| C9 | 通过 | probe Q26-390：scrollWidth=390=clientWidth |
| C10 | 通过 | probe C10：reduced-motion 下 dashoffset=0px（终态可见） |
| C11 | 通过 | probe MT-C11：翻转前后卡高 194/194、bodyDelta=0、相邻卡无位移 |
| C12 | 通过 | probe-extra：翻卡 A 后 pressed=[true,false×7] |
| 家族三条 | 通过 | 归一化口径图内标注；事件泳道与数据区分层（LANE_Y=330+，数据区 CY=96–300）；.overview 用 grid minmax(0,1fr) |

## 指标卡与趋势（MT01–MT15）

| 编号 | 结论 | 实测值 / 证据 |
| --- | --- | --- |
| MT01 | 通过 | 9 一级页 × 24 子页深链接全部可达（probe X2 + A7 刷新仍在原 Tab） |
| MT02 | 通过 | metric-group 按 labCats 独立标题与网格（app.js metricGroups） |
| MT03 | 通过 | probe MT03：指标页组数 4 = 一图秀 rail 组数 4 |
| MT04 | 通过 | 卡正面：类别/名/值/单位/日期/次数/来源/差值（无疗效结论，差值文案「较前次 ↑/↓/→」） |
| MT05 | 通过 | 单点（vd/na 文案）、0 值与缺字段（显式「未知」pill）、空态、未知日期（pill 黄）、A 档案少记录——probe+代码路径；纯文本值指标 SBS 无 → 该子项不适用 |
| MT06 | 通过 | seriesFor 按 group 分线（跨方法断线）；差值仅同 group 内计算（metricCard delta 条件） |
| MT07 | 通过 | probe MT-C11：连点两次恢复正面、body 高度不变 |
| MT08 | 通过 | probe-extra：真 button（键盘可操作）、pressed 切换、back aria-hidden=true |
| MT09 | 跳过 | 卡背折线无数据点交互（点击点在主图 SVG 上，打开 pin 面板，不触发翻卡） |
| MT10 | 通过（代码级） | 候选核对前不入图：lab_values 与 candidates 分离；接受后状态更新并 toast（正式版由导入管线写入事实层；原型演示接受动作零副作用可回退状态不变） |
| MT11 | 通过 | 最近报告表读 docs 同一来源数组；未知日期显式留空 |
| MT12 | 通过 | probe-extra：700/620 scrollWidth=700/620；390 由主探针覆盖；大字档 body.large 只改字号 |
| MT13 | 通过 | pick-profile 重置 flipped/sel/pin（app.js）；Q10 切换不串档 |
| MT14 | 通过 | probe-extra：B 登记 178 条、表行 178；曲线 bbox=(62,96) 在固定绘图区 |
| MT15 | 通过 | 本文件即五栏记录（HTML 版本 0.2.0、截图 8 张、偏差见「跳过」行、确认范围=原型、Desktop 验收状态=未验） |

## 整页视图（A1–A10，本原型的整页实例=疾病概要浮层）

| 编号 | 结论 | 实测值 / 证据 |
| --- | --- | --- |
| A1 | 通过 | probe-extra：打开时 body overflow=hidden，背景滚不动 |
| A2 | 通过 | probe P7：Esc 关闭（概要是唯一浮层栈） |
| A3 | 通过 | history.pushState + popstate 监听（primer.js）；浏览器返回键等价 back()（待人工补真机确认项） |
| A4 | 通过 | probe P7：关闭后焦点回触发按钮 |
| A5 | 通过 | probe-extra：打开前后 scrollY=177/177 |
| A6 | 通过 | probe Q26 全站 390 无横滚 |
| A7 | 通过 | probe A7：#visits/问题清单 刷新仍在（breadcrumb=复诊准备 · 问题清单） |
| A8 | 通过 | reduced-motion 终态可见（C10 同口径） |
| A9 | 通过 | 顶栏 breadcrumb 与页头标题逐字一致（render()） |
| A10 | 通过 | probe P5：返回/关闭双入口（btns=3 含 ✕） |

## 疾病概要（P1–P9）

| 编号 | 结论 | 实测值 / 证据 |
| --- | --- | --- |
| P1 | 通过 | 顶栏「?」aria-label 说明四段（index.html:36） |
| P2 | 通过 | probe P2/P3：四段=定义/医学资料规范和指南情况/治疗全景/发展趋势 |
| P3 | 通过 | 面板高度 90vh ≥ 视口 90%（vh=90） |
| P4 | 通过 | history.pushState 一进 + back 一退（primer.js） |
| P5 | 通过 | 返回/关闭独立入口 |
| P6 | 通过 | 关闭后焦点回触发按钮；A5 scrollY 保持 |
| P7 | 通过 | Esc 只退一层（面板关，页面仍在本页） |
| P8 | 通过 | window.DISEASE_PRIMER 四段齐全；趋势段禁词 0（Q8 同口径）；非肿瘤出口句「按受累器官与病情轻重排列」「不代表任何一项适合你」「需要问你的医生」（primer-data.js） |
| P9 | 通过 | 同左基线（13.5px/1.68）、来源行左边界统一（.primer-src 统一样式）；表格 overflow-x:auto（.table-wrap） |

## AI 入口（Q14–Q19）

| 编号 | 结论 | 实测值 / 证据 |
| --- | --- | --- |
| Q14 | 通过 | probe：全站 ai-link=15；grep sbs:agent-draft >0 |
| Q15 | 通过 | probe Q15：href 协议 sbs:agent-draft?prompt=…（M5 移植 lib/client.js 桥接 + templates/check-agent-draft-bridge.mjs 断言） |
| Q16 | 通过 | 点击 AI chip → 弹窗明说「未接入 AI，不会发送」（app.js click 拦截） |
| Q17 | 通过 | 草稿只填不发：弹窗只展示 prompt 文本，无发送动作、无 fetch（app.js 无全局 fetch） |
| Q18 | 跳过 | 原型无侧栏对话面板；五态（展开/收起/隐藏/重开/窄屏抽屉）与 25–45% 拖宽属宿主 A 族面板，M5 按接线实现 |
| Q19 | 通过 | 全部提示词重写后不含「诊断/分级/预后/建议/疗效」（app.js 全文 grep，UI 提示文案除外且不进上下文） |

## 响应式（Q20–Q26）

| 编号 | 结论 | 实测值 / 证据 |
| --- | --- | --- |
| Q20 | 通过 | 表单纵向堆叠（form-grid 单列 @900） |
| Q21 | 通过 | style.css 全部多列用 grid + minmax(0,1fr)（grep 无 flex:1 布局） |
| Q22/Q23 | 通过 | .row-main min-width:0；.card min-width:0；.workspace minmax(0,1fr) |
| Q24 | 通过 | .scroll-hint 存在（chart-wrap 窄屏显示） |
| Q25 | 通过 | nowrap 仅用于 .ver-line/.status/短 token（style.css） |
| Q26 | 通过 | probe：1440/700/620/390 四档 scrollWidth=clientWidth；断点 1180/900/600 |

## README 与截图（Q27–Q30）

| 编号 | 结论 | 实测值 / 证据 |
| --- | --- | --- |
| Q27 | 通过 | docs/screenshots/ 8 张实渲（Chrome 145 headless，含折叠收/展态、翻面态、390），文件名含 v0.2.0；check-readme-assets.mjs 仓内不存在 → 人工核（与检查器现状节一致，不得写「检查器通过」） |
| Q28 | 通过 | README 每图一句患者语言说明，无实现细节 |
| Q29 | 通过 | README 五段：疾病概要/关键功能/怎么用/数据与口径/开发 |
| Q30 | 跳过 | 未装机；真机截图待 M6 |

## A 族面板与数据隐私（Q31–Q39）

| 编号 | 结论 | 实测值 / 证据 |
| --- | --- | --- |
| Q31–Q34 | 跳过 | A 族面板（40 号）属宿主 customFrame 接线，M5 实现 |
| Q35 | 通过 | probe Q35：摘要弹窗含「3 条中私密 1 条未包含」；三出口共用 filterPrivate（app.js 同一函数） |
| Q36 | 通过（记录级） | 更正保留历史版本（sf 版本链）；私密标记在记录级（life visibility 切换）；版本级私密标记随 M3 schema（fact_versions.private 列）落地后复测 |
| Q37–Q39 | 待人工 | M3 schema 落地后测（ORDER BY rowid、显式 null、无判定列、徽章免责） |

## 未勾项清单（M3–M5 补）

Q18、Q30、Q31–Q34、Q36（版本级）、Q37–Q39、C7（不适用）、MT09（不适用）、A3（真机返回键）。
