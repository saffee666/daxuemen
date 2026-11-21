# 第三方界面快照 · NOTICE

- 来源：`_雷达自用/notice-hub-v1.0.0/qq-live-digest/_internal/qq_live_digest/web_static/page.html`
- 产品：QQ 群务台（qq-live-digest）
- 版本：v1.1.0-beta.11（2026-10-26 本地安装）
- SHA-256：`4C1CB999DE1BC7B1BFCE4B3C3615F3263BA2C59F5DFBDEB0AAD7C1BC701727B5`
- 字节数：388,922

## 许可

- 该构建为 PolyForm Noncommercial 1.0.0（非商用）。
- 上游项目 `https://github.com/wc985732-lang/qq-live-digest` 为 MIT。
- 本站仅将其作为「界面演示」的静态快照，不提供该构建的下载或再分发；演示数据全部为虚构，页面通过 CSP 禁止任何网络请求。
- 若本站转为商业用途，应改用 MIT 上游构建或取得作者授权后再使用。

## 修改说明

`scripts/build-radar-demo.mjs` 在构建时对快照做最小补丁：

1. 注入 CSP（`connect-src 'none'`）、`noindex` 与演示脚本 `mock.js`；
2. 移除 manifest 引用与 service worker 注册；
3. 把二维码/捐赠图端点替换为演示 SVG；
4. 给 `<body>` 加 `data-pagefind-ignore`。

不改动页面原有业务逻辑与品牌信息。
