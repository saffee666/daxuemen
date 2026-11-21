// extract-agihunt.mjs — AGIHunt 镜像 242 条补贴 → gov 城市条目（交叉复核 + 补缺城市）
// 用法：
//   node scripts/extract-agihunt.mjs --dry-run   # 清单 → _素材/生成/agihunt-dryrun.md
//   node scripts/extract-agihunt.mjs             # 生成 md → _素材/生成/money/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, '../../_素材/复刻/AGIHunt/data/subsidies-242.json');
const RADAR_OUT = path.resolve(__dirname, '../../_素材/生成/money'); // 雷达生成物（对账用）
const SITE_MONEY = path.resolve(__dirname, '../src/content/money'); // 站点真源（对账用）
const OUT_DIR = path.resolve(__dirname, '../../_素材/生成');
const DRYRUN_PATH = path.join(OUT_DIR, 'agihunt-dryrun.md');

const VERIFIED = '2026-11';

function isGovUrl(url) {
  try {
    const host = new URL(url).hostname;
    return host === 'gov.cn' || host.endsWith('.gov.cn') || host === 'edu.cn' ||
      host.endsWith('.edu.cn') || host === 'org.cn' || host.endsWith('.org.cn');
  } catch {
    return false;
  }
}

const STUDENT_TEXT = /本科|硕士|博士|高校|大学|应届|毕业生|大学生|青年|人才/;
function studentRelevant(rec) {
  return STUDENT_TEXT.test(`${rec.subsidy_project || ''}${rec.applicable_object || ''}`);
}

function categorize(project) {
  const s = String(project || '');
  if (/租房|公寓|安居|住房租赁/.test(s)) return '租房补贴';
  if (/购房|安家|房票/.test(s)) return '购房补贴';
  // ↓ 三条低频类先行拦截，压低「其他补贴」再生率（词表见 src/lib/categories.mjs）
  if (/学费|代偿/.test(s)) return '学费资助';
  if (/实习/.test(s)) return '实习补贴';
  if (/培训|职业技能|证书补贴/.test(s)) return '培训补贴';
  if (/就业|见习|求职/.test(s)) return '就业补贴';
  if (/创业|担保贷款|初创/.test(s)) return '创业补贴';
  if (/落户|入户/.test(s)) return '落户奖励';
  if (/生活|生活补贴|津贴/.test(s)) return '生活补贴';
  if (/人才|引才|聚才/.test(s)) return '人才引进';
  return '其他补贴';
}

// 标题相似度：字符 bigram Jaccard（对账用，粗筛够用）
function bigrams(s) {
  const str = String(s || '').replace(/\s/g, '');
  const set = new Set();
  for (let i = 0; i < str.length - 1; i++) set.add(str.slice(i, i + 2));
  return set;
}
function similarity(a, b) {
  const A = bigrams(a);
  const B = bigrams(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const g of A) if (B.has(g)) inter++;
  return inter / (A.size + B.size - inter);
}

function escYaml(s) {
  const str = String(s ?? '');
  if (/^\d{4}-\d{2}(-\d{2})?$/.test(str)) return `'${str}'`;
  return /[:#\[\]{\n'"]/.test(str) ? `'${str.replace(/'/g, "''")}'` : str;
}

// 收集现有城市条目（雷达生成物 + 站点真源），构建 (city → titles[]/urls[]) 索引
function existingIndex() {
  const idx = [];
  for (const dir of [RADAR_OUT, SITE_MONEY]) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.md')) continue;
      const raw = fs.readFileSync(path.join(dir, f), 'utf8');
      const region = /region: 城市:(.+)/.exec(raw)?.[1]?.trim();
      const title = /title: (.+)/.exec(raw)?.[1]?.trim();
      const url = /official_url: (\S+)/.exec(raw)?.[1]?.trim();
      if (region) idx.push({ file: f, city: region, title: title || '', url: url || '' });
    }
  }
  return idx;
}

