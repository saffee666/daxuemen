# 大学补给站 · 大学门道

以「信息差消除」为核心的大学生全景式导航与决策平台：**校园门道**（避坑/学习/生活/开源挣钱）+ **社会支持**（政府的钱/企业的让利/平台的预算，核对过的存量条目）+ **信息差工具**（自查/认证导航/叠加逻辑/决策器）+ **雷达**（本机群消息 → 待办，站点提供安装说明与界面演示）。

> 需求见 `../knowledge/产品-大学门道.md` 与 `../knowledge/条目模型.md`；条目字段规范见 `src/content.config.ts`（zod schema，坏数据 build 即报错）。

## 本地开发

```bash
npm install
npm run dev        # http://localhost:4321（predev 会把雷达演示生成到 public/radar-demo）
npm run build      # astro build → pagefind 中文索引 → 生成 dist/radar-demo
npm run preview    # 预览产物（含搜索与演示）
npm run audit      # 扫描超期条目（verified_date 超 6/12 个月）
```

搜索索引只在 `build` 后存在；`dev` 模式下搜索页会提示「索引尚未生成」。

## 目录

```
src/content/money/   钱条目 506 个 md 平铺，按文件名前缀分族：gov- 11 / city- 383（含 8 张城市卡 +
                     270 雷达镜像导入 + 105 AGIHunt 镜像导入）/ benefits-dom- 31 / benefits-int- 52 /
                     platform- 12（pillar 只有 gov/corporate/platform 三值；city- 归 gov，benefits- 归 corporate）
                     镜像导入条目：官方链接继承自镜像数据，verified_date 记导入月（2026-11），无官方链接者不入库
src/content/dao/     道条目 46 个，前缀分四族：pits 避坑 21 / learn 学习 9 / life 生活 11 / earn 开源 5
src/content/guides/  攻略长文 12 篇（guide-01~04 自有，guide-05~09 自竞品教程改编，guide-10~12 自 Ac-Wiki/快报/CA 改编）
src/components/      site / entries / radar 三组子目录 + 根下 EntryCard、FilterList
src/layouts/         Layout / BareLayout
src/lib/             pillars / categories / content / freshness / url / radar / site / pricing
src/pages/           首页、支柱、条目、城市、攻略、工具（向导/认证/叠加/决策）、雷达、搜索、关于、404、robots
src/scripts/         客户端脚本（筛选、工具步进、演示桥接）
src/styles/          tokens / base / site / motion / radar 五份 CSS（motion 为主站动效层，雷达页不参与）
scripts/audit.mjs    月度巡检脚本
scripts/category-stats.mjs    按 pillar×category 打印计数核对表
scripts/extract-radar.mjs     城市补贴雷达镜像 → gov/city 条目提取（--stats/--dry-run/生成）
scripts/extract-agihunt.mjs   AGIHunt 镜像 → gov 条目提取（含与现有条目对账去重）
scripts/fill-auth-channel.mjs 认证渠道字段启发式补录（一次性，跳过清单出工单）
scripts/build-radar-demo.mjs  雷达演示构建（补丁 + mock 注入）
scripts/radar-demo/  演示用 mock.js、假二维码 SVG
monitor/sources.yml  D2 政策页监控种子配置（v1 不启用）
vendor/radar/        上游群务台 page.html 快照 + NOTICE.md（版本/来源/SHA-256/许可）—— 应随仓库提交
.github/             纠错 Issue 表单 + 定时工作流
```

## 雷达演示（/radar/demo）

- 演示页由 `vendor/radar/page.html` 构建生成，**生成物不提交**：`public/radar-demo/` 已加入 `.gitignore`。
- `build-radar-demo.mjs` 对关键锚点做断言，缺一个就构建失败；补丁内容：CSP `connect-src 'none'`、noindex、`mock.js`、假二维码、移除 manifest 与 service worker。
- `mock.js` 只拦截 `/api/*`，返回虚构数据；页面内不产生任何真实请求。演示数据相对「今天」生成，隔天打开仍然成立。
- Pagefind 在演示生成**之前**运行，且演示 `<body>` 带 `data-pagefind-ignore`，搜索不会收录演示内容。
- 许可：演示所用构建基于 PolyForm 非商业许可，上游项目为 MIT；本站不托管、不再分发安装包。

