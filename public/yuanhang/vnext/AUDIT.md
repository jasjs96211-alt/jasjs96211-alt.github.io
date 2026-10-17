# vNext 阶段 0：现状与资产审计

核查日期：2026-10-17（北京时间）。基线：`d72e8e5d10f1eb46efa6ede51db31dcef07a2c03`。
这是实际源码/资源盘点，不是 P0 动画完成报告。未合并、未发布本次改动。

## PR 与 CI

| PR | GitHub 当前状态 | 已进入 main 的能力 / 处理 |
| --- | --- | --- |
| #10 `7b401e2` | merged | 六地点、独立日程、同行、北京时间；复用 `world.js` |
| #11 `81c048b` | merged | DDL 首日重伤/次日病中视觉；不得重写伤病规则 |
| #12 `c28e44e` | merged | 四组四帧动作、静态卧床 CG、来信创建快照；复用 |
| #13 `2304844` | merged | HUD、菜单、返回、清醒 UI；本轮不重复 |
| #14 `9c99df1` | merged | 手机来信、昼夜、六场景方向转场；本轮不重复 |
| #7 | open / draft | 已由 #9 替代，不以旧分支继续开发 |

#12 两轮审查已读。CG 解锁与来信地点两项修复在 `c28e44e` 中，主分支保留：
`motion.js` 的 `recoveryCGAllowed`、`app.js` 最终 `canViewRecoveryCG` 守卫、
`interaction.js` 创建时有效位置快照。不能回退为“在寝居就解锁”。

#10/#11/#12 head 的 PR Actions 查询返回空列表，不能把旧报告当实时 CI。
#14 head 最新 [WenDao Regression Checks / 39003973325](https://github.com/jasjs96211-alt/jasjs96211-alt.github.io/actions/runs/39003973325)
为 **success**，job `117312527763` 的 Node 回归与 build 均成功。
本次在最新 main 独立运行 `node --test public/yuanhang/tests/*.mjs`：**314 通过，0 失败**。
main 的 combined status 返回空列表，不把此结果说成“main 有绿色检查”。

## 可复用架构与缺口

| 层 | 文件与事实 | 决策 |
| --- | --- | --- |
| 外层站点 | React 19 + Vite 8；问道实际为 `public/yuanhang/index.html` 与原生 IIFE 脚本 | 不将问道强迁 React，不推倒重写 |
| 世界控制器 | `wendao/world.js`：纯 `derive()`、6 地点、北京时间、健康同行限制 | 复用位置与健康判定；不是连续坐标场景图 |
| 动作播放 | `wendao/motion.js`：4 组动画 WebP + 静态恢复 CG；`companion.js` 250ms 刷新 | WebP 内部帧不可逐事件驱动；不适合作为放书/端药的权威时间线 |
| 文案 | `world.js` 病中每 20 分钟选择标题，与床 CG 无动作联系 | 新行为快照必须同时供应阶段文案、clip、道具，禁止两套随机选择 |
| 计时 | `index.html` 内 `timerTick` / `WendaoBridge.focusState/focusAction`，保存 active segments | 唯一学习计时器；场景只能读取与调用原 start/pause/resume，不自己累计学习 |
| 长期事实 | `engine.js` 的伤病账本、恢复记录、vitals、CG 资格 | 只读；视觉转病中不解除 acute/serious |
| 来信 | `interaction.js` 的创建时世界位置 + 证据快照 | 保留历史快照；以后只追加合法行为事实，不改历史信件 |
| 自由 AI | `app.js::chatContext` 含人物/日程/阅读，但没有活动场景的统一动作快照 | 接入前要清理“历史日程”与“当前动作”的优先级；不能只在前端多加字段就声称后端已采纳 |
| 地点保存 | `yuanhang_wendao_world_view_v1` 是本地 UI key，不是共享权威位置 | **跨设备地点/动作同步未实现**；不可直接把该 key 塞进云存档宣称完成 |
| 缓存 | `sw.js` + versioned script URLs；已有版本匹配测试 | 正式接入时一起更新，不在审计阶段动生产外壳 |

