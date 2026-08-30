# CloudBase 部署信息

- 环境名称：`yinxin-fenghuo-beta`
- 环境 ID：`yinxin-fenghuo-beta-d7bm0cd14d29`
- 地域：上海 `ap-shanghai`
- 套餐：免费体验版
- 静态托管域名：`yinxin-fenghuo-beta-d7bm0cd14d29-1473844298.tcloudbaseapp.com`
- 部署类型：Vite + React 静态网站（Hash 路由）
- 发布路径：`/`
- 构建目录：`dist/`

项目通过根目录 `cloudbaserc.json` 声明构建和上传规则。该配置不包含任何账号密码或访问密钥。

总站采用 Hash 路由，因此 `/` 下的静态托管不需要额外配置 SPA 回源规则。深层地址形如 `/#/archives`，刷新时仍请求根页面。

常见修改位置：

- 总站页面、路由和模块入口：`src/App.tsx`
- 总站视觉与移动端：`src/portal.css`
- 《银信烽火》剧情和交互：`src/features/yinxin/YinxinFenghuo.tsx`
- 《银信烽火》原视觉：`src/styles.css`
- 公开内容：`content/public/`

本轮 Campus 接入后，QP-001—QP-068 原图位于 `source-assets/qiaopi-index-originals/`，不会被复制到 `dist/`；前台只构建 `content/public/archive/archive-index-v1.json` 的索引元数据。含个人信息的项目证据位于被 Git 忽略的 `source-assets/private/`，部署前不应手动复制到 `public/`。

部署前必须先执行 `npm run build`。该命令会校验结构化内容，并只把 `content/public/` 编译到前台；`draft` 与 `private` 不进入 `dist/`。
