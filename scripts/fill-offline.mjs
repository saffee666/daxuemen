// offline_required 字段启发式填充（第二圈 P3：启用心理成本层）
// 判据：eligibility/steps/deadline 文本含线下办理关键词 → true；零命中保持留空（不确定就不写，见条目模型）
// 用法：--dry-run（默认打印）/ --apply（备份→写入→工单）/ --restore
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const siteDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rootDir = path.resolve(siteDir, '..');
const contentDir = path.join(siteDir, 'src', 'content', 'money');
const backupDir = path.join(rootDir, '_素材', '生成', 'backup-pre-offline');
const reviewFile = path.join(rootDir, '_素材', '生成', 'offline-manual-review.md');

const mode = process.argv.includes('--apply') ? 'apply' : process.argv.includes('--restore') ? 'restore' : 'dry-run';

// 线下办理信号词（窗口办理/现场核验/邮寄材料是行政负担三成本里 compliance+psychological 的直接证据）
const KEYWORDS = /窗口|现场|线下|柜台|大厅|受理点|原件|邮寄|本人办理|现场核验|实地/;

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
  console.log(`[restore] 已用 ${backupDir} 覆盖回滚`);
  process.exit(0);
}

if (mode === 'apply' && !fs.existsSync(backupDir)) {
  copyDir(contentDir, path.join(backupDir, 'money'));
  console.log(`[backup] → ${backupDir}`);
}

const hits = [];
let skipped = 0;
for (const f of fs.readdirSync(contentDir).filter((n) => n.endsWith('.md')).sort()) {
  const filePath = path.join(contentDir, f);
  const text = fs.readFileSync(filePath, 'utf8');
  const fmMatch = text.replace(/^﻿/, '').match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmMatch) continue;
  const fm = fmMatch[1];
  if (/^offline_required:/m.test(fm)) {
    skipped++;
    continue;
  }
  // 只看语义字段（eligibility/steps/deadline/notes），title/正文不参与
  const semantic = ['eligibility', 'steps', 'deadline_or_validity', 'deadline_dates', 'notes']
    .map((k) => {
      const m = fm.match(new RegExp(`^${k}:`, 'm'));
      if (!m) return '';
      const nextKey = fm.indexOf('\n[a-z_]+:', m.index + 1);
      return fm.slice(m.index, nextKey === -1 ? fm.length : nextKey);
    })
    .join('\n');
  if (!KEYWORDS.test(semantic)) continue;
  hits.push({ file: f });
  if (mode === 'apply') {
    const next = text.replace(/^(status:\s*.+)$/m, `offline_required: true\n$1`);
    if (next === text) {
      console.warn(`⚠️ ${f} status 行未命中，跳过`);
      continue;
    }
    fs.writeFileSync(filePath, next, 'utf8');
  }
}

console.log(`\n[mode=${mode}] ${hits.length} 条命中线下信号 → offline_required: true；${skipped} 条已有字段跳过`);
for (const h of hits) console.log(`  ${h.file}`);

if (mode === 'apply') {
  const lines = [
    '# offline_required 人工复核工单',
    '',
    '- 生成：`node scripts/fill-offline.mjs --apply`（2026-11-22）',
    '- 判据：关键词命中即置 true，属保守近似——确为线上办理的条目请人工改回/删除该行',
    '- 依据：Herd & Moynihan 行政负担三成本（psychological/compliance cost 层提示）',
    '',
    ...hits.map((h) => `- ${h.file}`),
  ];
  fs.writeFileSync(reviewFile, lines.join('\n') + '\n', 'utf8');
  console.log(`\n[done] 工单 → ${reviewFile}`);
}
