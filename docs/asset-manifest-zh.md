# 静态资源清单

## 网站直接使用

- `public/tidal-twin-seals-concept.webp`：实体推理盒与文创组合概念图。
- `public/a-pi-character-sheet.webp`：“阿批”IP 三视图、动作与表情设定。
- `public/portal-og.png`：总站 1200×630 社交分享预览图。
- `public/portal-og.svg`：总站分享图的可编辑矢量源文件。
- `public/og-v2.png`：《银信烽火》原始高清视觉图，完整保留。
- `public/og-v2-display.webp`：《银信烽火》页面使用的压缩展示版本。
- `public/favicon.svg`：浏览器页签图标。

`public/file.svg`、`public/globe.svg`、`public/window.svg` 为原工程保留的通用图标，当前页面未直接调用，但一并存档以保持资源完整。

## 原始高清设计图

- `source-assets/originals/tidal-twin-seals-original.png`：双印潮路实体文创概念原图。
- `source-assets/originals/a-pi-character-original.png`：阿批 IP 角色设定原图。
- `source-assets/qiaopi-index-originals/QP-001`—`QP-068`：Campus 项目工作区首轮侨批/侨乡图像索引原图，仅作受控核验素材，不进入 `public/`。
- `source-assets/qiaopi-index-originals/侨批资料分类索引V1.xlsx`：68 条索引的结构化来源文件；前台使用脱敏后的 JSON 元数据。

`source-assets/private/` 用于保存含姓名、学号或盖章信息的项目证据；该目录已被 Git 忽略，任何内容都不会进入公开构建或交接代码包。

原始 PNG 用于后续排版、裁切、印刷打样或生成新的网页优化版本；线上页面使用体积更小的 WebP 文件。
