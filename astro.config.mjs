// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// 自定义域名（阿里云 ECS / nginx，见 site/README.md 发布节）：
// site 固定为线上域（canonical/sitemap/og 全部依赖它）；若日后迁 GitHub Pages 项目站，
// 再改 site: 'https://<owner>.github.io' + base: '/<repo>'。
export default defineConfig({
  site: process.env.SITE_URL || 'https://daxue.beichen.help',
  base: process.env.BASE_PATH || '/',
  integrations: [sitemap()],
});
