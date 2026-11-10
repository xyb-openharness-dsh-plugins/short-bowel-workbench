## 0.2.3（2026-11-11，AI 对话面板激活修复）

- 会话判定改用宿主归属 `ownedSession()`（`ownsSession(currentSession())`），不再用 `Boolean(conversation)`（customFrame 下没会话也会传隐藏容器 → 判断恒为真 → 点了没反应）。
- 创建路径改 `service.newSession(workspaceId)`，工作区取 `service.defaultWorkspace?.()?.workspaceId`；无可用工作区时由宿主提示选目录；不再用 `ensureSession({})`。
- 取消目录选择不留空会话并提示可重试；创建失败在工作台内显示原因；订阅会话变化触发重渲染；草稿仍只填不发。
- 版本与生成物同步 0.2.3；新增 `scripts/check-agent-pane-contract.mjs` 入 check 链。
- **界面加载与真机点击待人工**（需退出重开 DSH Desktop 后新建会话走查）。

# 变更记录

只增不删；每条写清"改了什么 + 为什么 + 用户可见结果"。版本号与 VERSION、package.json 三处必须一致。

## 0.2.1

- primer-data 四段显式化（definition/evidence/landscape/trend），审计可解析；内容与 DEMO 唯一源逐字一致。
- 版本十处同源刷新。

## 0.2.0 — 2026-11-08

M5：七步移植 + MinerU 六部件 + 双形态回归 + test 全绿。包版本 0.2.0（与 VERSION、lib/version.js、页面字面量十处同源）。

- **开发版客户端链路（七步移植，逐文件适配自家族底本）**：`lib/layout.js`（面板参数唯一来源，customFrame=true · 业务左 0.65 · 会话 25%–45%）→ `src/client.js`（小养宝 🌿 外壳，开场白只填草稿不发送，消息类型 `sbs:agent-draft`）→ `scripts/build-client.mjs` 生成 `lib/client.js` → `dsh/routes.js`（前缀 `/api/short-bowel`）→ `dsh/index.js`（宿主入口，`xyb-short-bowel.sqlite` + 冻结 schema 16 表）→ `dsh/readmodels.js`/`dsh/demo.js`（DEMO 唯一源 → 16 表 → 同形读模型）→ `scripts/dev-server.mjs`（`npm run dev -- --workspace <目录>`）。
- **public/ 开发版界面**：从 prototypes/v0.2（G2 签认基准）复制七件；差异全部包在 `DEV-BRIDGE` 注释对里并逐对登记（test/ui-parity.test.mjs 机械保证：6 文件逐字节一致 + 34 个视图函数逐字符一致）。双形态：独立打开（file://）走演示态；iframe 内 fetch bootstrap，失败降级演示态并标注「未连接服务」，禁裸 throw。
- **MinerU 六部件**：设置 Token UI / settings API（`/api/short-bowel/settings/mineru`，原文永不回显）/ 上传解析（import?persist=1，只进候选）/ 状态展示 / 演示态降级 / 申请指引。默认未接入，Token 不进仓（.gitignore 已含 `.secrets/`）。
- **数据层**：种子从 `prototypes/v0.2/demo-data.js` 两套档案（A/B）经 `dsh/demo.js` 转换层灌入 16 表（不改冻结 schema）；读模型输出与唯一源同形（test/demo-parity.test.mjs 白名单逐项 deepEqual）。
- **测试**：test/ 八套全过（client/store/server/demo-parity/import-export/ui-base/ui-parity/pack-contents，49 断言级用例）。
- **检查链**：npm run check 全绿（新增 check-wording 文案红线、check-write-schema 冻结合同、build-version/build-client 同源守卫；check-probe-coverage 适配 PAGES/SUBPAGES 导航形态）。

## 0.1.0 — 2026-11-07

- 由社区脚手架 dsh-wb-cli@1.10.0-rc.21 (46c541a) 初始化，仅有注册骨架与健康接口，无业务功能。
