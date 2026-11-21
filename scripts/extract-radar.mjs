// extract-radar.mjs — 城市补贴雷达镜像 chunk → 门道 gov/city 条目
// 只做文本解析（字符串感知的状态机），不 eval 镜像文件。
// 用法：
//   node scripts/extract-radar.mjs --stats        # 数据分布概览
//   node scripts/extract-radar.mjs --dry-run      # 过滤后清单 → _素材/生成/radar-dryrun.md
//   node scripts/extract-radar.mjs                # 生成 md → _素材/生成/money/（人工过目后拷入 src/content/money/）
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.resolve(__dirname, '../../_素材/复刻/城市补贴雷达/assets');
const OUT_DIR = path.resolve(__dirname, '../../_素材/生成');
const DRYRUN_PATH = path.join(OUT_DIR, 'radar-dryrun.md');

const VERIFIED = '2026-11';
const SOURCE_TAG = '城市补贴雷达镜像导入，官方链接继承，as-of 2026-11';

// 解析错误采集（stats/dry-run 时输出，便于人工排查）
export const PARSE_ERRORS = [];

// ---------- 拼音 → 中文城市名（碰撞城人工钉死，其余从 location 推导） ----------
const PINYIN_CITY = {
  suzhou: '苏州',
  suzhouah: '宿州',
  taizhou: '台州',
  taizhoujs: '泰州',
  xian: '西安',
  xianyang: '咸阳',
  baoding: '保定',
  beijing: '北京',
  shanghai: '上海',
  chongqing: '重庆',
  tianjin: '天津',
};

// JS 模板字面量转义还原：\\"→\" 、\\→\ 、\`→` 、\$→$ 等（JSON.parse 分支必须先 cook）
function cookTemplate(s) {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '\\' && i + 1 < s.length) {
      const n = s[i + 1];
      if (n === '\\') { out += '\\'; i++; continue; }
      if (n === '`') { out += '`'; i++; continue; }
      if (n === '"') { out += '"'; i++; continue; }
      if (n === '$') { out += '$'; i++; continue; }
      if (n === 'n') { out += '\\n'; i++; continue; } // 数据内换行按 JSON 转义保留
      if (n === 't') { out += '\\t'; i++; continue; }
      out += s[i] + n;
      i++;
      continue;
    }
    out += s[i];
  }
  return out;
}

// ---------- chunk 解析 ----------
// 大城：var e=JSON.parse(`[...]`)；小城：var e=[...]（反引号串/无引号键/!0!1/科学计数）
export function extractLiterals(raw) {
  const out = [];
  // JSON.parse(`...`) 变体
  const jp = /JSON\.parse\(`([\s\S]+?)`\)/g;
  let m;
  while ((m = jp.exec(raw)) !== null) {
    try {
      out.push(JSON.parse(cookTemplate(m[1])));
    } catch (e) {
      PARSE_ERRORS.push(`JSON.parse 分支: ${e.message.slice(0, 90)}`);
      out.push(null);
    }
  }
  // var x=[...] 变体：字符串感知的括号配对
  const varRe = /var\s+[$\w]+\s*=\s*/g;
  let v;
  while ((v = varRe.exec(raw)) !== null) {
    let i = v.index + v[0].length;
    if (raw.startsWith('JSON.parse', i)) continue; // 上面已处理
    const open = raw[i];
    if (open !== '[' && open !== '{') continue;
    let depth = 0;
    let inStr = false;
    let quote = null;
    const start = i;
    for (; i < raw.length; i++) {
      const ch = raw[i];
      if (inStr) {
        if (ch === '\\') { i++; continue; }
        if (ch === quote) { inStr = false; quote = null; }
        continue;
      }
      if (ch === '`' || ch === '"' || ch === "'") { inStr = true; quote = ch; continue; }
      if (ch === '[' || ch === '{') depth++;
      else if (ch === ']' || ch === '}') {
        depth--;
        if (depth === 0) { i++; break; }
      }
    }
    const lit = raw.slice(start, i);
    out.push(normalizeLiteral(lit));
  }
  return out.filter(Boolean);
}