## 实际美术审计

完整尺寸/帧数/字节/SHA256 见 `ASSET_INVENTORY.json`，由本次 checkout 的实际文件解码读取。

- 6 套人物立绘：RGBA 单帧，不是可拆身体部件；保持原字节。
- `zhiyao-{walk,read,herbs,meditate}-cycle.webp`：各 4 帧、627×627，均有 alpha。
  读书是坐凳姿，调息是盘膝蒲团姿，不可当病中卧姿。
- `zhiyao-recovery-cg.webp`：1536×1024 RGB **单帧**，人物、床、背景、药盏已合成。
- 6 处场景：单张 RGB 背景；不是前/中/远景独立层、深度遮挡图或可寻路网格。
- 未发现 PSD、Live2D、Spine、atlas、可控眼睑/瞳孔/嘴部/手部层、卧坐转换帧。
- 已直接查看寝居 CG、寝居背景、坐凳读书图及用户全部 3 张截图。现有 CG 风格是形象锚点，不能以新画风的占位人物取代。

**阻塞正式 P0 的缺口**：卧姿呼吸变形可用的身体/被褥层、睁闭眼/瞳孔、
弱笑、握书/翻页/放书的手与袖、药盏拿起/抿药/放回、卧姿与倚枕/半坐之间的连续过渡。
具体交付规格见 `ASSET_SPEC.md`。现有完整大图不能可靠提供这些隐藏结构。

## 选型与实施范围

推荐先做与渲染器无关的纯行为控制器：输入只读业务快照、已验证资产能力、受测时钟；
输出唯一 `actionId/phase/clip/props/anchor/text`。不能由 LLM 指定地点、伤势或计时。

| 选项 | 适用性 | 此轮结论 |
| --- | --- | --- |
| 继续 animated WebP | 现有四帧日常循环可保留，但难以在放下书准确帧同步道具与文字 | 不用于新的可中断寝居动作链 |
| Canvas2D + 外部行为控制器 | 适合小范围姿态/道具/遮挡 POC，无依赖；可用技术骨架验证挂点 | 仅用作明确标识的技术排演，不是温知遥正式美术 |
| PixiJS | 更适合后续多层纹理、网格变形、遮挡排序；需真实资产与 Safari WebGL POC | 推荐正式资源验证后优先评估；本次未安装/未实测，不宣称选型完成 |
| Phaser | 地图/寻路/多个 NPC 阶段可能有用；当前只做寝居，系统较重 | 暂不引入 |

阶段 0 PR 只放审计与资产规格。后续技术切片 PR 叠在其上，不抢 UI 文件。
正式生产接入必须以真实动作素材和原计时桥接为门槛。无正式素材的排演保持独立页面、显式标注，
不替换原 CG、不接正式数据、不标为 P0 验收通过。

## 冲突与验收风险

1. 生产接入涉及 `companion.js/app.js/index.html/sw.js`，与 #13/#14 有交叉；每阶段先刷新 main，不能复用旧整文件。
2. 睡眠需要区分玩家休息与姐姐睡眠，不可用玩家 supervision.mode 直接唤醒/催眠姐姐。
3. `portrait='ill'` 与 `acuteInjury=true` 可同时成立；动作许可必须以业务限制为先。
4. 资产加载失败时不能继续写“翻书/端药已完成”；互斥道具不能同时占手。
5. 设备回到前台不补播中间动作，不因渲染停顿结算学习/处罚；时间争议保持暂停。
6. 实机浏览器、iPhone/PWA、跨设备云同步、模型真实上下文均待验。本环境未提供 `control-browser`，
   Sites managed preview 规则要求不启用替代浏览器路径；不伪造运行录屏或 FPS。

## 正式 P0 放行条件

资产齐备并通过脸型/手部/遮挡检查 → 真实 clip 回放 → 接原计时桥接与 AI 快照 →
5 分钟待机 + 25 分钟暂停/恢复 + CG/伤病回归 → 桌面及 iPhone 实测 → 用户审阅 PR。
本审计不改学习、伤病规则、数据库或线上内容。
