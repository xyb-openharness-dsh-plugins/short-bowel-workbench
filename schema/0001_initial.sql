-- 0001_initial.sql — 小养宝 NutriPal（短肠综合征）初始 schema · G3 候选
-- 纪律：ORDER BY rowid 语义（不依赖自增 id 排序展示）、显式 null（不用空串冒充缺失）、
--       in_use 版本链、分节 *_title、分类不进趋势、无判定列（diagnosis/risk_level 等禁止入库）。
-- 构成：档案 2 + 指标 3 + 通用 7 + SBS 专属 1 + 导入 3 = 16 表。

/* ---------- 档案 2 ---------- */

CREATE TABLE profiles (
  id INTEGER PRIMARY KEY,
  display_name TEXT NOT NULL,
  avatar_char TEXT,
  anchor_date TEXT,              -- 手术日锚点（第 0 天），null = 待初始化
  anchor_label TEXT,             -- 锚点说明（如「手术日」），照抄医生原文
  root_path TEXT,                -- 患者资料目录；null = 未设置（主目录/桌面/下载根/tmp 拒绝）
  memo TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE TABLE surgery_facts (
  id INTEGER PRIMARY KEY,
  profile_id INTEGER NOT NULL REFERENCES profiles(id),
  version INTEGER NOT NULL,             -- 更正 = 新增版本，旧行 in_use=0 保留
  in_use INTEGER NOT NULL DEFAULT 1,    -- 1=当前版本 0=历史版本（ORDER BY rowid 可回查）
  fact_date TEXT,
  source_kind TEXT,                     -- discharge_summary | surgery_note | doctor_words | patient_entry
  source_doc_id INTEGER REFERENCES documents(id),
  doctor_name TEXT,
  private INTEGER NOT NULL DEFAULT 0,   -- 版本级私密标记（Q36）
  -- 字段语境：全部为医生原文口径；null 显式表示未知，不用空串
  resection_desc TEXT,                  -- 切除范围（原文）
  jejunum_cm REAL,                      -- 剩余空肠长度 cm（未知=null）
  ileum_cm REAL,                        -- 剩余回肠长度 cm（未知=null）
  ileocecal_valve TEXT,                 -- 回盲瓣状态（原文）
  colon_status TEXT,                    -- 结肠连续性（原文）
  stoma_status TEXT,                    -- 造口（原文）
  extra_text TEXT,                      -- 补充原文
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

/* ---------- 指标 3 ---------- */

CREATE TABLE lab_reports (
  id INTEGER PRIMARY KEY,
  profile_id INTEGER NOT NULL REFERENCES profiles(id),
  report_date TEXT,                     -- null = 未知日期（显式，不猜）
  org_name TEXT,                        -- 机构
  source_doc_id INTEGER REFERENCES documents(id),
  has_original INTEGER NOT NULL DEFAULT 0,  -- 0=未取得原件，据二次来源（界面必须显示）
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE lab_values (
  id INTEGER PRIMARY KEY,
  profile_id INTEGER NOT NULL REFERENCES profiles(id),
  report_id INTEGER REFERENCES lab_reports(id),
  metric_code TEXT NOT NULL,            -- 指向 metric_defs.code
  value_num REAL,                       -- 数值（文本结果存 value_text，两者至少一个非 null）
  value_text TEXT,
  unit TEXT,
  method TEXT,                          -- 方法（可比组第一键）
  org_name TEXT,                        -- 机构（可比组第二键）
  ref_text TEXT,                        -- 化验单原文参考区间（照抄，不判读）
  sampled_at TEXT,                      -- 采样时间，null=未知
  private INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
-- 可比组 = (metric_code, method, org_name)：读时算，不落库派生列

CREATE TABLE metric_defs (
  code TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  unit TEXT,
  category TEXT NOT NULL,               -- 分类只用于目录分组，不进趋势（趋势读 lab_values）
  dec_digits INTEGER NOT NULL DEFAULT 1,
  note TEXT,                            -- 口径说明（如「同方法可比；不同机构不合并」）
  sort_order INTEGER NOT NULL DEFAULT 0,
  in_use INTEGER NOT NULL DEFAULT 1
);

/* ---------- 通用 7 ---------- */

CREATE TABLE pn_regimens (              -- 营养支持方案（版本链）
  id INTEGER PRIMARY KEY,
  profile_id INTEGER NOT NULL REFERENCES profiles(id),
  version INTEGER NOT NULL,
  in_use INTEGER NOT NULL DEFAULT 1,
  effective_date TEXT,
  freq_days_per_week INTEGER,           -- 每周输液天数（null=未知）
  hours_per_session REAL,               -- 单次时长 h
  route TEXT,                           -- PICC | Port | CVC | 其他（原文）
  volume_ml REAL,
  kcal REAL,
  source_kind TEXT,
  source_doc_id INTEGER REFERENCES documents(id),
  private INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE infusions (                -- 输液按次登记（输液日历与登记表唯一源）
  id INTEGER PRIMARY KEY,
  profile_id INTEGER NOT NULL REFERENCES profiles(id),
  infusion_date TEXT NOT NULL,
  volume_ml REAL,                       -- null=量未记（缺字段显式）
  hours REAL,
  route TEXT,
  regimen_id INTEGER REFERENCES pn_regimens(id),
  recorder TEXT,                        -- 本人 | 家属（照护者）
  source_kind TEXT,                     -- manual | ai_candidate | import
  private INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE daily_records (            -- 出入量 / 体重（按日；日期可 null=未知日期）
  id INTEGER PRIMARY KEY,
  profile_id INTEGER NOT NULL REFERENCES profiles(id),
  record_date TEXT,                     -- null=未知日期（界面显示「日期未知」）
  weight_kg REAL,
  urine_ml REAL,
  stool_times INTEGER,
  intake_ml REAL,
  recorder TEXT,
  source_kind TEXT,
  private INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE events (                   -- 事件泳道：用药/就诊/检查/并发症/调药/手术
  id INTEGER PRIMARY KEY,
  profile_id INTEGER NOT NULL REFERENCES profiles(id),
  event_date TEXT,
  lane TEXT NOT NULL,                   -- rx | comp | visit | check | tx（泳道键，不做医学分级）
  kind TEXT,                            -- 展示名（照抄来源）
  label TEXT NOT NULL,                  -- 事实描述
  source_kind TEXT,
  source_doc_id INTEGER REFERENCES documents(id),
  private INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE screenings (               -- 并发症筛查节奏（登记与提醒，不判定）
  id INTEGER PRIMARY KEY,
  profile_id INTEGER NOT NULL REFERENCES profiles(id),
  item_title TEXT NOT NULL,             -- 分节标题语义（*_title：只存展示名）
  last_done_date TEXT,                  -- null=未做过
  next_hint TEXT,                       -- 下次提示（医生原文或「未记录」；不给指南推算间隔）
  section_title TEXT,                   -- 分节（如「肝胆」「骨健康」）
  source_kind TEXT,
  private INTEGER NOT NULL DEFAULT 0,
  in_use INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE life_records (             -- 生活与心理（双主体；私密默认开）
  id INTEGER PRIMARY KEY,
  profile_id INTEGER NOT NULL REFERENCES profiles(id),
  record_date TEXT,
  owner TEXT NOT NULL DEFAULT 'patient',-- patient | caregiver（双主体并列不平均）
  body TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'private', -- private | shared；私密改写的问题同算私密
  private INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE questions (                -- 复诊问题清单
  id INTEGER PRIMARY KEY,
  profile_id INTEGER NOT NULL REFERENCES profiles(id),
  body TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'fact',    -- fact | view（「看法」只作信息不当结论）
  selected INTEGER NOT NULL DEFAULT 0,
  source_label TEXT,
  private INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

/* ---------- SBS 专属 1 ---------- */

CREATE TABLE catheters (                -- 中心静脉导管档案（SBS 特有）
  id INTEGER PRIMARY KEY,
  profile_id INTEGER NOT NULL REFERENCES profiles(id),
  catheter_type TEXT,                   -- PICC | Port | CVC（原文）
  placed_date TEXT,
  removed_date TEXT,                    -- null=在用
  site_text TEXT,                       -- 置管位置（原文）
  status_text TEXT,                     -- 在用/已拔除（原文，不判定）
  source_kind TEXT,
  private INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  in_use INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

/* ---------- 导入 3 ---------- */

CREATE TABLE documents (
  id INTEGER PRIMARY KEY,
  profile_id INTEGER NOT NULL REFERENCES profiles(id),
  file_name TEXT NOT NULL,
  file_path TEXT,                       -- 相对资料根目录；不存绝对路径进库
  doc_type TEXT,                        -- 住院 | 门诊 | 手术 | 检验 | 检查 | 其他
  doc_date TEXT,
  parse_status TEXT NOT NULL DEFAULT 'pending', -- pending | parsed | failed | skipped
  parse_engine TEXT,                    -- local | mineru_flash | mineru_pipeline
  sha256 TEXT,
  private INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE import_jobs (
  id INTEGER PRIMARY KEY,
  profile_id INTEGER NOT NULL REFERENCES profiles(id),
  doc_id INTEGER REFERENCES documents(id),
  status TEXT NOT NULL DEFAULT 'queued',-- queued | running | done | failed
  error_text TEXT,                      -- 失败原因留痕（FAILED 如实记）
  started_at TEXT,
  finished_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE import_candidates (        -- 解析候选：核对前不入事实层（MT10/IP9）
  id INTEGER PRIMARY KEY,
  profile_id INTEGER NOT NULL REFERENCES profiles(id),
  job_id INTEGER REFERENCES import_jobs(id),
  target_table TEXT NOT NULL,           -- 建议写入的事实表
  field_name TEXT NOT NULL,
  candidate_value TEXT,                 -- null=未解析出（如实）
  source_quote TEXT,                    -- 原文摘录（逐字）
  status TEXT NOT NULL DEFAULT 'candidate', -- candidate | accepted | rejected | needs_review
  private INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_lab_values_profile_metric ON lab_values(profile_id, metric_code);
CREATE INDEX idx_infusions_profile_date ON infusions(profile_id, infusion_date);
CREATE INDEX idx_events_profile_lane ON events(profile_id, lane);
CREATE INDEX idx_daily_profile_date ON daily_records(profile_id, record_date);