// 小城字面量规整：反引号串→JSON 双引号串（内层引号转义）、无引号键加引号、!0/!1→true/false；3e3 本身是合法 JSON 数字
export function normalizeLiteral(src) {
  let out = '';
  let i = 0;
  let inStr = false;
  let quote = null;
  while (i < src.length) {
    const ch = src[i];
    if (inStr) {
      if (ch === '\\' && i + 1 < src.length) {
        const next = src[i + 1];
        // JS 转义的引号/反引号 → JSON 里无需转义反引号，统一还原为字符本体
        if (next === '`' || next === '"' || next === "'") { out += next; i += 2; continue; }
        out += ch + next;
        i += 2;
        continue;
      }
      if (ch === quote) { inStr = false; quote = null; out += '"'; i++; continue; }
      // 串内的双引号是数据：转义；单引号在 JSON 串内合法，原样输出
      if (ch === '"') { out += '\\"'; i++; continue; }
      out += ch;
      i++;
      continue;
    }
    if (ch === '`' || ch === '"' || ch === "'") { inStr = true; quote = ch; out += '"'; i++; continue; }
    if (ch === '!' && (src[i + 1] === '0' || src[i + 1] === '1')) {
      out += src[i + 1] === '0' ? 'false' : 'true';
      i += 2;
      continue;
    }
    if (ch === '{' || ch === ',') {
      out += ch;
      i++;
      let j = i;
      while (src[j] === ' ' || src[j] === '\n' || src[j] === '\r' || src[j] === '\t') j++;
      const m = /^[$\w一-鿿]+/.exec(src.slice(j));
      if (m && src[j + m[0].length] === ':') {
        out += ` "${m[0]}"`;
        i = j + m[0].length;
      }
      continue;
    }
    out += ch;
    i++;
  }
  try {
    return JSON.parse(out);
  } catch (e) {
    PARSE_ERRORS.push(`normalize 分支: ${e.message.slice(0, 90)} @pos ${/position (\d+)/.exec(e.message)?.[1] ?? '?'}`);
    return null;
  }
}

// 只认补贴形状的数组：元素为带 id+city+name+category+application 的对象
export function subsidyArrays(parsed) {
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(
    (it) =>
      it && typeof it === 'object' && it.id && it.city && it.name && it.category && it.application,
  );
}

