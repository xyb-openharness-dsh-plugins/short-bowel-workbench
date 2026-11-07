# PROGRESS · short-bowel-workbench（小养宝 NutriPal）

更新时间：2026-11-07 23:20 · 模式：无人值守夜间（23:00–08:00）· 认领：Issue #65（claimed 已自动打标）

## 当前里程碑
M5 开发版（七步移植 + MinerU 六部件 + 双形态回归，2026-11-08）

## 已完成
- 自动领取：核对 BACKLOG 2026-10-26 全表 + org 仓列表 + 全部开放 issue → 选定 SBS（理由见 DEV-PLAN §1）；Issue #65 提交，/claim 工作流跑通，claimed 标签已打
- 建仓 xyb-openharness-dsh-plugins/short-bowel-workbench（private）+ starter init（dsh-wb-cli）+ cordis.patch.yml 补 config.root（dshHomePath('short-bowel-workbench')）
- package.json dsh 块、repository、VERSION 0.1.0 核对通过
- 基线 npm run check：PASS（探针覆盖/静态引用/版本字面量按设计 SKIP，原型未开始）
- 文档九件落盘：SPEC / DEV-REQUIREMENTS（+2026-11-07 日期版）/ DIFF-MATRIX / PATIENT-FLOW / SCENARIOS / USER-RESEARCH / INTERACTION-DESIGN / CLINICAL-DATA / DEV-PLAN

## 下一步
M1 三路并行调研（医学约束 / 用户研究 / 家族对照）→ DIFF-MATRIX 全量（重名率实测 ≤70%）→ SPEC/INTERACTION-DESIGN 定稿 → G1 自动签认

## 阻塞
- git push 需走本机代理 127.0.0.1:7890（已配 repo-local http.proxy，fetch 已验证）
- 患者资料目录未指定（按默认值规则拒绝主目录/桌面/下载根/tmp；M6 前需用户指定，本轮不导入真实资料）

## M5 实测（2026-11-08）
- npm run check 全绿（EXIT 0；版本十处同源 / 文案红线 / 冻结合同哈希 / 双形态 ui-parity 全过）
- npm test：8 个用例文件 · 49 用例全过（0 fail）
- npm run audit：42/44 通过 · 1 失败（primer/数据：需 prototypes/v0.2/primer-data.js 带 definition/evidence/landscape/trend 四 id，该文件已 G2 签认冻结，本轮不改，待下一原型版本统一补）· 1 待人工（primer/趋势段：SBS primer-data 为委托式单行，趋势禁止词需人工确认）
- node scripts/build-client.mjs --check 过；版本 0.2.0 十处 grep 一致（详见提交说明）

## 各闸口结论
- G1：已签 · G2：已签 · G3：已签（冻结 5719a6d0）· V1：未到 · V2：未到 · V3：未到
