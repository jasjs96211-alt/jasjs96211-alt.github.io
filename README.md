# 纸短情长｜侨批文化数字展陈与研究平台

由《银信烽火》Beta 升级而来的侨批项目总站。网站以数字资料库、项目成果展示、数字人文展陈和文创实验为长期方向；原有五人阵营推理作为“文创实验室”下的完整子项目保留。

## 当前公开地址

[https://yinxin-fenghuo-beta-d7bm0cd14d29-1473844298.tcloudbaseapp.com](https://yinxin-fenghuo-beta-d7bm0cd14d29-1473844298.tcloudbaseapp.com)

当前站点由腾讯云 CloudBase 静态托管，环境 ID 为 `yinxin-fenghuo-beta-d7bm0cd14d29`，区域为上海。

项目正在迁移到 GitHub Pages。目标仓库为 `jasjs96211-alt.github.io`，发布成功后的默认地址为 `https://jasjs96211-alt.github.io/`；腾讯云旧站在新站验收前继续保留。

## 主要结构

- `src/App.tsx`：总站路由、首页、栏目、搜索、筛选、地图与时间轴。
- `src/features/yinxin/YinxinFenghuo.tsx`：《银信烽火》完整 Beta 交互。
- `src/portal.css`：总站视觉与响应式样式；`src/styles.css` 保留原游戏视觉。
- `content/public/`：参与公开构建的结构化 JSON 内容；当前 18 条公开条目，其中档案索引条目包含 68 条 QP 图像与元数据记录。
- `content/draft/`：待核验、待授权内容，不进入浏览器构建。
- `scripts/`：内容校验和 Obsidian Markdown 导入脚本。
- `docs/`：资料盘点、信息架构、部署说明和资源清单。
- `source-assets/originals/`：原始高清设计图，仅供后续再加工。
- `public/archive/`：QP-001—QP-068 的网页优化图像；原始编号与来源信息保留在档案索引中。
- `source-assets/qiaopi-index-originals/`：Campus 项目工作区 QP-001—QP-068 源图与索引工作簿，仅供人工核验。

## 路由方式

首版使用 Hash 路由，例如 `/#/archives`、`/#/creative/yinxin-fenghuo/play`。这样静态托管无需新增回源重写规则，刷新深层页面也不会得到 404。

## 本地运行

需要 Node.js 22.13 或更高版本。

```powershell
npm ci
npm run dev
```

## 构建

```powershell
npm run build
npm run preview
```

构建会先运行内容校验。公开条目缺少来源、路径状态不一致、重复 ID/slug、疑似个人信息或缺失图片时，构建会失败。

## 内容与 Obsidian

公开、草稿和私密材料严格分离：

- `public`：进入页面、筛选和搜索索引；
- `draft`：进入内容系统，但不打包到前台；
- `private`：只保留在本地资料源，`content/private/` 已被 Git 忽略。

导入 Obsidian Markdown 时执行：

```powershell
npm run content:import -- "C:\path\to\vault-or-folder"
```

脚本读取 frontmatter，输出到 `content/imported-draft/`，并且始终按草稿导入。标记为 `private` 或疑似含手机号、邮箱、学号的文件会跳过；人工核验来源与权利后，才可移动到 `content/public/`。

## 部署到现有 CloudBase 环境

首次在新电脑部署时先登录腾讯云：

```powershell
npx tcb login
```

确认构建和内容校验通过后执行：

```powershell
npm run deploy
```

也可以将已经构建好的 `dist/` 直接部署到现有环境：

```powershell
npm run deploy:direct
```

`cloudbaserc.json` 已固定现有环境 ID、上海区域与 Vite 构建目录；不要另建同名环境。

## 部署到 GitHub Pages

仓库需命名为 `jasjs96211-alt.github.io` 并设为公开。仓库设置中选择 `Pages → Source → GitHub Actions` 后，每次推送到 `main` 都会运行 `.github/workflows/deploy-pages.yml`，完成内容校验、Vite 构建和网站发布。

## 恢复点

- 原始完整 Beta 基线：`aebb032`

总站改动未重写原游戏剧情和玩法状态机。

## 安全说明

交付包不含腾讯云密码、登录令牌、API 密钥或本机授权文件。部署时由项目账号持有人完成腾讯云网页登录授权。
