/* 文档导入（MinerU 真实解析 → 候选字段）。
 *
 * 链路：POST /api/short-bowel/import（原始文件字节 + ?name=）→ MinerU v4 解析 → full.md
 *      → 本文件抽指标 → 写 documents + import_jobs + import_candidates（status='candidate'）
 *      → 前端逐条核对，接受后才算入档（核对前不入事实层，MT10/IP9）。
 *
 * 四条不可让步（家族契约，别为了"智能"放宽）：
 * 1. **只抄写不推测**：报告里没有的指标不生成候选；数值只做"字符串 → 数字"的搬运，
 *    单位换算、参考范围判定、缺失补齐全部不做。
 * 2. **候选不是记录**：解析只写 import_candidates，不碰 lab_values / daily_records。
 *    用户"接受"只改候选状态，不做"自动入库"。
 * 3. **参考范围不是结果**：`3.5–9.5` 这种两数一格的行整行放弃，不当成结果值。
 * 4. **`<0.5` 这类留原文**：值写成字符串，value_num 是 null，不四舍五入。
 *
 * MinerU 的已知坑（家族踩过）：整张表会被塞进一个单元格，必须**按位置对齐**
 * （第 i 个指标名配第 i 个数 / 第 i 个单位），数量不符整行放弃，不做模糊匹配。
 */

import { createMineruClient, MineruError } from './mineru.js';
import { profileIdByKey } from './readmodels.js';

export { MineruError };

/** SBS 指标字典：name/alias → metric_defs.code（与原型 labMetrics 的 8 项 + 体重对齐）。 */
export const LAB_DICT = [
  { key: 'mg', name: '血镁', aliases: ['血镁', '镁', 'Mg'], unit: 'mmol/L' },
  { key: 'k', name: '血钾', aliases: ['血钾', '钾', 'K'], unit: 'mmol/L' },
  { key: 'alt', name: 'ALT', aliases: ['ALT', '谷丙转氨酶'], unit: 'U/L' },
  { key: 'ggt', name: 'GGT', aliases: ['GGT', '谷氨酰转肽酶', 'γ-GT'], unit: 'U/L' },
  { key: 'cr', name: '肌酐', aliases: ['CREA', 'Cr', '肌酐'], unit: 'μmol/L' },
  { key: 'alb', name: '白蛋白', aliases: ['ALB', '白蛋白'], unit: 'g/L' },
  { key: 'b12', name: '维生素 B12', aliases: ['B12', '维生素B12', '维生素 B12'], unit: 'pmol/L' },
  { key: 'vd', name: '25-羟维生素 D', aliases: ['25-羟维生素D', '维生素D', '25(OH)D'], unit: 'nmol/L' },
  { key: 'wt', name: '体重', aliases: ['体重', 'WT'], unit: 'kg' },
];

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** 词边界匹配：中文别名用前后断言（\b 对中文无效）。 */
function aliasHit(text, alias) {
  const re = new RegExp(`(?<![A-Za-z0-9-])${escapeRe(alias)}(?![A-Za-z0-9-])`, 'i');
  return re.test(text);
}

/** 一行 markdown 表格 → 单元格数组。 */
function cells(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
}
const isTableLine = (line) => line.trim().startsWith('|') && line.trim().endsWith('|');
const isSeparator = (line) => /^\|[\s:|-]+\|$/.test(line.trim());

/** HTML 实体解码：MinerU 的表格单元格里 `<0.5` 会以 `&lt;0.5` 出现，不解码就当成"文字"丢掉。 */
function decodeEntities(text) {
  return String(text)
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
}

/** markdown 里的 HTML 表格先转成 `| a | b |`（MinerU 两种都会给）。 */
function normalizeHtmlTables(md) {
  if (!/<table/i.test(md)) return md;
  return md.replace(/<table[\s\S]*?<\/table>/gi, (block) => {
    const out = [];
    for (const row of block.match(/<tr[\s\S]*?<\/tr>/gi) || []) {
      const tds = [...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)]
        .map((m) => decodeEntities(m[1].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim());
      if (tds.length) out.push(`| ${tds.join(' | ')} |`);
    }
    return out.join('\n');
  });
}