## 发布（阿里云 ECS · daxue.beichen.help，2026-11-08 上线）

```bash
npm run build                                    # 本地构建（含 pagefind 索引 + 雷达演示）
tar -C dist -czf "$env:TEMP\daxue-site.tar.gz" .
scp -i ~/.ssh/alicloud_root "$env:TEMP\daxue-site.tar.gz" root@39.106.188.238:/tmp/
ssh -i ~/.ssh/alicloud_root root@39.106.188.238 "rm -rf /var/www/daxue && mkdir -p /var/www/daxue && tar -xzf /tmp/daxue-site.tar.gz -C /var/www/daxue && rm /tmp/daxue-site.tar.gz"
```

- 站点根 `/var/www/daxue/`，nginx 配置 `/etc/nginx/sites-enabled/daxue`（80→301 + 443 SSL + `_astro/` 30 天缓存 + `radar-demo/` noindex）
- 证书：acme.sh dns_ali 签发 `~/.acme.sh/daxue.beichen.help_ecc/`，每日自动续期 cron 已就位
- `src/lib/site.ts` 的 owner/repo 未填（无 GitHub 仓库），纠错按钮回退 `/about#correction`
- 更新内容只需重跑构建 + 上传三行命令；服务器部署运维详见 `D:\A我的\通用\3-工具环境\云服务器\阿里云ECS-部署运维.md`

## 内容纪律

- category 用词表：`src/lib/categories.mjs` 是单一真源（按支柱分表），schema superRefine 按 pillar 校验；加类别先改词表再写条目
- 钱条目：官方链接 + 核对日期强制；金额不确定不写
- 道条目：来源引用必标类型；纯经验帖须双源印证
- 引用数据：全国性政策底稿来自 [ncss.cn 官方清单](https://www.ncss.cn/ncss/gjjdfjyzc/gj/zczcqd.shtml)；城市条目逐城采自各市人社局官网（来源见条目页）
- 过期条目标过期态，绝不静默删除

## 零件来源与贡献（2026-10-31 局部增强上站）

骨架与 IA 为门道自有；以下组件/机制改写自 `_素材/复刻/_原子/` 三箱竞品零件（换肤：删箱内 tokens.css、由 `src/styles/tokens.css` 供货；原站 logo/配图零使用），职能依据见 `../knowledge/竞品-职能拆解.md`：

- **学生省钱快报箱** → 首字回落色块（logo onerror 回落改写，`EntryCard` + `.entry-logo`，色相由 entry.id 散列）；`difficulty` 申请难度徽标（元信息表「申请难度」上卡）；FAQ 段的详情页标配位
- **会员比比箱** → 价格走势 SVG + 「当前=最低」+ 月均换算（`PriceTrend.astro` + `lib/pricing.ts`，price-watch/chart 改写，构建时渲染零客户端 JS）；FAQ 手风琴（`FaqBlock.astro`，faq 组件改写）；`risk_tags` 风险徽标上卡（「自动续费」红标机制泛化）
- **AGIHunt 箱** → `confidence` 可信徽标语义（官方链接直达精度：直达活动/文件页=高、仅到门户=中）；列表页计数条与空态沿用现有 `FilterList` 实现（AGIHunt 同职能，不重复上件）
- **schema 增字段**（`src/content.config.ts`，均可选）：`difficulty`（难/中/易）、`confidence`（高/中）、`risk_tags[]`、`price_history[]`（date+price+months+note）、`faq[]`（q+a）；编辑口径见 `../knowledge/条目模型.md`
- 一句话「谁贡献了什么」：骨架=门道现站；可信机制底座=AGIHunt 语义+比比阈值本地化（既有）；本轮新增徽标与字段=快报元信息表+比比卡面风险标；价格走势+月均=比比；FAQ=两竞品共识；首字回落+难度=快报；about 四步自白=快报四步改写（门道自有叙事）
- **没取（原因）**：比比 `verdict` 买前必看结论条——与详情页 `detail-summary` + `VerifyStrip` 职能重叠，避免重复模块；工具页矩阵/联盟变现/TG bot/双语/GA/浏览量社交证明——见 `../knowledge/竞品-职能拆解.md` 独有清单（默认不取）
