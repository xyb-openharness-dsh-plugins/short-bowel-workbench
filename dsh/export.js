/* 导出：把档案整理成一份「复诊摘要」markdown（给用户带去门诊，不是病历）。
 *
 * 三条硬约束：
 * 1. **私密生活记录不进导出**（三出口口径）：visibility=private 的记录默认不写。即便调用方
 *    传了 includePrivate 也只影响页面读模型，导出侧一律跳过——带出去被人看见的风险不在页面里。
 *    被剔除多少条以 excludedPrivate 数字如实标注，不粉饰成"没有"。
 * 2. **看法不是结论**：questions 里 kind='view' 的条目必须带「本人看法，不当结论」标注。
 * 3. **只抄不解释**：数值、日期、原文照抄；不写"建议/可能/需要注意"这类判读词
 *    （check-wording 会拦）。化验口径照抄 demo 唯一源：「不同方法不合并」。
 */

const LINE = '\n';

function section(title, body) {
  return body ? `${LINE}## ${title}${LINE}${LINE}${body}${LINE}` : '';
}

const fmt = (v, dec = 1) => (v === null || v === undefined ? '—' : Number(v).toFixed(dec));
const longDate = (d) => (d ? String(d).replace(/-/g, '.') : '日期未知');

/**
 * @param {object} profile readmodels.getProfile 的输出（life 已过私密过滤）
 * @param {object} opts
 * @param {number} [opts.excludedPrivate] 因私密被剔除的生活记录条数（如实标注）
 */
export function renderVisitSummaryMarkdown(profile, { generatedAt = null, version = null, excludedPrivate = 0 } = {}) {
  const p = profile?.profile ?? {};
  const infs = profile?.infusions ?? [];
  const rgs = profile?.pnRegimens ?? [];
  const latest = rgs.slice(-1)[0] ?? null;
  const daily = (profile?.daily ?? []).filter((v) => v.weight_kg !== null);
  const lastW = daily.slice(-1)[0] ?? null;
  const lastInf = infs.slice(-1)[0] ?? null;
  const qs = (profile?.questions ?? []).filter((q) => q.selected);
  const life = profile?.life ?? [];

  const out = [];
  out.push(`# 复诊摘要 · ${p.name ?? '未命名档案'}`);
  out.push('');
  out.push(`> 本摘要只汇总已记录的事实，不做解读；打印后可直接带给医生。${version ? `（小养宝 NutriPal v${version} 生成）` : ''}`);
  if (excludedPrivate > 0) out.push(`> 导出口：生活记录中私密 ${excludedPrivate} 条未包含。`);
  out.push('');

  const anchorGap = p.anchor ? Math.round((Date.now() - Date.parse(`${p.anchor}T00:00:00`)) / 86400000) : null;
  out.push('## 基本信息');
  out.push('');
  out.push(`- 手术日锚点：${longDate(p.anchor)}（${p.anchorLabel ?? '手术日'} = 第 0 天）${anchorGap !== null ? ` · 术后第 ${anchorGap} 天` : ''}`);
  out.push(`- 当前阶段（档案备注）：${p.stageState || '未记录'}`);

  out.push('## 营养支持');
  out.push('');
  out.push(`- 按次登记：${infs.length} 次${lastInf ? `，最近 ${longDate(lastInf.d)}${lastInf.ml !== null && lastInf.ml !== undefined ? ` · ${fmt(lastInf.ml, 0)} ml` : ' · 量未记'}` : ''}`);
  out.push(`- 当前方案：${latest ? `${latest.freq ?? '频次未记'} · ${latest.route ?? '途径未记'}${latest.volume_ml !== null && latest.volume_ml !== undefined ? ` · ${fmt(latest.volume_ml, 0)} ml` : ''}` : '未登记'}`);
  if (latest?.kcal === null || latest?.kcal === undefined) out.push('  - 热量：未记录（未知值显式留空，不猜）');

  out.push('## 体重');
  out.push('');
  out.push(lastW ? `- 最近 ${fmt(lastW.weight_kg, 1)} kg（${longDate(lastW.d)}，共 ${daily.length} 次记录）` : '- 未记录');

  out.push('## 想问的问题（本人勾选）');
  out.push('');
  out.push(qs.length ? qs.map((q) => `- ${q.text}${q.kind === 'view' ? '（本人看法，不当结论）' : ''}`).join(LINE) : '- 未勾选');

  out.push('## 生活影响（可共享）');
  out.push('');
  out.push(life.length ? life.map((it) => `- ${it.text}（${longDate(it.d)} · ${it.owner === 'caregiver' ? '照护者' : '本人'}）`).join(LINE) : '- 无可共享记录');

  out.push('');
  out.push('---');
  out.push('');
  out.push('本摘要由小养宝 NutriPal 从本机资料目录整理生成，只做资料整理，不做医学判断；治疗方案与解读以医生为准。');
  if (generatedAt) out.push(`${LINE}生成时间：${generatedAt}`);
  return out.join(LINE);
}

/** 导出文件名：与原型「复诊摘要」口径一致，带档案名。 */
export function exportFilename(profile) {
  const name = String(profile?.profile?.name ?? '档案').replace(/[\\/:*?"<>|\s]+/g, '-');
  return `复诊摘要-${name}.md`;
}
