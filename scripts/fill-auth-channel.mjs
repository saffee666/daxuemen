// 认证渠道（auth_channel）启发式补录：benefits-*（企业让利条目）一次性写入
// 用法：
//   node scripts/fill-auth-channel.mjs --dry-run  # 只打印分类预览
//   node scripts/fill-auth-channel.mjs --apply    # 备份→写入→人工清单出工单
//   node scripts/fill-auth-channel.mjs --restore  # 备份回滚
// 渠道枚举真源：src/lib/categories.mjs AUTH_CHANNELS（schema auth_channel 同源）
// 判据：frontmatter 全文关键词命中即归入对应渠道（可多选）；零命中 → 人工清单，不猜。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AUTH_CHANNELS } from '../src/lib/categories.mjs';

const siteDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rootDir = path.resolve(siteDir, '..');
const contentDir = path.join(siteDir, 'src', 'content', 'money');
const backupDir = path.join(rootDir, '_素材', '生成', 'backup-pre-auth');
const reviewFile = path.join(rootDir, '_素材', '生成', 'auth-manual-review.md');

const mode = process.argv.includes('--apply') ? 'apply' : process.argv.includes('--restore') ? 'restore' : 'dry-run';

const RULES = [
  { key: '学信网', re: /学信网|学籍验证|学籍校验|学籍在线/ },
  { key: 'edu邮箱', re: /\.edu\b|edu邮箱|教育邮箱|校园邮箱|学校邮箱|学生邮箱|教育优惠邮箱/i },
  { key: 'SheerID', re: /sheerid|unidays|student beans/i },
  { key: '支付宝校园派', re: /支付宝|校园派/ },
  { key: '证件人工审', re: /学生证|录取通知|在读证明|人工审核|证件照|手持身份证|身份证照片/ },
  { key: '平台自有', re: /官方(?:认证|验证|渠道)|账号(?:认证|验证)|会员中心|学生中心|客服(?:审核|人工)/ },
];

// 第二层：正文窄模式（frontmatter 没写认证细节时兜底；只收强信号渠道，防止正文行文误命中）
const BODY_RULES = [
  { key: '学信网', re: /学信网|学籍验证|学籍校验/ },
  { key: 'edu邮箱', re: /\.edu\.cn|\bedu\b\s*(?:邮箱|邮)|教育邮箱|校园邮箱|学校邮箱|学生邮箱|大学邮箱|有效大学邮箱/ },
  { key: 'SheerID', re: /sheerid|unidays|student beans/i },
  { key: '支付宝校园派', re: /支付宝|校园派/ },
];

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

if (mode === 'restore') {
  if (!fs.existsSync(backupDir)) {
    console.error(`[restore] 备份不存在：${backupDir}`);
    process.exit(1);
  }
  copyDir(path.join(backupDir, 'money'), contentDir);
  console.log(`[restore] 已用 ${backupDir} 覆盖回滚 money`);
  process.exit(0);
}

if (mode === 'apply' && !fs.existsSync(backupDir)) {
  copyDir(contentDir, path.join(backupDir, 'money'));
  console.log(`[backup] benefits 条目已备份 → ${backupDir}`);
}

const preview = [];
const manual = [];
let changed = 0;
let already = 0;

for (const f of fs.readdirSync(contentDir).filter((n) => /^benefits-(dom|int)-.*\.md$/.test(n)).sort()) {
  const filePath = path.join(contentDir, f);
  const text = fs.readFileSync(filePath, 'utf8');
  const fmMatch = text.replace(/^﻿/, '').match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmMatch) {
    manual.push({ file: f, reason: 'frontmatter 解析失败' });
    continue;
  }
  const fm = fmMatch[1];
  if (/^auth_channel:/m.test(fm)) {
    already++;
    continue;
  }
  const body = text.slice((fmMatch.index ?? 0) + fmMatch[0].length);
  const hits = [...new Set([...RULES.filter((r) => r.re.test(fm)).map((r) => r.key), ...BODY_RULES.filter((r) => r.re.test(body)).map((r) => r.key)])];
  if (hits.length === 0) {
    manual.push({ file: f, title: fm.match(/^title:\s*(.+?)\s*$/m)?.[1] ?? '', reason: '零关键词命中，人工定渠道' });
    continue;
  }
  // 按 AUTH_CHANNELS 枚举顺序排列
  const ordered = AUTH_CHANNELS.filter((k) => hits.includes(k));
  preview.push({ file: f, channels: ordered });
  if (mode === 'apply') {
    const re = /^(category:\s*.+?)\s*$/m;
    if (!re.test(fm)) {
      manual.push({ file: f, reason: 'category 行未命中，无法定位插入点' });
      continue;
    }
    const line = `category: ${fm.match(re)[1].replace(/^category:\s*/, '')}\nauth_channel: [${ordered.join(', ')}]`;
    const next = text.replace(re, line);
    fs.writeFileSync(filePath, next, 'utf8');
    changed++;
  }
}

console.log(`\n[mode=${mode}] ${changed} 条写入 / ${already} 条已有字段跳过 / ${manual.length} 条待人工\n`);
for (const p of preview) console.log(`  ${p.file}  →  [${p.channels.join(' + ')}]`);
if (manual.length) {
  console.log(`\n[manual] ${manual.length} 条：`);
  for (const m of manual) console.log(`  ${m.file}  ${m.title ?? ''}  — ${m.reason}`);
}

if (mode === 'apply') {
  const lines = [
    '# auth_channel 人工补录工单',
    '',
    '- 生成：`node scripts/fill-auth-channel.mjs --apply`（2026-11-21）',
    '- 处理方式：人工确认认证渠道 → 在条目 frontmatter 加一行 `auth_channel: [渠道]`',
    '- 渠道枚举：' + AUTH_CHANNELS.join(' / '),
    '- 判据：条目 steps/eligibility 里实际写的认证路径是什么就标什么；拿不准标「其他」并在 notes 记一句',
    '',
    '| 文件 | 标题 | 处理 |',
    '|---|---|---|',
    ...manual.map((m) => `| ${m.file} | ${m.title ?? ''} | ${m.reason} |`),
  ];
  fs.writeFileSync(reviewFile, lines.join('\n') + '\n', 'utf8');
  console.log(`\n[done] 工单已写 ${reviewFile}`);
}
