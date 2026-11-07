# schema 冻结合同 · 小养宝 NutriPal（短肠综合征）· G3 候选 · 2026-11-08

- 文件：`0001_initial.sql`（16 表：档案 2 + 指标 3 + 通用 7 + SBS 专属 1 + 导入 3 —— 以文件内实际 CREATE TABLE 为准）
- sha256：`5719a6d072ced1494714c4180fb99daa631d498e18457140544ea7facc388d47`
- **状态：夜间无人值守自动签认（待晨审追认）**。自提交时刻起：本文件哈希不得变动；结构变更只能新增 `000N_*.sql`；0001 不改不删；任何哈希变动即冻结破坏，须评审留痕。

## 冻结断言（G3 候选时实测，node:sqlite 内存加载）

1. **判读列断言**：全表全列名扫描 deny 词表（diagnosis / risk_level / severity / verdict / match_score / eligible / suitability / activity_score / normal_flag / stage / line_of_treatment / response / prognosis / grade / score）→ 0 命中（`scripts/check-write-schema.mjs` 静态执行，2026-11-08 实测 0 命中）。
2. **语法**：`DatabaseSync.exec` 全量执行通过（node 22.19.0 内存库，16 表 + 4 索引）。
3. **字段语境**：医生原文口径字段（surgery_facts.*、events.label、catheters.status_text）只存原文；未知=显式 null（surgery_facts.jejunum_cm/ileum_cm、daily_records.record_date、screenings.last_done_date），无空串冒充。
4. **版本链**：surgery_facts / pn_regimens 以 version + in_use 表达「更正=新增版本」；旧版本保留可查（IP8）。
5. **私密**：可写表统一 private 列（记录级/版本级），life_records.visibility 三出口过滤键（Q35/Q36）。
6. **无判定列**：无诊断、无风险分级、无活动性评分、无疗效应答；派生值（可比组、差值、术后第 N 天）读时算（Q38/Q39）。
7. **分类不进趋势**：metric_defs.category 只作目录分组；趋势图读 lab_values（不含 category 列）。

## 与 DEMO 唯一源的一致性

demo-data.js 的实体集合与 16 表一一对应（profiles/surgery_facts/pn_regimens/infusions/daily_records/lab_reports+lab_values+metric_defs/events/screenings/catheters/life_records/docs→documents/candidates→import_candidates/questions）；原型切换到开发版时数据层直接映射，不再双轨。
