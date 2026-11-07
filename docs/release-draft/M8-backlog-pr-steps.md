# M8 回填 PR 执行步骤（晨审追认后）

1. `cd /tmp && git clone https://github.com/xyb-openharness-dsh-plugins/.github && cd .github && git checkout -b backlog-short-bowel-claim`
2. **先 pull 最新 main**（31 号纪律：BACKLOG 改前先 pull）
3. `git apply M8-backlog-pr.patch`（本目录；若 main 已动，按 31 号口径手工只改 #73 一行状态列）
4. commit：`BACKLOG: 短肠综合征 #73 → 🔵 short-bowel-workbench v0.2.1（Issue #65）`
5. push 分支到 fork 或直接分支（需授权）→ 开 PR → 等 claimed 工作流确认后合并
- 补丁内容：仅 #73 一行（⬜ 招募中 → 🔵 v0.2.1 + 认领依据），不改其他任何行
