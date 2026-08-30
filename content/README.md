# 内容系统

本站公开构建只读取 `content/public/**/*.json`。`draft` 进入项目但不会被 Vite 打包；`content/private/` 被 Git 忽略，禁止把内部资料提交到仓库。

## 状态

- `public`：来源、权利与个人信息检查通过，可进入页面和搜索。
- `draft`：已结构化但仍待核验、授权或补充上下文。
- `private`：原始内部材料、联系方式、学号、未授权采访等，只留在本机受控目录。

## 公开条目字段

公开条目必须包含 `id`、`slug`、`type`、`status`、`title`、`summary`、`body`、`verification`、`rightsNote` 与 `sources`。未知信息应为 `null` 或空数组，不得猜测补齐。

档案索引条目可以额外使用 `archiveStats` 与 `archiveRecords`：前者保存总数、分类和核验统计，后者保存编号、文档上下文、段落、尺寸、哈希与首轮用途。索引记录的上下文不是正式馆藏名称，原件素材应留在受控的 `source-assets/`，不要放进 `public/`。

影像条目可以使用 `externalUrl` 与 `mediaMeta` 提供外部播放入口和技术信息；奖项、发布日期等仍需在 `sources` 中注明证据等级。

## Obsidian 导入

```powershell
npm run content:import -- "C:\path\to\Campus\侨批"
```

导入器读取 Markdown 与常见 frontmatter，把内容写入 `content/imported-draft/`。即使笔记标为 `public`，默认也先作为草稿导入；完成来源、授权和隐私检查后，再由开发者移动至 `content/public/`。
