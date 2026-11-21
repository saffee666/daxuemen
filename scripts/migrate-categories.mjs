// category 全量迁移脚本（一次性，幂等）
// 用法：
//   node scripts/migrate-categories.mjs --dry-run   # 只打印预期表，不落盘
//   node scripts/migrate-categories.mjs --apply     # 备份→迁移→出人工复核工单
//   node scripts/migrate-categories.mjs --restore   # 用备份整体覆盖回滚
// 只改 frontmatter 的 category 行；正文与其它字段不碰。
// 映射真源：src/lib/categories.mjs（MONEY_MIGRATION / DAO_MIGRATION / MONEY_FILE_OVERRIDES / MANUAL_REVIEW）
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MONEY_VOCAB,
  DAO_VOCAB,
  MONEY_MIGRATION,
  DAO_MIGRATION,
  MONEY_FILE_OVERRIDES,
  MANUAL_REVIEW,
} from '../src/lib/categories.mjs';

const siteDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rootDir = path.resolve(siteDir, '..');
const backupDir = path.join(rootDir, '_素材', '生成', 'backup-pre-category');
const reviewFile = path.join(rootDir, '_素材', '生成', 'category-manual-review.md');
const collections = [
  { name: 'money', dir: path.join(siteDir, 'src', 'content', 'money'), vocab: MONEY_VOCAB, valueMap: MONEY_MIGRATION, fileMap: MONEY_FILE_OVERRIDES },
  { name: 'dao', dir: path.join(siteDir, 'src', 'content', 'dao'), vocab: DAO_VOCAB, valueMap: DAO_MIGRATION, fileMap: {} },
];

const mode = process.argv.includes('--apply') ? 'apply' : process.argv.includes('--restore') ? 'restore' : 'dry-run';

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function parseFrontmatter(text) {
  // 兼容历史 PowerShell 生成的 UTF-8 BOM 文件（如 gov-10、benefits-int-15）
  const m = text.replace(/^﻿/, '').match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const fm = m[1];
  const pillar = fm.match(/^pillar:\s*(\S+)\s*$/m)?.[1];
  const categoryRaw = fm.match(/^category:\s*(.+?)\s*$/m)?.[1] ?? '';
  const category = categoryRaw.replace(/^["']|["']$/g, '');
  return { pillar, category, fullMatch: m[0], fmBlock: m[1] };
}

if (mode === 'restore') {
  if (!fs.existsSync(backupDir)) {
    console.error(`[restore] 备份不存在：${backupDir}`);
    process.exit(1);
  }
  for (const c of collections) {
    const from = path.join(backupDir, c.name);
    copyDir(from, c.dir);
  }
  console.log(`[restore] 已用 ${backupDir} 覆盖回滚 money/dao`);
  process.exit(0);
}

if (mode === 'apply' && !fs.existsSync(backupDir)) {
  copyDir(path.join(siteDir, 'src', 'content', 'money'), path.join(backupDir, 'money'));
  copyDir(path.join(siteDir, 'src', 'content', 'dao'), path.join(backupDir, 'dao'));
  console.log(`[backup] 内容目录已备份 → ${backupDir}`);
}

const preview = []; // {file, collection, pillar, old, target, via}
const manual = [];
const violations = [];
const counts = { changed: 0, unchanged: 0, skipped: 0 };

for (const c of collections) {
  for (const f of fs.readdirSync(c.dir).filter((n) => n.endsWith('.md')).sort()) {
    const filePath = path.join(c.dir, f);
    const text = fs.readFileSync(filePath, 'utf8');
    const fm = parseFrontmatter(text);
    if (!fm || !fm.pillar || !fm.category) {
      violations.push({ file: f, collection: c.name, reason: 'frontmatter 缺 pillar/category' });
      continue;
    }
    if (MANUAL_REVIEW.some((p) => f.startsWith(p))) {
      manual.push({ file: f, collection: c.name, pillar: fm.pillar, category: fm.category });
      counts.skipped++;
      continue;
    }
    const viaOverride = Object.keys(c.fileMap).find((p) => f.startsWith(p));
    const target = viaOverride ? c.fileMap[viaOverride] : c.valueMap[fm.category] ?? fm.category;
    const via = viaOverride ? `override(${viaOverride})` : c.valueMap[fm.category] ? 'value-map' : 'keep';
    const vocab = c.vocab[fm.pillar] ?? [];
    if (!vocab.includes(target)) {
      violations.push({ file: f, collection: c.name, pillar: fm.pillar, old: fm.category, target, reason: `目标值不在 ${fm.pillar} 词表` });
      counts.skipped++;
      continue;
    }
    preview.push({ file: f, collection: c.name, pillar: fm.pillar, old: fm.category, target, via });
    if (target === fm.category) {
      counts.unchanged++;
      continue;
    }
    if (mode === 'apply') {
      const re = new RegExp(`^(category:\\s*)${fm.category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'm');
      if (!re.test(text)) {
        violations.push({ file: f, collection: c.name, reason: `category 行正则未命中（现值 ${fm.category}）` });
        continue;
      }
      fs.writeFileSync(filePath, text.replace(re, `$1${target}`), 'utf8');
    }
    counts.changed++;
  }
}

// 预期表：old→target × 条数
const table = new Map();
for (const r of preview) {
  const key = `${r.collection}/${r.pillar}: ${r.old} → ${r.target}`;
  table.set(key, (table.get(key) ?? 0) + 1);
}
console.log(`\n[mode=${mode}] 预期 ${counts.changed} 条改动 / ${counts.unchanged} 条保持 / ${counts.skipped} 条跳过\n`);
for (const [k, v] of [...table.entries()].sort()) console.log(`  ${String(v).padStart(4)}  ${k}`);

if (violations.length) {
  console.log(`\n[violations] ${violations.length} 条异常（已跳过）：`);
  for (const v of violations) console.log(`  ${v.file} — ${v.reason}`);
}
if (manual.length) {
  console.log(`\n[manual] ${manual.length} 条待人工复核（已跳过）`);
}

if (mode === 'apply') {
  const lines = [
    '# category 人工复核工单',
    '',
    '- 生成：`node scripts/migrate-categories.mjs --apply`（2026-11-21）',
    '- 处理方式：人工定 category → 直接改条目 frontmatter → 重跑本脚本（幂等，已迁移文件不受影响）',
    '- 判据：这笔钱/这个坑「为什么给你」——求职/社保→就业补贴；开业/创业→创业补贴；引才/奖励→人才引进；落地奖→落户奖励；住宿/驿站→租房补贴；学费/代偿→学费资助；培训/证书→培训补贴；实习→实习补贴；纯通用礼包→生活补贴',
    '',
    '## 待人工定夺',
    '',
    '| 文件 | 集合/支柱 | 现值 | 判据提示 |',
    '|---|---|---|---|',
    ...manual.map((m) => `| ${m.file} | ${m.collection}/${m.pillar} | ${m.category} | 读 title+eligibility，按上方判据归入词表值 |`),
  ];
  if (violations.length) {
    lines.push('', '## 迁移异常（词表外，需人工）', '', '| 文件 | 原因 |', '|---|---|', ...violations.map((v) => `| ${v.file} | ${v.reason} |`));
  }
  fs.writeFileSync(reviewFile, lines.join('\n') + '\n', 'utf8');
  console.log(`\n[done] 工单已写 ${reviewFile}`);
}
