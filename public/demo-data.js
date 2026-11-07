'use strict';
/* demo-data.js — 小养宝 NutriPal 演示数据唯一源（v0.2.0）。
   全部为合成示例，不冒充真实病历；页面不写死任何数字，图表/卡片/日历/导出都读这里（Q12）。
   两套档案：A 刚确诊记录少、多处未知；B 长期随访、输液与化验都多（Q9）。
   覆盖要求（Q11）：零条 / 单条 / 多条 / 缺字段 / 未知日期 / 私密项 / 无原件——每套都有对应示例。 */
window.DEMO_BUILD = {
  version: '0.2.0', build: '2026-11-07', label: '合成示例 · 仅演示 · 未连接宿主'
};
window.DEMO = {
  /* —— 档案元数据 —— */
  profiles: {
    A: {
      id: 'A', name: '示例档案 A · 刚确诊', short: '档案 A', avatar: 'A',
      meta: '小肠切除术后 3 周 · 模拟 · 记录少',
      tag: '合成示例 A：刚出院，记录少，多处未知',
      anchor: '2026-10-16', anchorLabel: '手术日',
      root: '', // 未设置资料目录 → 对话未激活态
      full: false,
      stageState: '术后恢复期 · 出院小结 2026-10-24',
      unknownExample: '剩余回肠长度：出院小结未写明（未知值显式留空）'
    },
    B: {
      id: 'B', name: '示例档案 B · 长期随访', short: '档案 B', avatar: 'B',
      meta: '术后 3 年 · PN 依赖 · 模拟 · 记录多',
      tag: '合成示例 B：术后 3 年，输液与化验都多',
      anchor: '2023-06-12', anchorLabel: '手术日',
      root: '/Users/demo/Documents/NutriPal', // 演示路径
      full: true,
      stageState: '长期维持期 · 家庭肠外营养 · 2026-11 起',
      unknownExample: '2024-08-02 化验单未取得原件，据二次来源'
    }
  },

  /* —— 手术事实（医生原文版本链；A 未知值显式 null） —— */
  surgeryFacts: {
    A: [
      { id: 'sf-a1', version: 1, d: '2026-10-24', source: '出院小结 · 第 1 页（模拟）', doctor: '主治医生（模拟）', facts: { 切除范围: '大部分小肠切除（原文表述）', 剩余空肠长度_cm: null, 剩余回肠长度_cm: null, 回盲瓣: '保留（原文表述）', 结肠: '连续性保留（原文表述）', 造口: '暂未记录（未知）' } },
      { id: 'sf-a2', version: 2, d: '2026-10-28', source: '复诊记录 · 医生口述（模拟）', doctor: '主治医生（模拟）', facts: { 切除范围: '大部分小肠切除（原文表述）', 剩余空肠长度_cm: null, 剩余回肠长度_cm: null, 回盲瓣: '保留（原文表述）', 结肠: '连续性保留（原文表述）', 造口: '无造口（医生口述 10.28）' } }
    ],
    B: [
      { id: 'sf-b1', version: 1, d: '2023-06-12', source: '手术记录 · 第 2 页（模拟）', doctor: '手术医生（模拟）', facts: { 切除范围: '小肠大部切除 + 回盲部切除（原文表述）', 剩余空肠长度_cm: 120, 剩余回肠长度_cm: 30, 回盲瓣: '已切除（原文表述）', 结肠: '连续性保留（原文表述）', 造口: '无（原文表述）' } },
      { id: 'sf-b2', version: 2, d: '2024-05-20', source: '随访记录 · 医生口述（模拟）', doctor: '随访医生（模拟）', facts: { 切除范围: '小肠大部切除 + 回盲部切除（原文表述）', 剩余空肠长度_cm: 120, 剩余回肠长度_cm: 30, 回盲瓣: '已切除（原文表述）', 结肠: '连续性保留（原文表述）', 造口: '无（原文表述）', 补充: '代偿期评估：肠适应有进步（医生原话，模拟）' } }
    ]
  },

  /* —— 营养支持方案（版本链，不派生达标率） —— */
  pnRegimens: {
    A: [
      { id: 'rg-a1', version: 1, d: '2026-10-24', source: '出院小结 · 医嘱页（模拟）', freq: '每周 7 天', hours: 12, route: 'PICC', volume_ml: 1800, kcal: null, note: '热量未在出院小结写明（未知）' }
    ],
    B: [
      { id: 'rg-b1', version: 1, d: '2023-07-01', source: '出院医嘱（模拟）', freq: '每周 7 天', hours: 14, route: 'PICC', volume_ml: 2200, kcal: 1400, note: '初始方案' },
      { id: 'rg-b2', version: 2, d: '2024-09-15', source: '门诊调方（模拟）', freq: '每周 5 天', hours: 12, route: 'PICC', volume_ml: 2000, kcal: 1300, note: '医生调整：每周减 2 天' },
      { id: 'rg-b3', version: 3, d: '2026-03-02', source: '门诊调方（模拟）', freq: '每周 4 天', hours: 10, route: 'Port（输液港）', volume_ml: 1900, kcal: 1250, note: '改用输液港；方案变化只记录，不评价' }
    ]
  },

  /* —— 输液按次登记（日历与列表唯一源；A 记录少、B 90 天全量） —— */
  infusions: {
    A: [
      { id: 'in-a1', d: '2026-11-02', ml: 1800, hours: 12, route: 'PICC', src: '本人记录（模拟）' },
      { id: 'in-a2', d: '2026-11-04', ml: 1800, hours: 12, route: 'PICC', src: '本人记录（模拟）' },
      { id: 'in-a3', d: '2026-11-06', ml: null, hours: null, route: 'PICC', src: '家属代记（模拟）', note: '量未记（缺字段示例）' }
    ],
    B: (function () {
      const out = []; let s = 1; // 伪随机（固定种子，保证每次打开一致）；366 天窗口支撑 MT14 压测（100+ 记录）
      for (let i = 365; i >= 0; i--) {
        const dt = new Date(Date.parse('2026-11-06T00:00:00') - i * 86400000);
        const d = dt.toISOString().slice(0, 10);
        const wd = dt.getDay();
        const on = (wd === 1 || wd === 3 || wd === 5 || (wd === 6 && s % 2 === 0));
        if (on) { s = (s * 7919) % 9973; out.push({ id: 'in-b' + i, d, ml: 1900 + (s % 5) * 20, hours: 10 + (s % 2), route: s % 7 === 0 ? 'PICC（历史）' : 'Port（输液港）', src: '本人记录（模拟）' }); }
      }
      return out;
    })()
  },

  /* —— 体重 / 出入量（按日；Q11 覆盖：B 有未知日期单条） —— */
  daily: {
    A: [
      { id: 'dr-a1', d: '2026-10-28', weight_kg: 52.4, urine_ml: 1400, stool_times: 4, src: '本人记录（模拟）' }
    ],
    B: [
      { id: 'dr-b1', d: '2026-08-10', weight_kg: 49.8, urine_ml: 1500, stool_times: 3, src: '本人记录（模拟）' },
      { id: 'dr-b2', d: '2026-09-10', weight_kg: 50.2, urine_ml: null, stool_times: 2, src: '本人记录（模拟）', note: '尿量漏记' },
      { id: 'dr-b3', d: null, weight_kg: 50.6, urine_ml: 1600, stool_times: 3, src: '家属代记（模拟）', note: '日期忘了填（未知日期示例）' },
      { id: 'dr-b4', d: '2026-10-10', weight_kg: 51.0, urine_ml: 1550, stool_times: 2, src: '本人记录（模拟）' },
      { id: 'dr-b5', d: '2026-11-05', weight_kg: 51.3, urine_ml: 1500, stool_times: 2, src: '本人记录（模拟）' }
    ]
  },

  /* —— 化验：按「指标 + 方法 + 单位 + 机构」可比组；跨方法不连线不合并（C/MT 口径） —— */
  labCats: [
    ['电解质与矿物', '#2f7d6b'], ['肝功能（PNALD 监测）', '#a85a3c'], ['肾功能', '#3f6f7e'], ['营养与微量营养素', '#7c6aae']
  ],
  labMetrics: {
    mg: { name: '血镁', unit: 'mmol/L', cat: '电解质与矿物', color: '#2f7d6b', dec: 2, note: '同方法可比；不同机构参考区间不同，不合并', groups: { '镁·比色法·甲医院': '#2f7d6b', '镁·ISE 法·乙医院': '#5b8a97' } },
    k: { name: '血钾', unit: 'mmol/L', cat: '电解质与矿物', color: '#4c9483', dec: 2, note: '同方法可比', groups: { '镁·比色法·甲医院': '#2f7d6b', '镁·ISE 法·乙医院': '#5b8a97' } },
    alt: { name: 'ALT', unit: 'U/L', cat: '肝功能（PNALD 监测）', color: '#a85a3c', dec: 0, note: 'PNALD 监测项目之一；是否异常归医生判断', groups: { 'ALT·速率法·甲医院': '#a85a3c' } },
    ggt: { name: 'GGT', unit: 'U/L', cat: '肝功能（PNALD 监测）', color: '#c07a5c', dec: 0, note: '胆汁淤积相关监测项，仅记录', groups: { 'ALT·速率法·甲医院': '#a85a3c' } },
    cr: { name: '肌酐', unit: 'μmol/L', cat: '肾功能', color: '#3f6f7e', dec: 0, note: '不与 eGFR 混算', groups: { 'ALT·速率法·甲医院': '#a85a3c' } },
    alb: { name: '白蛋白', unit: 'g/L', cat: '营养与微量营养素', color: '#7c6aae', dec: 1, note: '营养状态参考项之一，仅回顾', groups: { 'ALT·速率法·甲医院': '#a85a3c' } },
    b12: { name: '维生素 B12', unit: 'pmol/L', cat: '营养与微量营养素', color: '#9a86c4', dec: 0, note: '回肠切除后监测项（医生提醒过，模拟）', groups: { 'ALT·速率法·甲医院': '#a85a3c' } },
    vd: { name: '25-羟维生素 D', unit: 'nmol/L', cat: '营养与微量营养素', color: '#b5652f', dec: 1, note: '骨健康监测项；单点示例', groups: { 'ALT·速率法·甲医院': '#a85a3c' } }
  },
  labValues: {
    A: [
      { id: 'lv-a1', code: 'mg', d: '2026-10-25', v: 0.68, group: '镁·比色法·甲医院', report: '检验报告单 · 甲医院（模拟）' },
      { id: 'lv-a2', code: 'k', d: '2026-10-25', v: 3.4, group: '镁·ISE 法·乙医院', report: '检验报告单 · 乙医院（模拟）' },
      { id: 'lv-a3', code: 'alb', d: '2026-10-25', v: 34.2, group: 'ALT·速率法·甲医院', report: '检验报告单 · 甲医院（模拟）' }
    ],
    B: [
      { id: 'lv-b1', code: 'mg', d: '2024-02-10', v: 0.62, group: '镁·比色法·甲医院', report: '检验报告单 · 甲医院（模拟）' },
      { id: 'lv-b2', code: 'mg', d: '2024-08-02', v: 0.58, group: '镁·比色法·甲医院', report: '未取得原件，据二次来源（模拟）' },
      { id: 'lv-b3', code: 'mg', d: '2025-03-14', v: 0.66, group: '镁·比色法·甲医院', report: '检验报告单 · 甲医院（模拟）' },
      { id: 'lv-b4', code: 'mg', d: '2025-09-20', v: 0.71, group: '镁·比色法·甲医院', report: '检验报告单 · 甲医院（模拟）' },
      { id: 'lv-b5', code: 'mg', d: '2026-05-11', v: 0.75, group: '镁·比色法·甲医院', report: '检验报告单 · 甲医院（模拟）' },
      { id: 'lv-b6', code: 'mg', d: '2026-10-20', v: 0.72, group: '镁·比色法·甲医院', report: '检验报告单 · 甲医院（模拟）' },
      { id: 'lv-b7', code: 'mg', d: '2026-10-20', v: 0.70, group: '镁·ISE 法·乙医院', report: '检验报告单 · 乙医院（模拟）' },
      { id: 'lv-b8', code: 'mg', d: '2025-02-11', v: 0.66, group: '镁·ISE 法·乙医院', report: '检验报告单 · 乙医院（模拟）' },
      { id: 'lv-b9', code: 'k', d: '2026-10-20', v: 3.6, group: '镁·ISE 法·乙医院', report: '检验报告单 · 乙医院（模拟）' },
      { id: 'lv-b10', code: 'alt', d: '2024-02-10', v: 38, group: 'ALT·速率法·甲医院', report: '检验报告单 · 甲医院（模拟）' },
      { id: 'lv-b11', code: 'alt', d: '2025-03-14', v: 52, group: 'ALT·速率法·甲医院', report: '检验报告单 · 甲医院（模拟）' },
      { id: 'lv-b12', code: 'alt', d: '2026-05-11', v: 44, group: 'ALT·速率法·甲医院', report: '检验报告单 · 甲医院（模拟）' },
      { id: 'lv-b13', code: 'ggt', d: '2026-05-11', v: 88, group: 'ALT·速率法·甲医院', report: '检验报告单 · 甲医院（模拟）' },
      { id: 'lv-b14', code: 'cr', d: '2026-05-11', v: 58, group: 'ALT·速率法·甲医院', report: '检验报告单 · 甲医院（模拟）' },
      { id: 'lv-b15', code: 'b12', d: '2026-05-11', v: 210, group: 'ALT·速率法·甲医院', report: '检验报告单 · 甲医院（模拟）' },
      { id: 'lv-b16', code: 'vd', d: '2026-05-11', v: 41.0, group: 'ALT·速率法·甲医院', report: '检验报告单 · 甲医院（模拟）' },
      { id: 'lv-b17', code: 'alb', d: '2026-10-20', v: 38.6, group: 'ALT·速率法·甲医院', report: '检验报告单 · 甲医院（模拟）' }
    ]
  },

  /* —— 事件（时间线泳道：输液 / 并发症 / 调药 / 就诊 / 检查） —— */
  events: {
    A: [
      { id: 'ev-a1', d: '2026-10-16', lane: 'tx', kind: '手术', label: '手术（模拟）', src: '出院小结（模拟）' },
      { id: 'ev-a2', d: '2026-10-24', lane: 'visit', kind: '出院', label: '出院，带 PN 方案', src: '出院小结（模拟）' },
      { id: 'ev-a3', d: '2026-10-28', lane: 'visit', kind: '就诊', label: '首次复诊', src: '复诊记录（模拟）' }
    ],
    B: [
      { id: 'ev-b1', d: '2023-06-12', lane: 'tx', kind: '手术', label: '小肠大部切除（模拟）', src: '手术记录（模拟）' },
      { id: 'ev-b2', d: '2024-01-15', lane: 'comp', kind: '并发症', label: '导管相关血流感染，住院抗感染（模拟）', src: '出院小结（模拟）' },
      { id: 'ev-b3', d: '2024-09-15', lane: 'rx', kind: '调药', label: 'PN 减为每周 5 天（医生调整，模拟）', src: '门诊记录（模拟）' },
      { id: 'ev-b4', d: '2025-06-08', lane: 'comp', kind: '并发症', label: '堵管一次，溶栓处理（模拟）', src: '护理记录（模拟）' },
      { id: 'ev-b5', d: '2026-03-02', lane: 'rx', kind: '调药', label: '改输液港 + 每周 4 天（模拟）', src: '门诊记录（模拟）' },
      { id: 'ev-b6', d: '2026-09-30', lane: 'check', kind: '检查', label: '腹部超声（PNALD 监测，模拟）', src: '超声报告（模拟）' },
      { id: 'ev-b7', d: '2026-10-18', lane: 'visit', kind: '就诊', label: '季度随访门诊', src: '门诊记录（模拟）' }
    ]
  },

  /* —— 导管与筛查 —— */
  catheters: {
    A: [
      { id: 'ca-a1', type: 'PICC', placed: '2026-10-17', side: '右上臂（模拟）', status: '在用', note: '置管日期以护理记录为准（模拟）' }
    ],
    B: [
      { id: 'ca-b1', type: 'PICC', placed: '2023-07-01', side: '右上臂（模拟）', status: '已拔除（2026-03-01）', note: '使用约 2 年 8 个月' },
      { id: 'ca-b2', type: 'Port（输液港）', placed: '2026-03-01', side: '右胸前（模拟）', status: '在用', note: '现用通路' }
    ]
  },
  screenings: {
    A: [
      { id: 'sc-a1', item: '肝功能（PNALD 监测）', last: '2026-10-25', next_hint: '医生安排（未记录具体时间）', src: '出院小结（模拟）' },
      { id: 'sc-a2', item: '电解质（含血镁）', last: '2026-10-25', next_hint: '医生安排（未记录具体时间）', src: '出院小结（模拟）' }
    ],
    B: [
      { id: 'sc-b1', item: '肝功能（PNALD 监测）', last: '2026-10-20', next_hint: '下季度随访时（模拟）', src: '门诊记录（模拟）' },
      { id: 'sc-b2', item: '腹部超声（肝胆）', last: '2026-09-30', next_hint: '下季度随访时（模拟）', src: '超声报告（模拟）' },
      { id: 'sc-b3', item: '肾功能', last: '2026-05-11', next_hint: '医生安排（未记录具体时间）', src: '检验报告（模拟）' },
      { id: 'sc-b4', item: '骨密度（DXA）', last: null, next_hint: '未做过，可问医生是否需要（模拟）', src: '—' },
      { id: 'sc-b5', item: '维生素 B12 / 25-羟维生素 D', last: '2026-05-11', next_hint: '医生安排（未记录具体时间）', src: '检验报告（模拟）' }
    ]
  },

  /* —— 生活与心理（双主体；私密项 Q11） —— */
  life: {
    A: [],
    B: [
      { id: 'li-b1', d: '2026-09-05', owner: 'patient', text: '每周 4 个晚上要连着输液，朋友约饭基本都推了。', visibility: 'shared' },
      { id: 'li-b2', d: '2026-09-21', owner: 'caregiver', text: '配液和冲管都是我在弄，她睡着了我才敢收工具。', visibility: 'private' },
      { id: 'li-b3', d: '2026-10-12', owner: 'patient', text: '这周试了一次白天输液，出门前准备了两小时。', visibility: 'shared' }
    ]
  },

  /* —— 文档 / 候选 / 问题 —— */
  docs: {
    A: [
      { id: 'd-a1', name: '出院小结 · 术后（模拟）', date: '2026-10-24', type: '住院', status: '已核对' },
      { id: 'd-a2', name: '检验报告单 · 甲医院（模拟）', date: '2026-10-25', type: '检验', status: '已核对' },
      { id: 'd-a3', name: '复诊记录（模拟）', date: '2026-10-28', type: '门诊', status: '待核对' }
    ],
    B: [
      { id: 'd-b1', name: '手术记录（模拟）', date: '2023-06-12', type: '手术', status: '已核对' },
      { id: 'd-b2', name: '出院小结 2024-01（模拟）', date: '2024-01-20', type: '住院', status: '已核对' },
      { id: 'd-b3', name: '检验报告单 · 甲医院（模拟）', date: '2026-10-20', type: '检验', status: '已核对' },
      { id: 'd-b4', name: '超声报告（模拟）', date: '2026-09-30', type: '检查', status: '待核对' },
      { id: 'd-b5', name: '门诊记录（模拟）', date: '2026-10-18', type: '门诊', status: '已核对' }
    ]
  },
  candidates: {
    A: [
      { id: 'c-a1', name: '剩余空肠长度', value: '出院小结未写明', source: '出院小结 · 第 1 页（模拟）', status: 'needs_review' },
      { id: 'c-a2', name: 'PN 热量目标', value: '医嘱未含热量值', source: '出院小结 · 医嘱页（模拟）', status: 'candidate' },
      { id: 'c-a3', name: '下次复诊日期', value: '2026-11-20（复诊预约单）', source: '复诊预约单（模拟）', status: 'candidate' }
    ],
    B: [
      { id: 'c-b1', name: '2024-08-02 血镁来源', value: '0.58 mmol/L · 未取得原件，据二次来源', source: '随访整理稿（模拟）', status: 'needs_review' }
    ]
  },
  questions: {
    A: [
      { id: 'q-a1', text: '下次化验要查哪些项目？出院小结里没有列全。', source: '本人保留（模拟）', selected: true, kind: 'fact' },
      { id: 'q-a2', text: '我感觉最近特别容易渴，这正常吗？', source: '本人看法 · 2026-11-05（模拟）', selected: true, kind: 'view' }
    ],
    B: [
      { id: 'q-b1', text: '这个月输液日从 5 天减到 4 天后，体重稳住了吗？', source: '营养登记衍生 · 本人保留（模拟）', selected: true, kind: 'fact' },
      { id: 'q-b2', text: '输液港多久做一次维护？去哪里维护？', source: '本人保留（模拟）', selected: true, kind: 'fact' },
      { id: 'q-b3', text: '肝功能那两项最近有点波动，需要加做什么检查吗？', source: '本人看法 · 2026-10-18（模拟）', selected: true, kind: 'view' }
    ]
  },

  /* —— 资源（来源标注；全为演示占位，正式版经 M4 核数） —— */
  resources: [
    { id: 'r1', name: '特医食品 / 肠内营养制剂', desc: '注册信息以国家市场监督管理总局特殊食品信息查询平台为准', src: '官方查询入口 · 演示占位', kind: '官方' },
    { id: 'r2', name: '病友组织 · 肠康荟（演示占位）', desc: 'SBS 患者关爱中心；正式版按 M4 核数后收录', src: '用户研究台账 · 演示占位', kind: '社群' },
    { id: 'r3', name: '慢特病报销（地方口径）', desc: '各地目录不同；未核实到全国口径，以当地医保局为准', src: '医保台账 · 演示占位', kind: '医保' }
  ],

  /* —— 疾病概要（36 号四段；只属第②层解释，非肿瘤出口句「按受累器官与病情轻重排列」） —— */
  primer: {
    title: '短肠综合征是什么？',
    sections: [
      { h: '定义', body: '短肠综合征（Short Bowel Syndrome）通常指因小肠被广泛切除后，剩余肠道不足以吸收足够的营养与水分，需要医疗营养支持的一段状态。这里只做名词解释，不做个体判断。', src: '来源：《86 个罕见病病种诊疗指南（2025 年版）》#73（官方 PDF，2025-07 发布）· 未取得章节逐字原文，据题录整理' },
      { h: '医学资料规范和指南情况', body: '国内有罕见病目录与配套诊疗指南（2025 年版）；国际上有 ESPEN 家庭肠外营养实践指南（Clinical Nutrition 2023）。本工作台的监测字段（电解质、肝功能、微量元素等）按这些指南的「内容边界」整理，阈值一律【待核】。', src: '来源：NHC 官方 PDF（已实抓）· ESPEN practical guideline: Home parenteral nutrition（已实抓）' },
      { h: '治疗全景', body: '按受累器官与病情轻重排列，个体方案以医生为准：营养支持（肠外/肠内/口服）、肠康复、并发症处理（导管、肝胆、肾、骨）、部分患者经评估考虑小肠移植。本段是名词地图，不代表任何一项适合你，需要问你的医生。', src: '来源：同上两份指南的章节名 · 未取得原件处据二次来源' },
      { h: '发展趋势', body: '趋势只写已发生的事实并带时间：家庭肠外营养管理在长期化、居家化；个别药物在中国大陆的获批状态以 NMPA 官方信息为准（本工作台 2026-11-07 未在线核验成功，标【待核】）。', src: '来源：医学台账（research/medical）· NMPA 核验失败记录在案' }
    ]
  }
};