// ---------- 过滤链 ----------
const GOV_TLD = /(^|\.)?(gov\.cn|edu\.cn|org\.cn)$/i;
function officialUrlCheck(rec) {
  const url = rec.application?.url || '';
  if (!/^https?:\/\//i.test(url)) return { bucket: 'drop', url: '' };
  try {
    const host = new URL(url).hostname;
    const ok = host === 'gov.cn' || host.endsWith('.gov.cn') || host === 'edu.cn' ||
      host.endsWith('.edu.cn') || host === 'org.cn' || host.endsWith('.org.cn');
    return ok ? { bucket: 'pass', url } : { bucket: 'review', url };
  } catch {
    return { bucket: 'drop', url: '' };
  }
}

// 学生相关：degree 含本科/硕士；degree 缺失时看文本关键词
const STUDENT_TEXT = /本科|硕士|高校|大学|应届|毕业生|大学生|青年/;
function studentRelevant(rec) {
  const deg = rec.conditions?.degree;
  if (Array.isArray(deg) && deg.length) {
    return deg.includes('本科') || deg.includes('硕士');
  }
  const text = `${rec.name || ''}${rec.notes || ''}`;
  return STUDENT_TEXT.test(text);
}

const CATEGORY_MAP = {
  living: '生活补贴',
  rent: '租房补贴',
  buy: '购房补贴',
  employment: '就业补贴',
  startup: '创业补贴',
  settlement: '落户奖励',
  talent: '人才引进',
  internship: '实习补贴',
  training: '培训补贴',
  other: '其他补贴',
};

// ---------- 工具 ----------
function fmtMoney(n) {
  if (typeof n !== 'number') return '';
  return n % 10000 === 0 ? `${n / 10000}万` : String(n);
}
function amountSummary(rec) {
  const a = rec.amount || {};
  const unit = a.unit || '元';
  if ((a.min ?? 0) === 0 && (a.max ?? 0) === 0) {
    return /免租|公寓|实物/.test(`${rec.name}${a.period || ''}`) ? '实物保障/免租（额度以官方口径为准）' : '额度以官方口径为准';
  }
  const range =
    a.min != null && a.max != null && a.min !== a.max ? `${fmtMoney(a.min)}–${fmtMoney(a.max)}` : fmtMoney(a.max ?? a.min);
  const period = a.period ? `，${a.period}` : '';
  return `${range}${unit}${period}`;
}
function tierList(rec) {
  const ta = rec.tieredAmount || {};
  return Object.entries(ta).map(([label, t]) => ({
    label,
    amount_min: Number(t.min ?? t.max ?? 0),
    amount_max: Number(t.max ?? t.min ?? 0),
    note: [t.period, t.durationMonths ? `累计${t.durationMonths}个月` : ''].filter(Boolean).join('，') || undefined,
  }));
}
function cityZh(rec) {
  if (PINYIN_CITY[rec.city]) return PINYIN_CITY[rec.city];
  const m = /^([一-鿿]{2,7}?)(市|·)/.exec(String(rec.location || ''));
  return m ? m[1] : rec.city;
}
function extractDates(rec) {
  const text = `${rec.application?.deadline || ''} ${rec.effectiveDate || ''}`;
  return [...new Set(text.match(/\d{4}-\d{2}-\d{2}/g) || [])];
}
function riskTags(rec) {
  const notes = String(rec.notes || '');
  return notes
    .split(/[；;。]/)
    .map((s) => s.trim())
    .filter((s) => s.startsWith('⚠️'))
    .map((s) => s.replace(/^⚠️\s*/, ''))
    .filter((s) => s.length <= 40)
    .slice(0, 4);
}
function statusOf(rec) {
  const notes = String(rec.notes || '');
  return /已过期|暂停|停止受理|失效/.test(notes) ? '已过期' : '有效';
}
function escYaml(s) {
  const str = String(s ?? '');
  // 纯日期串必须加引号，否则 YAML 解析成 Date 对象
  if (/^\d{4}-\d{2}(-\d{2})?$/.test(str)) return `'${str}'`;
  return /[:#\[\]{\n'"]/.test(str) ? `'${str.replace(/'/g, "''")}'` : str;
}

// ---------- 主流程 ----------
function loadAll() {
  const files = fs.readdirSync(ASSETS).filter((f) => f.endsWith('.js'));
  const records = [];
  const failures = [];
  for (const f of files) {
    const raw = fs.readFileSync(path.join(ASSETS, f), 'utf8');
    const errMark = PARSE_ERRORS.length;
    let parsed;
    try {
      parsed = extractLiterals(raw);
    } catch (e) {
      failures.push(`${f}: extract ${e.message}`);
      continue;
    }
    const subs = parsed.flatMap((p) => subsidyArrays(p));
    // 数据量大的文件却解析出 0 条 → 显式报错，不静默
    const idHits = (raw.match(/id[:`"]/g) || []).length;
    if (subs.length === 0 && idHits >= 5) {
      const why = PARSE_ERRORS.slice(errMark).join('；') || '无数组字面量命中补贴形状';
      failures.push(`${f}: 解析出 0 条（${why}）`);
    }
    for (const rec of subs) records.push({ rec, file: f });
    // 按 id 去重（多 chunk 可能重复）
  }
  const seen = new Set();
  const deduped = records.filter(({ rec }) => {
    if (seen.has(rec.id)) return false;
    seen.add(rec.id);
    return true;
  });
  return { deduped, failures, files: files.length };
}

function pipeline({ stats = false, dryRun = false }) {
  const { deduped, failures, files } = loadAll();

  if (stats) {
    const byCat = {};
    const byCity = {};
    let parseFiles = 0;
    let student = 0;
    let urlPass = 0;
    let urlReview = 0;
    for (const { rec, file } of deduped) {
      byCat[rec.category] = (byCat[rec.category] || 0) + 1;
      const c = cityZh(rec);
      byCity[c] = (byCity[c] || 0) + 1;
      const u = officialUrlCheck(rec);
      if (u.bucket === 'pass') urlPass++;
      else if (u.bucket === 'review') urlReview++;
      if (studentRelevant(rec)) student++;
    }
    const rawFiles = fs.readdirSync(ASSETS).filter((f) => f.endsWith('.js'));
    for (const f of rawFiles) {
      const raw = fs.readFileSync(path.join(ASSETS, f), 'utf8');
      if (/JSON\.parse\(`/.test(raw) || /var\s+[$\w]+\s*=\s*\[/.test(raw)) parseFiles++;
    }
    console.log(`chunk 文件 ${files} 个（疑似数据 ${parseFiles}），解析出补贴 ${deduped.length} 条`);
    console.log('解析失败:', failures.length ? failures.join(' | ') : '无');
    console.log('分类分布:', JSON.stringify(byCat));
    console.log(`学生相关(本科/硕士): ${student}`);
    console.log(`官方域名 pass: ${urlPass}，非官方域名待人工: ${urlReview}`);
    const cities = Object.entries(byCity).sort((a, b) => b[1] - a[1]);
    console.log(`城市数: ${cities.length}，前 15:`, cities.slice(0, 15).map(([c, n]) => `${c}${n}`).join(' '));
    return;
  }

  // 过滤 + 分桶
  const pass = [];
  const review = [];
  const dropped = { noUrl: 0, notStudent: 0 };
  const seenFile = new Set();
  for (const { rec, file } of deduped) {
    if (!studentRelevant(rec)) { dropped.notStudent++; continue; }
    const u = officialUrlCheck(rec);
    if (u.bucket === 'drop') { dropped.noUrl++; continue; }
    if (seenFile.has(rec.id)) continue;
    seenFile.add(rec.id);
    (u.bucket === 'pass' ? pass : review).push({ rec, file });
  }

  if (dryRun) {
    const lines = [
      `# 城市补贴雷达 → gov/city 条目 dry-run 清单（${VERIFIED}）`,
      '',
      `- 通过过滤（官方域名+学生相关）：**${pass.length} 条** → 将生成 md`,
      `- 非官方域名待人工复核：**${review.length} 条**（不在本轮生成）`,
      `- 剔除：无官方链接 ${dropped.noUrl} / 非学生对象 ${dropped.notStudent}`,
      '',
      '## 将生成（官方域名）',
      '',
      '| 城市 | 名称 | 分类 | 金额 | 官方域名 |',
      '|---|---|---|---|---|',
      ...pass.map(({ rec }) => `| ${cityZh(rec)} | ${rec.name} | ${CATEGORY_MAP[rec.category] || rec.category} | ${amountSummary(rec)} | ${new URL(officialUrlCheck(rec).url).hostname} |`),
    ];
    if (review.length) {
      lines.push('', '## 待人工复核（非官方域名，暂不生成）', '', '| 城市 | 名称 | 域名 |', '|---|---|---|',
        ...review.map(({ rec }) => `| ${cityZh(rec)} | ${rec.name} | ${new URL(officialUrlCheck(rec).url).hostname} |`));
    }
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(DRYRUN_PATH, lines.join('\n'), 'utf8');
    console.log(`dry-run 清单 → ${DRYRUN_PATH}（pass ${pass.length} / review ${review.length}）`);
    return;
  }

  // 生成 md（只生成 pass 桶）
  const existingCardCities = ['杭州', '成都', '武汉', '西安']; // 已有城市卡：本轮不新建（见计划：命中只增补）
  const outDir = path.join(OUT_DIR, 'money');
  fs.mkdirSync(outDir, { recursive: true });
  const citySeq = {};
  let written = 0;
  for (const { rec, file } of pass) {
    const zh = cityZh(rec);
    if (existingCardCities.includes(zh)) continue;
    citySeq[zh] = (citySeq[zh] || 0) + 1;
    const url = officialUrlCheck(rec).url;
    const id = String(rec.id).replace(/[^a-z0-9-]+/gi, '-').replace(/^-+|-+$/g, '') || `entry-${written}`;
    const tiers = tierList(rec);
    const tags = riskTags(rec);
    const dates = extractDates(rec);
    const deadlineRaw = String(rec.application?.deadline || '').trim();
    const validity = deadlineRaw || `自 ${rec.effectiveDate || '未知日期'} 起实施，以官方渠道当期口径为准`;
    const stages = /在校|在校生|大学生/.test(`${rec.name}${rec.notes || ''}`)
      ? ['在校', '应届毕业', '毕业1-3年']
      : ['应届毕业', '毕业1-3年'];
    const cond = rec.conditions || {};
    const eligParts = [];
    if (cond.degree?.length) eligParts.push(`${cond.degree.join('/')}`);
    if (cond.schoolLevel?.length) eligParts.push(`院校限 ${cond.schoolLevel.join('/')}`);
    if (cond.ageLimit) eligParts.push(`${cond.ageLimit} 周岁以下`);
    if (cond.graduationYear) eligParts.push('毕业 2 年内');
    if (cond.employmentRequired) eligParts.push('需本地就业并参保');
    if (cond.householdRequired) eligParts.push('需落户本地');
    const frontmatter = [
      '---',
      `title: ${escYaml(rec.name)}`,
      'pillar: gov',
      `stage: [${stages.join(', ')}]`,
      `region: 城市:${escYaml(zh)}`,
      `category: ${escYaml(CATEGORY_MAP[rec.category] || rec.category)}`,
      `value_level: ${escYaml(amountSummary(rec))}`,
      `eligibility: ${escYaml(eligParts.join('；') || '以官方渠道当期口径为准')}`,
      'steps:',
      ...(rec.application?.process?.length
        ? rec.application.process.map((s) => `  - ${escYaml(s)}`)
        : ['  - 通过官方渠道按当期经办指南申请']),
      ...(rec.application?.materials?.length
        ? ['materials:', ...rec.application.materials.map((s) => `  - ${escYaml(s)}`)]
        : ['materials: []']),
      `official_url: ${url}`,
      `deadline_or_validity: ${escYaml(validity)}`,
      ...(dates.length ? ['deadline_dates:', ...dates.map((d) => `  - ${d}`)] : ['deadline_dates: []']),
      ...(tiers.length
        ? ['tiers:', ...tiers.flatMap((t) => [`  - label: ${escYaml(t.label)}`, `    amount_min: ${t.amount_min}`, `    amount_max: ${t.amount_max}`, ...(t.note ? [`    note: ${escYaml(t.note)}`] : [])])]
        : ['tiers: []']),
      `confidence: 中`,
      ...(tags.length ? ['risk_tags:', ...tags.map((t) => `  - ${escYaml(t)}`)] : []),
      `source_name: ${escYaml(`${rec.policySource || rec.name}｜${SOURCE_TAG}｜数据文件 ${file}`)}`,
      `verified_date: '${VERIFIED}'`,
      `status: ${statusOf(rec)}`,
      `notes: ${escYaml(`镜像导入条目：官方链接与口径继承自城市补贴雷达镜像数据（${file}），金额/材料/流程以官方渠道当期口径为准。`)}`,
      '---',
      '',
    ].join('\n');
    const body = [
      `${rec.name}属${CATEGORY_MAP[rec.category] || rec.category}，${amountSummary(rec)}。`,
      '',
      rec.notes ? String(rec.notes).replace(/^有效。\s*/, '') : '',
      '',
    ].join('\n');
    const seq = String(citySeq[zh]).padStart(2, '0');
    const fname = `city-${rec.city}-${seq}-${id}.md`;
    fs.writeFileSync(path.join(outDir, fname), frontmatter + body, 'utf8');
    written++;
  }
  console.log(`生成 ${written} 条 → ${outDir}`);
  console.log(`跳过已有城市卡城市：${existingCardCities.join('/')}`);
  console.log(`未生成：非官方域名 ${review.length}（见 dry-run 清单）/ 无链接 ${dropped.noUrl} / 非学生 ${dropped.notStudent}`);
}

const mode = process.argv.includes('--stats') ? 'stats' : process.argv.includes('--dry-run') ? 'dry' : 'gen';
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) pipeline({ stats: mode === 'stats', dryRun: mode === 'dry' });
