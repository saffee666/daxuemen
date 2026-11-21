#!/usr/bin/env node
/**
 * 从 vendor/radar/page.html 生成可公开托管的界面演示。
 * 只做静态脱敏：注入 CSP/演示脚本、移除 service worker、替换二维码与 API 地址。
 * 任何关键锚点缺失都会直接失败，避免上游升级后静默生成坏页面。
 */
import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceHtml = join(root, 'vendor', 'radar', 'page.html');
const assetDir = join(root, 'scripts', 'radar-demo');
const args = process.argv.slice(2);

function argValue(name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

const outDir = resolve(root, argValue('--out', 'dist/radar-demo'));
const cleanOnly = args.includes('--clean-only');

if (cleanOnly) {
  rmSync(outDir, { recursive: true, force: true });
  console.log(`[radar-demo] cleaned ${outDir}`);
  process.exit(0);
}

if (!existsSync(sourceHtml)) {
  throw new Error(`[radar-demo] missing vendor page: ${sourceHtml}`);
}

const mockSource = readFileSync(join(assetDir, 'mock.js'), 'utf8');
const mockHash = createHash('sha256').update(mockSource).digest('hex').slice(0, 12);
const mockFile = `mock.js?v=${mockHash}`;

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'none'",
  "media-src 'none'",
  "object-src 'none'",
  "frame-src 'none'",
  "worker-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

function replaceOnce(html, search, replacement, label) {
  const index = html.indexOf(search);
  if (index < 0) throw new Error(`[radar-demo] anchor not found: ${label}`);
  if (html.indexOf(search, index + 1) >= 0) {
    throw new Error(`[radar-demo] anchor is not unique: ${label}`);
  }
  return html.slice(0, index) + replacement + html.slice(index + search.length);
}

function replaceAll(html, search, replacement, label, minimum = 1) {
  const count = html.split(search).length - 1;
  if (count < minimum) {
    throw new Error(`[radar-demo] expected >= ${minimum} of ${label}, found ${count}`);
  }
  return html.split(search).join(replacement);
}

let html = readFileSync(sourceHtml, 'utf8');

// 1. charset 之后立刻注入 CSP、noindex、演示脚本（必须早于页面读取主题的脚本）。
html = replaceOnce(
  html,
  '<meta charset="utf-8">',
  [
    '<meta charset="utf-8">',
    `<meta http-equiv="Content-Security-Policy" content="${CSP}">`,
    '<meta name="robots" content="noindex, nofollow">',
    `<script src="./${mockFile}"></script>`,
  ].join('\n'),
  'meta charset'
);

// 2. 移除 PWA manifest，避免演示页被当成可安装应用。
html = replaceOnce(
  html,
  '<link rel="manifest" href="/manifest.webmanifest">',
  '<!-- demo: manifest removed -->',
  'manifest link'
);

// 3. 移除 service worker 注册；演示页不需要离线缓存。
const swBlock = [
  "if ('serviceWorker' in navigator && location.protocol === 'https:') {",
  "  window.addEventListener('load', function () {",
  "    navigator.serviceWorker.register('/sw.js').catch(function () {});",
  '  });',
  '}',
].join('\n');
html = replaceOnce(html, swBlock, '// demo: service worker disabled', 'service worker block');

// 4. 二维码全部换成不可扫描的演示图。
html = replaceOnce(
  html,
  "'/api/napcat/qrcode?token=' + encodeURIComponent(setupToken) + '&t=' + Date.now()",
  "'./qr-demo.svg?demo=qq'",
  'NapCat login QR'
);
html = replaceAll(
  html,
  "'/api/app/qr.png?base=' + encodeURIComponent(pairUrl) + '&token=' + encodeURIComponent(token)",
  "'./qr-demo.svg?demo=pair'",
  'pair QR',
  1
);
html = replaceAll(
  html,
  "'/api/app/qr.png?base=' + encodeURIComponent(candidateSelect.value) + '&token=' + encodeURIComponent(token)",
  "'./qr-demo.svg?demo=pair-candidate'",
  'pair candidate QR',
  1
);
html = replaceOnce(
  html,
  "'/api/sync/qr.png?text=' + encodeURIComponent(address) + '&token=' + encodeURIComponent(setupToken) + '&t=' + Date.now()",
  "'./qr-demo.svg?demo=sync'",
  'calendar sync QR'
);
html = replaceOnce(
  html,
  'src="/api/donate/qr.png"',
  'src="./donate-demo.svg"',
  'donate QR'
);

// 5. 标题与 Pagefind 排除。
html = replaceOnce(html, '<title>群消息待办</title>', '<title>群务台 · 界面演示</title>', 'page title');
html = replaceOnce(html, '<body>', '<body data-pagefind-ignore>', 'body tag');

// 6. 生成后断言：没有残留的 API 资源地址或可安装/联网入口。
const forbidden = [
  ['<link rel="manifest"', 'manifest link'],
  ['navigator.serviceWorker.register', 'service worker registration'],
  ['src="/api/', 'API image source'],
];
for (const [needle, label] of forbidden) {
  if (html.includes(needle)) throw new Error(`[radar-demo] leftover ${label}`);
}
if (!html.includes(`./${mockFile}`)) throw new Error('[radar-demo] mock script not injected');
if (!html.includes('data-pagefind-ignore')) throw new Error('[radar-demo] pagefind ignore missing');
if (!html.includes("connect-src 'none'")) throw new Error('[radar-demo] CSP missing');
if ((html.match(/\.\/qr-demo\.svg/g) || []).length < 4) {
  throw new Error('[radar-demo] not all QR endpoints were replaced');
}
if (!html.includes('./donate-demo.svg')) throw new Error('[radar-demo] donate QR not replaced');

// 7. 写输出：每次重建先清空，避免旧 hash 的 mock.js 残留。
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'index.html'), html, 'utf8');
writeFileSync(join(outDir, 'mock.js'), mockSource, 'utf8');
for (const asset of ['qr-demo.svg', 'donate-demo.svg']) {
  copyFileSync(join(assetDir, asset), join(outDir, asset));
}

const bytes = Buffer.byteLength(html, 'utf8');
console.log(`[radar-demo] wrote ${join(outDir, 'index.html')} (${bytes} bytes, mock ${mockHash})`);