const NUM_RE = /^(?:[<>≤≥]\s*)?-?\d+(?:\.\d+)?$/;
/** 取一个单元格里的"可抄写值"：纯数字 / <0.5 这类带比较符的原文。参考范围、两数一格一律不要。 */
function valueOf(cell) {
  const t = String(cell).replace(/\s/g, '');
  if (!t) return null;
  if (/^[<>≤≥]/.test(t)) {
    const m = t.match(/^([<>≤≥])(-?\d+(?:\.\d+)?)$/);
    return m ? { raw: `${m[1]}${m[2]}`, num: null } : null;
  }
  if (!NUM_RE.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? { raw: t, num: n } : null;
}

const UNIT_RE = /^(10\^?9\/L|×10\^?9\/L|g\/L|mg\/L|mmol\/L|μmol\/L|umol\/L|U\/mL|U\/L|mIU\/mL|ng\/mL|ng\/L|pmol\/L|nmol\/L|kg|%|fL|pg)$/i;

/**
 * 从 markdown 抽候选。
 * @returns {{candidates: Array, skipped: Array}} candidates 每项 {name, key, value, num, unit, line}
 */
export function extractLabCandidates(markdown) {
  const md = normalizeHtmlTables(String(markdown ?? ''));
  const candidates = [];
  const skipped = [];
  const seen = new Set();

  const lines = md.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    if (!isTableLine(lines[i])) { i += 1; continue; }

    /* 一整块连续表格：第一行是表头，分隔行（|---|---|）丢掉，其余是数据行。
       不要"看到分隔行就 continue"——那会把表头一起跳过，整张表被静默丢弃。 */
    const start = i;
    while (i < lines.length && isTableLine(lines[i])) i += 1;
    const blockLines = lines.slice(start, i).filter((l) => !isSeparator(l));
    if (blockLines.length < 2) continue;

    const header = cells(blockLines[0]);
    /* 只认「指标名 + 数值（+单位）」列；"参考范围/提示"那几列不碰。 */
    const idxName = header.findIndex((h) => /项目|指标|名称|检验|item|test/i.test(h));
    const idxVal = header.findIndex((h) => /结果|数值|value|result/i.test(h));
    const idxUnit = header.findIndex((h) => /单位|unit/i.test(h));
    if (idxName === -1 || idxVal === -1) continue;

    for (const line of blockLines.slice(1)) {
      const row = cells(line);
      const name = row[idxName] ?? '';
      const hit = LAB_DICT.find((d) => d.aliases.some((a) => aliasHit(name, a)));
      if (!hit) continue;
      const val = valueOf(row[idxVal] ?? '');
      if (!val) { skipped.push({ name, cell: row[idxVal] ?? '', reason: '不是单一数值（参考范围/文字）' }); continue; }
      const unitCell = idxUnit >= 0 ? String(row[idxUnit] ?? '').replace(/\s/g, '') : '';
      if (unitCell && !UNIT_RE.test(unitCell)) { skipped.push({ name, cell: unitCell, reason: '单位不认识' }); continue; }
      const dedupe = `${hit.key}:${val.raw}`;
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);
      candidates.push({
        key: hit.key,
        name: hit.name,
        value: val.num === null ? val.raw : val.num,
        unit: unitCell || hit.unit,
        line: start + 1,
      });
    }
  }
  return { candidates, skipped };
}

