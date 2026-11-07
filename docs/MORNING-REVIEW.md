# MORNING-REVIEW · short-bowel-workbench 首夜（2026-11-07 23:00 → 11-08 03:10）

## 一句话结论

短肠综合征（罕见病 #73 · R2 · T2）从 BACKLOG 自动领取（Issue #65 claimed）走完 **M0–M6 + M7/M8/M9**：原型 v0.2 过 G2（独立评审两轮 P0 清零）、schema 16 表冻结过 G3、开发版 v0.2.1 过 V1（check 0 ✗ / test 49/49 / audit 0 失败）、已装入 DSH Desktop 实机并确认宿主加载（V2 过）；**V3 真机业务闭环停闸待人工**（需用户新建会话）；M7 tag+release、M8 BACKLOG 回填 PR 均为冻结草稿未发布。

## 原型审查入口

- 打开方式：浏览器直接打开 `prototypes/v0.2/index.html`（合成示例，刷新重置；档案 A/B 侧栏切换）。
- 截图：`docs/screenshots/` 8 张（v0.2.1-*.png：看板 A、一图秀 B、输液日历 B、指标卡翻面 B、折叠收/展态 B、疾病概要、390 窄宽）。
- 清单：`docs/PROTOTYPE-CHECKLIST.md`（逐条实测值 + 结论四态；未勾项在文末）。

## 自动签认清单（全部待晨审追认，无一为用户确认）

| 闸口 | 文件 | 结论 |
| --- | --- | --- |
| G1 | docs/signoffs/G1-自动签认.md | 通过（调研三路 + 重名率 33.3% 实测） |
| G2 | docs/signoffs/G2-自动签认.md | 通过（复评放行：P0=0/P1=0，P2=13 列于评审报告随 M5 批次） |
| G3 | docs/signoffs/G3-自动签认.md | 通过（16 表 + sha256 冻结 + 判读列 0 命中） |
| V1 | docs/signoffs/V1-自动签认.md | 通过（check 全绿 / 49 用例 / audit 0 失败 1 待人工） |
| V2 | docs/signoffs/V2V3-自动签认.md | 通过（Desktop 实机加载 + 活路由 401 鉴权证据） |
| V3 | docs/signoffs/V2V3-自动签认.md | **停闸待人工**（需用户在 Desktop 新建会话后真机走查） |

## 待用户决策项

1. **默认值追认**（docs/DEV-REQUIREMENTS §五）：服务主体=成人 SBS 患者本人；病程覆盖=术后恢复期→代偿期→长期维持；MinerU 未接入留桩；品牌占位名=小养宝 NutriPal。
2. **V3 真机走查**：打开 Desktop → 小养宝 NutriPal → 新建会话 → 9 页走查 + 截图（Q30 真机截图未拍，README 已如实标注）。
3. **患者资料目录**：须明确指定后才能导入真实资料（主目录/桌面/下载根/tmp 一律拒绝，当前未指定）。
4. **冻结待发**：tag v0.2.1 + GitHub release 命令在 docs/release-draft/RELEASE-v0.2.1.md；BACKLOG 回填 PR 补丁与步骤在 docs/release-draft/M8-backlog-pr.patch / -steps.md（31 号：走 PR 前 pull main）。
5. **starter 回流**：commit 477937b（L77–L80 + primer 唯一源约定 + rc.23）已本地提交未推送（SSH 远程），确认后 `git push origin main`。

## 消耗

- 时长：约 4 小时 10 分（23:00–03:10）。
- token：以客户端可见数据为准；本会话内未取得精确计数，写「未取得」。子代理三个调研轮 + 一个 M5 移植轮 + 两轮独立评审（子代理 token 未在客户端可见口径内，未取得）。

## 未验证与异常

- **未验证**：V3 真机业务闭环；真机截图（Q30）；真实数据导入（无资料目录）；MinerU 真实解析（未接 Token，六部件桩件+契约测试过）；NMPA 在线核验（官网 412 反爬，替度格鲁肽获批状态标【待核】）； ClinicalTrials 中文三通道（chictr_online FAILED、两个中文归档 NO_RESULTS——如实记 FAILED，不写零结果）。
- **异常**：①本机直连 GitHub 超时，全程走 127.0.0.1:7890 代理；②子代理并发受限（user concurrency limit），三路调研改串行；③一次误覆盖 public/app.js（L78 教训已回流）与一次升版半途连环红（L80），均已修复并有测试护栏；④audit 1 待人工（primer trend 段禁词审计器不解析 points 结构，内容已人工核）。

## 晨间追记（2026-11-08 08:00 前复核，用户点名项）

- **「?」按钮 ≠ DP 模块**：复核发现 v0.2.1 的疾病概要是自造 `.primer-overlay` 面板——按钮在、能打开、仓内探针过，但**不符合家族探针合同**（.dp-overlay#disease-primer 系），家族 probe-disease-primer 打过来必挂（正是用户点名的家族两连坑）。
- **修复（v0.2.2）**：换装 starter `assets/patterns/disease-primer.{js,css}` 家族模块；primer-data 重写为 DP 数据合同（brand/name/en/updated + 四段 definition/evidence/landscape/trend，sources 带 https 深链，L1/L3 拦裸域名首页 2 处已修）。
- **验收**：家族探针 `--url http://127.0.0.1:8177/v0.2/index.html` 显式打本仓原型 → **10/10 全过**；仓内探针 39/39（新增 L81-DP模块挂载 DOM 级断言）；check 0 ✗ / test 49/49 / audit 0 失败。
- **回流**：starter L81 + rc.24（本地 477937b+1，未推送）。
- **异常**：v0.2.2 push 连续 SSL_ERROR_SYSCALL（代理上游），重试 3 次未成功，commit 80adbe5 本地待推。
