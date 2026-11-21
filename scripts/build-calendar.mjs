// C9 用户侧截止日历：扫钱条目 deadline_dates（结构化日期，与 deadline_or_validity 文本双轨），
// 生成 public/calendar.ics（全站合集）+ public/calendars/<id>.ics（逐条目，条目页「加入日历」按钮取用）。
// 无 dates 的条目静默跳过；一个条目零 dates 时整体也照常退出（graceful）。
// 字段白名单照 ics 严格 schema（见 knowledge/认知卡-ics.md：自造键整批拒）。
// 用法：node scripts/build-calendar.mjs
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import fs from 'node:fs';
import path from 'node:path';
import { createEvents } from 'ics';

const ROOT = path.resolve(import.meta.dirname, '../src/content/money');
const OUT_DIR = path.resolve(import.meta.dirname, '../public');
const PER_ENTRY_DIR = path.join(OUT_DIR, 'calendars');

async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.name.endsWith('.md')) yield p;
  }
}

function parseFrontmatter(fm) {
  const title = fm.match(/^title:\s*['"]?([^'"\n]+)['"]?\s*$/m)?.[1]?.trim();
  const official = fm.match(/^official_url:\s*['"]?(\S+)['"]?\s*$/m)?.[1];
  const region = fm.match(/^region:\s*['"]?([^'"\n]*)['"]?\s*$/m)?.[1]?.trim() ?? '';
  const raw = fm.match(/^deadline_or_validity:\s*['"]?([^'"\n]*)['"]?\s*$/m)?.[1]?.trim() ?? '';
  const datesBlock = fm.match(/^deadline_dates:\s*(.*)$/m);
  let dates = [];
  if (datesBlock) {
    if (datesBlock[1].trim()) {
      dates = datesBlock[1].match(/\d{4}-\d{2}-\d{2}/g) ?? [];
    } else {
      const list = fm.slice(datesBlock.index).split(/^\s+-\s*/m).slice(1);
      dates = list.map((l) => l.match(/(\d{4}-\d{2}-\d{2})/)?.[1]).filter(Boolean);
    }
  }
  // 城市（region 城市:×× 才有；引号已剥）
  const city = region.startsWith('城市:') ? region.slice(3).trim() : '';
  return { title, official, raw, dates, city };
}

const entries = [];
const desc = (raw, official) => [raw, official ? `来源：${official}` : null].filter(Boolean).join('\n');
for await (const file of walk(ROOT)) {
  const fm = (await readFile(file, 'utf8')).split('---')[1] ?? '';
  const { title, official, raw, dates, city } = parseFrontmatter(fm);
  if (!title || dates.length === 0) continue;
  const id = path.basename(file, '.md');
  entries.push({ id, title, official, raw, dates, city });
}

if (entries.length === 0) {
  console.log('ℹ️ 无含 deadline_dates 的条目，跳过日历生成。');
  process.exit(0);
}

await mkdir(PER_ENTRY_DIR, { recursive: true });

let total = 0;
for (const e of entries) {
  const events = e.dates.map((d) => {
    const [y, m, day] = d.split('-').map(Number);
    return {
      title: `${e.title}｜截止`,
      start: [y, m, day, 9, 0],
      duration: { hours: 1 },
      description: desc(e.raw, e.official),
      url: e.official,
    };
  });
  const r = createEvents(events);
  if (r.error) {
    console.warn(`⚠️ ${e.id} ics 生成失败：${JSON.stringify(r.error)}`);
    continue;
  }
  await writeFile(path.join(PER_ENTRY_DIR, `${e.id}.ics`), r.value, 'utf8');
  total += events.length;
}

// 全站合集（同一批事件合并输出一次）
const all = entries.flatMap((e) =>
  e.dates.map((d) => {
    const [y, m, day] = d.split('-').map(Number);
    return {
      title: `${e.title}｜截止`,
      start: [y, m, day, 9, 0],
      duration: { hours: 1 },
      description: desc(e.raw, e.official),
      url: e.official,
    };
  })
);
const rAll = createEvents(all);
if (rAll.error) {
  console.warn(`⚠️ 合集 ics 生成失败：${JSON.stringify(rAll.error)}`);
  process.exit(1);
}
await writeFile(path.join(OUT_DIR, 'calendar.ics'), rAll.value, 'utf8');

console.log(`📅 日历生成：${entries.length} 个条目 / ${total} 个事件 → public/calendar.ics + public/calendars/`);

// 按市聚合（城市页「订阅本市截止日历」取用）；无 dates 城市也生成空日历，保证页面链接不 404
// 城市全集从内容目录 region 派生（含暂无 dates 的城市）
const moneyDir = path.resolve(import.meta.dirname, '../src/content/money');
const byCity = new Map();
for (const f of fs.readdirSync(moneyDir).filter((n) => n.endsWith('.md'))) {
  const fm = fs.readFileSync(path.join(moneyDir, f), 'utf8').split('---')[1] ?? '';
  const region = fm.match(/^region:\s*['"]?([^'"\n]*)['"]?\s*$/m)?.[1]?.trim() ?? '';
  if (region.startsWith('城市:')) byCity.set(region.slice(3).trim(), []);
}
for (const e of entries) {
  if (!e.city) continue;
  for (const d of e.dates) byCity.get(e.city)?.push({ e, d });
}
let cityFiles = 0;
const cityList = [];
for (const [city, items] of byCity) {
  const events = items.map(({ e, d }) => {
    const [y, m, day] = d.split('-').map(Number);
    return {
      title: `${e.title}｜截止`,
      start: [y, m, day, 9, 0],
      duration: { hours: 1 },
      description: desc(e.raw, e.official),
      url: e.official,
    };
  });
  const r = events.length > 0 ? createEvents(events) : createEvents([]);
  if (r.error) {
    console.warn(`⚠️ ${city} 城市日历生成失败：${JSON.stringify(r.error)}`);
    continue;
  }
  await writeFile(path.join(PER_ENTRY_DIR, `city-${city}.ics`), r.value, 'utf8');
  cityList.push({ city, n: items.length });
  cityFiles++;
}
console.log(`📅 城市日历：${cityFiles} 个城市 → public/calendars/city-<市名>.ics`);

// /calendars/ 目录页（静态托管无 autoindex，生成清单页防 404）
const sortedCities = cityList.sort((a, b) => b.n - a.n || a.city.localeCompare(b.city, 'zh'));
const indexHtml = [
  '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width, initial-scale=1" />',
  '<meta name="robots" content="noindex, follow" />',
  '<title>日历订阅 · 大学补给站</title>',
  '<style>body{font-family:system-ui,sans-serif;max-width:760px;margin:48px auto;padding:0 20px;color:#201a16;background:#faf9f6;line-height:1.7}h1{font-size:1.6rem}p{color:#6b6159}ul{padding-left:0;list-style:none;display:grid;gap:8px}li a{display:flex;justify-content:space-between;gap:12px;padding:10px 14px;border:1px solid #e5e0d8;border-radius:10px;color:#201a16;text-decoration:none}li a:hover{background:#f1ede6}small{color:#8b7d74}</style>',
  '</head><body>',
  '<h1>日历订阅</h1>',
  `<p>订阅 .ics 后，申报截止自动进你的日历（全站合集 <a href="/calendar.ics">calendar.ics</a>）。若订阅后未显示，检查系统是否拦截了 .ics 文件类型。</p>`,
  '<ul>',
  ...sortedCities.map(
    ({ city, n }) =>
      `<li><a href="${encodeURIComponent(`city-${city}`)}.ics"><span>${city} · 截止日历</span><small>${n} 个节点</small></a></li>`
  ),
  '</ul></body></html>',
].join('\n');
await writeFile(path.join(PER_ENTRY_DIR, 'index.html'), indexHtml, 'utf8');