/** 报告日期：文件名或正文里的 YYYY-MM-DD / YYYY年M月D日。取不到就是 null（不猜今天）。 */
export function guessReportDate(text, fallback = null) {
  const m = String(text ?? '').match(/(20\d{2})[-/年.](\d{1,2})[-/月.](\d{1,2})/);
  if (!m) return fallback;
  const [_, y, mo, d] = m;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/**
 * 导入服务：把「文件 → MinerU → 候选」串起来，并负责落库（只写候选，不写记录）。
 * db 必须是已 migrate 的库；不传 client 时不联网（单测注入解析函数即可）。
 */
export class ImportService {
  constructor(db, { client = null, extract = extractLabCandidates } = {}) {
    this.db = db;
    this.client = client;
    this.extract = extract;
  }

  /** 纯解析：不落库，返回 {markdown, candidates, skipped, document}。 */
  async parse(buffer, { filename = 'document.pdf', profileKey = 'A', reportDate = null } = {}) {
    if (!Buffer.isBuffer(buffer) || !buffer.length) throw new MineruError('BAD_INPUT', '文件是空的');
    if (!this.client) throw new MineruError('NO_TOKEN', '没有可用的 MinerU 客户端（缺 token？）');

    const parsed = await this.client.parse({ bytes: buffer, filename });
    const markdown = parsed.markdown ?? '';
    const { candidates, skipped } = this.extract(markdown);
    const date = guessReportDate(filename) ?? guessReportDate(markdown) ?? reportDate ?? null;
    return {
      markdown,
      candidates,
      skipped,
      document: { profileKey, name: filename, date, type: '检验', status: '已核对', pages: parsed.pages ?? null },
    };
  }

  /** 落库：documents 一行 + import_jobs 一行 + import_candidates 逐条（status='candidate'）。同事务，失败整体回滚。 */
  record({ profileKey, document, candidates = [] }) {
    const profileId = profileIdByKey(this.db, profileKey);
    if (profileId === null) throw new Error(`没有这个档案：${profileKey}`);
    this.db.exec('BEGIN');
    try {
      const dr = this.db.prepare(`INSERT INTO documents
        (profile_id, file_name, doc_type, doc_date, parse_status, parse_engine, private)
        VALUES (?,?,?,?,?,?,0)`)
        .run(profileId, document.name, document.type ?? '检验', document.date ?? null, 'parsed', 'mineru_flash');
      const docId = Number(dr.lastInsertRowid);
      const jr = this.db.prepare(`INSERT INTO import_jobs
        (profile_id, doc_id, status, started_at, finished_at)
        VALUES (?,?,?,?,?)`)
        .run(profileId, docId, 'done', new Date().toISOString(), new Date().toISOString());
      const jobId = Number(jr.lastInsertRowid);
      const ins = this.db.prepare(`INSERT INTO import_candidates
        (profile_id, job_id, target_table, field_name, candidate_value, source_quote, status, private)
        VALUES (?,?,?,?,?,?,?,0)`);
      candidates.forEach((c, i) => {
        ins.run(profileId, jobId, 'lab_values', c.name, String(c.value),
          `${document.name}${document.date ? ` ${document.date}` : ''}`, 'candidate');
      });
      this.db.exec('COMMIT');
      return { documentId: docId, jobId, candidates: candidates.length };
    } catch (error) {
      try { this.db.exec('ROLLBACK'); } catch { /* 原始错误优先 */ }
      throw error;
    }
  }

  /** 接受一条候选：只改状态，不改记录（记录由用户另外确认；这里不做"自动入库"）。 */
  accept(profileKey, candidateId) {
    const profileId = profileIdByKey(this.db, profileKey);
    if (profileId === null) throw new Error(`没有这个档案：${profileKey}`);
    const numeric = Number(String(candidateId).replace(/^c-/, ''));
    const r = Number.isFinite(numeric)
      ? this.db.prepare('UPDATE import_candidates SET status = ? WHERE profile_id = ? AND id = ?')
        .run('accepted', profileId, numeric)
      : { changes: 0 };
    return { changed: r.changes };
  }
}

/** 默认客户端：从 MINERU_TOKEN / 密钥文件取 token（dsh/settings.js 的同一套查找顺序）。 */
export function createImportService(db, options = {}) {
  const client = options.client ?? createMineruClient(options);
  return new ImportService(db, { client });
}