function pipeline(dryRun) {
  const all = JSON.parse(fs.readFileSync(SRC, 'utf8'));
  const existing = existingIndex();
  const pass = [];
  const review = [];
  const deduped = [];
  const dropped = { conf: 0, url: 0, student: 0 };
  for (const rec of all) {
    if (rec.confidence !== '高') { dropped.conf++; continue; }
    if (!studentRelevant(rec)) { dropped.student++; continue; }
    if (!rec.official_source_url || !isGovUrl(rec.official_source_url)) { dropped.url++; review.push(rec); continue; }
    // 与现有城市条目对账：同官方链接 → 跳过；同城+高相似 → 记对账
    const sameUrl = existing.find((e) => e.url === rec.official_source_url);
    if (sameUrl) { deduped.push({ rec, why: `同链接已收录（${sameUrl.file}）` }); continue; }
    const similar = existing
      .filter((e) => e.city === rec.city)
      .map((e) => ({ e, sim: similarity(e.title, rec.subsidy_project) }))
      .sort((a, b) => b.sim - a.sim)[0];
    if (similar && similar.sim >= 0.55) {
      deduped.push({ rec, why: `与 ${similar.e.file}《${similar.e.title}》相似度 ${similar.sim.toFixed(2)}` });
      continue;
    }
    pass.push({ rec, crosscheck: similar && similar.sim >= 0.35 ? similar : null });
  }

  if (dryRun) {
    const lines = [
      `# AGIHunt → gov 条目 dry-run（${VERIFIED}）`,
      '',
      `- 通过：**${pass.length} 条**（confidence=高 + 官方域名 + 学生相关 + 不与现有重复）`,
      `- 与现有重复跳过：${deduped.length}；非官方域名：${review.length}；confidence 非「高」：${dropped.conf}；非学生：${dropped.student}`,
      '',
      '## 将生成',
      '',
      '| 城市 | 项目 | 对象摘要 | 官方域名 | 同城相近条目（人工核对口径） |',
      '|---|---|---|---|---|',
      ...pass.map(({ rec, crosscheck }) =>
        `| ${rec.city} | ${rec.subsidy_project} | ${String(rec.applicable_object || '').slice(0, 30)} | ${new URL(rec.official_source_url).hostname} | ${crosscheck ? `${crosscheck.e.title}（${crosscheck.sim.toFixed(2)}）` : '—'} |`),
    ];
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(DRYRUN_PATH, lines.join('\n'), 'utf8');
    console.log(`dry-run → ${DRYRUN_PATH}（pass ${pass.length} / 重复 ${deduped.length} / 非官方域名 ${review.length}）`);
    return;
  }

  const outDir = path.join(OUT_DIR, 'money');
  fs.mkdirSync(outDir, { recursive: true });
  let n = 0;
  for (const { rec } of pass) {
    n++;
    const title = String(rec.city).includes(rec.subsidy_project) || rec.subsidy_project.includes(rec.city)
      ? rec.subsidy_project
      : `${rec.city}${rec.subsidy_project}`;
    const id = String(rec.source_noteids || `agi-${n}`).replace(/[^a-z0-9-]/gi, '').slice(0, 24) || `agi-${n}`;
    const noteParts = [rec.review_note, rec.evidence].filter(Boolean).map((s) => String(s).trim());
    const frontmatter = [
      '---',
      `title: ${escYaml(title)}`,
      'pillar: gov',
      'stage: [应届毕业, 毕业1-3年]',
      `region: 城市:${escYaml(rec.city)}`,
      `category: ${escYaml(categorize(rec.subsidy_project))}`,
      `value_level: ${escYaml(rec.subsidy_standard || '以官方来源页为准')}`,
      `eligibility: ${escYaml(rec.applicable_object || '以官方来源页为准')}`,
      'steps:',
      `  - ${escYaml(rec.application_channel || '通过官方来源页所示渠道申请')}`,
      'materials: []',
      `official_url: ${rec.official_source_url}`,
      'deadline_or_validity: 以官方来源页当期口径为准（AGIHunt 镜像未含截止日期字段）',
      'deadline_dates: []',
      'tiers: []',
      `confidence: 高`,
      `source_name: AGIHunt 镜像（官方链接继承，as-of 2026-11）${noteParts[0] ? `｜${noteParts[0]}` : ''}`,
      `verified_date: '${VERIFIED}'`,
      'status: 有效',
      `notes: ${escYaml(`镜像导入条目（confidence=高）：官方链接继承自 AGIHunt 镜像数据。${noteParts.join(' ')}`.slice(0, 480))}`,
      '---',
      '',
    ].join('\n');
    const body = [
      `${title}：${rec.subsidy_standard || ''}`,
      '',
      rec.applicable_object || '',
      '',
      `申领渠道：${rec.application_channel || '见官方来源页'}`,
      '',
    ].join('\n');
    fs.writeFileSync(path.join(outDir, `city-agi-${String(n).padStart(3, '0')}-${id}.md`), frontmatter + body, 'utf8');
  }
  console.log(`生成 ${n} 条 → ${outDir}`);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) pipeline(process.argv.includes('--dry-run'));
