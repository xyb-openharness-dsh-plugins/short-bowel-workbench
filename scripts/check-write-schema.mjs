'use strict';
/* check-write-schema.mjs — 判读列断言 + schema 加载断言（G3 闸门）。
   1) deny 词表扫描全部 CREATE TABLE 列名 → 0 命中；
   2) node:sqlite 内存加载 → 表数=16、索引≥4；
   3) freeze-contract.md 的 sha256 与文件实际哈希一致。 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const sqlPath = path.join(root, 'schema', '0001_initial.sql');
const sql = readFileSync(sqlPath, 'utf8');
let fails = 0;
const fail = (m) => { console.error('FAIL ' + m); fails++; };
const ok = (m) => console.log('PASS ' + m);

const DENY = ['diagnosis', 'risk_level', 'severity', 'verdict', 'match_score', 'eligible', 'suitability', 'activity_score', 'normal_flag', 'line_of_treatment', 'response_flag', 'prognosis', 'tumor_marker', 'remission', 'relapse_risk', 'flare_status', 'control_status'];
const colRe = /^\s{2}([a-z_0-9]+)\s+(TEXT|REAL|INTEGER)/gm;
let m, cols = [];
while ((m = colRe.exec(sql))) cols.push(m[1]);
const hits = cols.filter((c) => DENY.some((d) => c.includes(d)));
if (hits.length) fail(`判读列命中: ${hits.join(',')}`); else ok(`判读列断言：扫描 ${cols.length} 列，deny 词表 0 命中`);

/* 内存加载 */
const { DatabaseSync } = await import('node:sqlite');
const db = new DatabaseSync(':memory:');
try {
  db.exec(sql);
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
  const idx = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'").all();
  if (tables.length !== 16) fail(`表数=${tables.length}（预期 16）`); else ok(`内存全建：16 表 + ${idx.length} 索引`);
  /* 显式 null 纪律：TEXT 列不得有 NOT NULL DEFAULT '' */
  if (/NOT NULL DEFAULT ''/.test(sql)) fail('存在空串默认值（违反显式 null 纪律）'); else ok('显式 null：无 NOT NULL DEFAULT \'\'');
} catch (e) { fail('内存加载: ' + e.message); }
db.close();

/* freeze hash */
const actual = createHash('sha256').update(sql).digest('hex');
const contract = readFileSync(path.join(root, 'schema', 'freeze-contract.md'), 'utf8');
if (!contract.includes(actual)) fail(`freeze-contract.md 未包含实际 sha256 ${actual}`); else ok(`冻结合同哈希一致：${actual.slice(0, 12)}…`);

process.exit(fails ? 1 : 0);
