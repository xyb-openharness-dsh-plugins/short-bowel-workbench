'use strict';
/* primer-data.js — 疾病概要数据（36 号家族 DP 合同，v0.2.2）。
   v0.2.2：结构对齐家族参考实现 assets/patterns/disease-primer.js
   （brand/name/en/updated + sections[{id,title,intro,points,groups,table,sources}]）。
   此前 v0.2.1 的「?」按钮存在、面板能开，但 DOM 合同不是 .dp-overlay 系——家族探针
   probe-disease-primer.mjs 打过来必挂（正是「按钮在、DP 模块没实现」的家族两连坑，L81）。
   口径：第②层解释；未取得原件处如实标注并给二次来源链接；趋势段只写已发生事实。 */
window.DISEASE_PRIMER = {
  brand: '小养宝 NutriPal',
  name: '短肠综合征',
  en: 'Short Bowel Syndrome（SBS）',
  updated: '2026-11-08',
  sections: [
    {
      id: 'definition',
      title: '定义',
      intro: '短肠综合征通常指小肠被广泛切除（或因病变失去功能）后，剩余肠道不足以吸收足够的营养与水分，需要医疗营养支持的一段状态。这里只做名词解释，不做个体判断。',
      points: [
        '肠衰竭的上位概念：肠道吸收功能下降到「口服/常规肠内营养维持不了健康」的程度，短肠综合征是最常见的原因之一。',
        '关键事实因人而异：剩余小肠长度、回盲瓣是否保留、结肠是否连续——这些是医生在病历里写的口径，本台只照抄不推断。',
        '本页数据为合成示例与公开资料整理，不可作为临床依据。'
      ],
      sources: [
        { org: '国家卫生健康委员会', doc: '《86 个罕见病病种诊疗指南（2025 年版）》#73 短肠综合征', version: '2025-07 发布', original: true, kind: 'pdf', url: 'https://www.nhc.gov.cn/yzygj/c100068/202507/5b3f41180a42465eb9eec34597bacaf2/files/86个罕见病病种诊疗指南（2025年版）-20250709181724664.pdf', note: 'PDF 字体子集编码，章节逐字原文未抽取，据题录整理' }
      ]
    },
    {
      id: 'evidence',
      title: '医学资料规范和指南情况',
      intro: '本台出现的「该监测什么、随访节奏一般怎样」都应能追到下面某一份文件；未取得原件的如实标注，不假装看过。',
      table: {
        head: ['机构', '文件', '版本 / 年份', '原件', '本台的用途'],
        rows: [
          ['国家卫健委', '《86 个罕见病病种诊疗指南（2025 年版）》#73', '2025-07',
            { text: '已取得：官方 PDF（2026-11-07 实抓，HTTP 200）', kind: 'pdf', url: 'https://www.nhc.gov.cn/yzygj/c100068/202507/5b3f41180a42465eb9eec34597bacaf2/files/86个罕见病病种诊疗指南（2025年版）-20250709181724664.pdf' },
            '定义、监测项目集与随访内容边界'],
          ['ESPEN', 'Practical guideline: Home parenteral nutrition', 'Clinical Nutrition 2023',
            { text: '已取得：官方 PDF（2026-11-07 实抓，HTTP 200）', kind: 'pdf', url: 'https://www.espen.org/files/ESPEN-Guidelines/ESPEN_practical_guideline_Home_parenteral_nutrition.pdf' },
            '家庭肠外营养管理的国际内容边界'],
          ['NMPA', 'GLP-2 类药物（替度格鲁肽）中国获批状态', '—',
            { text: '未取得原件', nolink: true, note: '官网反爬（HTTP 412）未在线核验，一切以 NMPA 官方信息为准' },
            '不引用其条文；趋势段只写「未核验成功，标【待核】」'],
          ['ClinicalTrials.gov', 'SBS 试验登记快照', '2026-11-07 采集',
            { text: '已取得：API 快照（185 条，本台 research/short-bowel）', kind: 'fulltext', url: 'https://clinicaltrials.gov/search?cond=short+bowel+syndrome' },
            '试验线索台账，不做入组资格或疗效判读']
        ]
      },
      points: [
        '指南给的是「通常怎么做」，不是「你该怎么做」；版本号必须写清。',
        '本台所有阈值与求助短语均【待核】，未过临床审核。'
      ],
      sources: [
        { org: 'ESPEN', doc: 'Practical guideline: Home parenteral nutrition', version: 'Clinical Nutrition 2023', original: true, kind: 'pdf', url: 'https://www.espen.org/files/ESPEN-Guidelines/ESPEN_practical_guideline_Home_parenteral_nutrition.pdf' },
        { org: 'PubMed', doc: 'ESPEN HPN 指南题录（PMID 36796121）', version: '2023', original: true, kind: 'fulltext', url: 'https://pubmed.ncbi.nlm.nih.gov/36796121/' }
      ]
    },
    {
      id: 'landscape',
      title: '治疗全景',
      intro: '按受累器官与病情轻重排列，个体方案以医生为准；本段是名词地图，不代表任何一项适合你，需要问你的医生。',
      points: [
        '营养支持：肠外营养（静脉）、肠内营养（管饲）、口服营养补充与特医食品——以医生处方为准。',
        '肠康复：饮食结构调整与促进肠道适应的手段（医生口内的名词，本台只记录医生原文）。',
        '并发症处理：中心静脉导管并发症、肝胆（PNALD）、肾、骨健康、胆石——本台只登记与提醒，不判定。',
        '小肠移植：部分患者经评估会讨论到的选项（名词，不是建议）。',
        '本段是名词地图，不代表任何一项适合你，需要问你的医生。'
      ],
      sources: [
        { org: '国家卫健委', doc: '《86 个罕见病病种诊疗指南（2025 年版）》#73 章节名', version: '2025-07', original: true, kind: 'pdf', url: 'https://www.nhc.gov.cn/yzygj/c100068/202507/5b3f41180a42465eb9eec34597bacaf2/files/86个罕见病病种诊疗指南（2025年版）-20250709181724664.pdf', note: '本台未取得章节逐字原文，据题录整理' },
        { org: 'ESPEN', doc: 'HPN practical guideline 章节名', version: '2023', original: true, kind: 'pdf', url: 'https://www.espen.org/files/ESPEN-Guidelines/ESPEN_practical_guideline_Home_parenteral_nutrition.pdf' }
      ]
    },
    {
      id: 'trend',
      title: '发展趋势',
      intro: '趋势只写已发生的事实并带时间；不带展望性判断。',
      points: [
        '家庭肠外营养管理长期化、居家化：ESPEN 2023 家用肠外营养实践指南是这一方向的现行文件（版本与链接见上一段）。',
        '试验登记活跃度：ClinicalTrials.gov 2026-11-07 快照，SBS 相关登记 185 条、其中干预性 140 条、招募中 20 条（只记数字，不解读）。',
        'GLP-2 类药物在中国大陆的获批状态：本台 2026-11-07 在线核验未成功（NMPA 官网反爬），标【待核】；不写「已获批」也不写「未获批」。'
      ],
      sources: [
        { org: 'ClinicalTrials.gov', doc: 'API v2 快照（2026-11-07）', version: '2026-11-07', original: true, kind: 'fulltext', url: 'https://clinicaltrials.gov/search?cond=short+bowel+syndrome' },
        { org: 'NMPA', doc: '药品查询入口（本台未在线核验成功）', version: '—', secondaryUrl: 'https://www.nmpa.gov.cn/datasearch/home-index.html', note: '反爬 412；二次来源为企业新闻稿，不作为依据' }
      ]
    }
  ]
};
