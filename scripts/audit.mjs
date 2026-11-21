// D3/D4 月度巡检：扫全库 verified_date，超期条目输出 Markdown 清单（供 CI 自动开 issue）
// 用法：node scripts/audit.mjs [--warn-months 6] [--stale-months 12]
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const getArg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? Number(process.argv[i + 1]) : def;
};
const WARN = getArg('warn-months', 6);
const STALE = getArg('stale-months', 12);
const ROOT = path.resolve(import.meta.dirname, '../src/content');
const NOW = new Date();

function monthsSince(ym) {
  const [y, m] = ym.split('-').map(Number);
  return (NOW.getTime() - new Date(y, m - 1, 15).getTime()) / (1000 * 60 * 60 * 24 * 30.44);
}

async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.name.endsWith('.md')) yield p;
  }
}

const rows = [];
for await (const file of walk(ROOT)) {
  const fm = (await readFile(file, 'utf8')).split('---')[1] ?? '';
  const rel = path.relative(ROOT, file).replaceAll('\\', '/');
  const verified = fm.match(/^verified_date:\s*['"]?(\d{4}-\d{2})/m)?.[1];
  if (verified) {
    const m = monthsSince(verified);
    if (m >= STALE) rows.push({ rel, verified, level: '疑似过期' });
    else if (m >= WARN) rows.push({ rel, verified, level: '待核对' });
  }
  // 攻略用 updated 字段
  const updated = fm.match(/^updated:\s*['"]?(\d{4}-\d{2})/m)?.[1];
  if (updated && !verified) {
    const m = monthsSince(updated);
    if (m >= STALE) rows.push({ rel, verified: updated, level: '疑似过期' });
    else if (m >= WARN) rows.push({ rel, verified: updated, level: '待核对' });
  }
}

if (rows.length === 0) {
  console.log('✅ 全库条目核对日期均在有效期内。');
  process.exit(0);
}

const lines = [
  '## 本月待核对清单（自动巡检）',
  '',
  '| 条目 | 最后核对 | 状态 |',
  '|---|---|---|',
  ...rows.sort((a, b) => a.verified.localeCompare(b.verified)).map((r) => `| ${r.rel} | ${r.verified} | ${r.level} |`),
  '',
  `共 ${rows.length} 条。处理方式：复核官方来源后更新 verified_date / status，或删除本 issue。`,
];
console.log(lines.join('\n'));
