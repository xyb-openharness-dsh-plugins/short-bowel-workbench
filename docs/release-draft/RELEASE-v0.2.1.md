# Release 草稿 v0.2.1（无人值守冻结 · 不公开发布，待用户晨审后执行）

- tag：v0.2.1（打在 M6 后的 main；未打 tag，命令备好）
- 产物：xyb-community-short-bowel-workbench-0.2.1.tgz（release/ 目录）
- sha256：见 `shasum -a 256 release/*.tgz` 执行结果
- Release 说明文本：见下

## Release Notes（草稿）

小养宝 NutriPal 短肠综合征工作台 v0.2.1（首个功能版本）

- 原型 v0.2：九大一级页 + 24 子页（营养支持/输液日历、化验随访不同方法不合并、导管与并发症筛查、生活与心理、复诊准备、资源与医保、疾病概要四段）
- 两套合成示例档案（A 刚确诊 / B 长期随访），整页联动不串档
- 开发版：SQLite 16 表冻结 schema、customFrame 客户端（AI 会话 25–45% 可拖）、MinerU 解析六部件、试验线索台账（588 条，不做匹配判读）
- 检查链：npm run check 全绿；npm test 49 用例全过；audit 43/44（1 待人工：primer 趋势段禁词人工复核，内容已核）
- 0 患者访谈、0 临床审核，全部如实标注

## 执行命令（用户晨审后）

```bash
git tag v0.2.1 && git push origin v0.2.1
gh release create v0.2.1 release/xyb-community-short-bowel-workbench-0.2.1.tgz \
  --title "v0.2.1 首个功能版本" --notes-file docs/release-draft/RELEASE-v0.2.1.md
```
