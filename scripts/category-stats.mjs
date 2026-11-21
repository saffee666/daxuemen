// category 计数核对表：按 collection×pillar×category 打印分布，并校验词表成员
// 用法：node scripts/category-stats.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MONEY_VOCAB, DAO_VOCAB } from '../src/lib/categories.mjs';

const siteDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const collections = [
  { name: 'money', dir: path.join(siteDir, 'src', 'content', 'money'), vocab: MONEY_VOCAB },
  { name: 'dao', dir: path.join(siteDir, 'src', 'content', 'dao'), vocab: DAO_VOCAB },
];

let grandTotal = 0;
for (const c of collections) {
  const dist = new Map();
  let total = 0;
  let bad = 0;
  for (const f of fs.readdirSync(c.dir).filter((n) => n.endsWith('.md'))) {
    const text = fs.readFileSync(path.join(c.dir, f), 'utf8').replace(/^﻿/, '');
    const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
    const pillar = fm.match(/^pillar:\s*(\S+)\s*$/m)?.[1] ?? '(无pillar)';
    const category = (fm.match(/^category:\s*(.+?)\s*$/m)?.[1] ?? '(无category)').replace(/^["']|["']$/g, '');
    const key = `${pillar}｜${category}`;
    dist.set(key, (dist.get(key) ?? 0) + 1);
    total++;
    if (!(c.vocab[pillar] ?? []).includes(category)) bad++;
  }
  grandTotal += total;
  console.log(`\n== ${c.name}（${total} 条，词表外 ${bad} 条）==`);
  for (const [k, v] of [...dist.entries()].sort().map(([k, v]) => [k, v]).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(v).padStart(4)}  ${k}`);
  }
}
console.log(`\n总计：${grandTotal} 条`);
