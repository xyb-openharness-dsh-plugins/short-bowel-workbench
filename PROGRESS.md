# PROGRESS · short-bowel-workbench（小养宝 NutriPal）

更新时间：2026-11-08 02:52 · 模式：无人值守夜间（23:00–08:00）· 认领：Issue #65（claimed）

## 当前里程碑
M9 完成（全里程碑收尾；V3 停闸待人工；详见 docs/MORNING-REVIEW.md）

## 已完成
- M0 文档九件 + 基线 check；M1 三路调研 + G1；M2 原型 v0.2 + 探针 38 项 + 独立评审两轮 P0 清零 + G2；M3 schema 16 表冻结 + G3；M4 试验线索四件套 588 条
- M5 七步移植 v0.2.1：check 全绿（0 ✗）、test 8 套 49 用例全过、audit 43/44（0 失败 1 待人工）、版本十处同源、V1
- M6：tgz 四要素过、pnpm 装入 Desktop 实际 profile、bundles 登记、重启后宿主清单加载 ✓、活路由 401 鉴权证据 ✓ → V2 过；V3 停闸待人工（需用户新建会话）
- M7/M8：release 与 BACKLOG PR 均为冻结草稿（docs/release-draft/），未发布未推送
- M9 回流：starter 477937b（L77–L80 + primer 唯一源约定 + rc.23，自检 67/67 过，本地未推送）；本项目 DEV-REQUIREMENTS 新增三出口过滤签名/文件保护/升版顺序三条强约束（见 git log M9 提交）；新增检查器 scripts/check-write-schema.mjs（判读列 deny 词表断言，下一轮直接可用）

## 下一步
晨间：①追认五份自动签认 ②V3 真机走查 ③执行 release 与 BACKLOG PR ④starter 回流 push

## 阻塞
- V3 真机走查需用户在 Desktop UI 新建会话（宿主按会话授权）
- 患者资料目录未指定（M6 真实数据导入前必须由用户指定）

## 各闸口结论
- G1 ✓（自动·待追认）｜G2 ✓（复评放行·待追认）｜G3 ✓（自动·待追认）｜V1 ✓（自动·待追认）
- V2 ✓（自动·待追认）｜V3 停闸待人工
