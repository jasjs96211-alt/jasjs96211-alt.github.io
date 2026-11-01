# 自主生活正式入口接线审计 · T0—T3

日期：2026-10-31，北京时间。状态：开发分支正式入口已接线，尚未合并 main 或发布生产；不代表正式人物动作、手机或三维视觉验收完成。

## 工程基线与续接判断

- GitHub 重新读取 main：`6e492b645a801f373c7237e8d6421a4eaeea6021`。
- GitHub PR #26：Open / Draft，head `49803523bcaaa86dd41f5583786d6ccc4da039ea`，41 文件。没有新提交可继续接线。
- 本机 `yuanzhou-recovery` 开工时工作树干净，HEAD 与 PR #26 一致。另有未完成克隆目录 `yuanzhou` 和独立 `wendao-25d-site`，未覆盖。
- “继续工作模式”聊天没有可见的代码交付；前一开发聊天停在 C1 恢复/2.5D 方向调整。未获得 C1 原代码，不能把其 430 项测试或 e2e2b8f 提交算作本轮成果。
- 新建 `feature/production-life-t1-t3-20261031`，以 PR #26 分支为审阅基线；独立 PR 只审查本轮接线差异。不能直接把包含所有实验的 PR #26 整包合入 main。
- 已读 HANDOFF_CURRENT、LIFE_JOURNAL_L1、LIFE_BRIDGE_R23、PROP_CONTACT_R25、旧审计、历史交接索引及角色资产说明。历史原文保留。

## 开工审计与改动接口

| 入口/模块 | 原状 | 本轮处理 |
| --- | --- | --- |
| engine.advanceAutonomy / independent | 已有稳定事实与收益，不能重写 | 保留基本事件与结算，协调层仅负责顺序和核验门控 |
| dailyUpdates / openStage / setMode | 各自直接生成基础事件/纪事，遗漏 L1 | 均进入 E.advanceLife；app 先做设备时间与已核验午睡检查 |
| life-journal | 四类确定性细化已可复用，未接生产 | 直接复用；加强缺前置记录/非法细节的 unresolved 处理，不增加奖励 |
| commit / migrateLegacySave / reloadLocal | 整份 life 可保存，但 detailState 无验证 | 验证版本、时间与 hold；载入/合并重新 reconcile |
| cloudRead / cloudApply | 云端是快照替换，不是一次新合并 | 仍替换快照，保留本机单调生活/细节游标及暂停状态；重建演出基线 |
| cloud.js mergeWendao / conflict merge | 实际调用 E.merge | E.merge 合并元数据并复核细节；无需改服务端或创建第二份台账 |
| world.schedule / companion / interaction | 20分钟展示调度与台账、来信可能不同 | 注入只读投影；正式路径不再用展示时间表或跟随专注切换日程；旧独立适配接口保留 |
| renderStage | 主书房无条件显示人物 | 非剧情回放时依据投影在场性显示；异地人物不凭空出现，留笺标明留笺 |
| recapTimeline / renderNightRecap | 逐时点 UI 已有，缺细节过滤与前因 | 原 UI 内显示真实子事件 ID/来源/前置 ID；过滤 unresolved；不重建时间轴 |
| 新纪事快照 | 午夜生成后本夜后续细节可能不在 eventIds | 仅新标记 lifeDetails 的纪事继续收录真实时间窗事件；旧快照保持原样 |
| scene3d bridge/source | R2.3/4 接口有效，只有寝居样板消费者 | 复用稳定 ID、序号、过期、接管、隐藏和健康检查；CG 适配器只接收意图，不写业务 |
| 静态入口/SW | 未加载 L1 | 生成同源经典脚本 production-life.js，先于 app 加载；更新缓存及所有受改脚本版本 |

## 风险与实际边界

1. **重复收益**：detail 保持零 delta，原 vitals 仅处理基础 study/rest；重复推进、重载、双端合并测试验证去重。日常独立行动保留原稳定日 ID。
2. **来源失效**：合并后重新核对父事件、前置细节、身体状态与活动替代；失效记录保留作审计但不进纪事、AI事实或活动投影。
3. **时钟/离线争议**：基础与细节暂停；完成原时间/离线核验后，使用“从现在继续生活”显式建立新基线，不回补不确定区间。
4. **快照恢复**：只保留本地单调游标，不私自并入本地台账或收益；远端新旧差异由原账户三方合并处理。未登录真实账号执行远程写入，本轮云验证为实际代码路径的自动测试。
5. **旧动画**：首次、重新打开、后台恢复、位置/权限变化、云载入重新建立场景来源基线。演出接收不等于素材动作已经发生。
6. **玩家独立性**：计时启动/暂停、地图移动都不安排姐姐的活动；有权威投影时不允许仅由展示层“同行”改变她的位置。旧按钮保留，但不把邀请转化为未记录的行动。
7. **既有剧情**：原引擎的准备期压力事件规则未增加；没有随机新增伤病、求援、药品使用或主线。剧情回放继续使用原 VN 场景，不当作实时活动。
8. **仍待验收**：手机 Safari/PWA、真实双设备账户同步、WebGL GPU、正式人物与动作。当前窄窗口的旧顶栏会遮挡部分人物，是待用户反馈的视觉问题，不把本轮宣称为视觉封板。

## 资产审计（T4 准入，不实施 T4）

- 仓库未找到 PSD/PSB/KRA/ORA/Blend 原始角色分层文件。
- `zhiyao-recovery-cg.webp` 及寝居昼夜/闭眼/问候资源为完整合成构图；原 bedroom-renderer 的局部呼吸、眼睛、压咳逻辑保留，不抠图、不改脸。
- 既有 read/walk/herbs/meditate 四帧 WebP 和静帧有透明通道（MOTION_V1_6.json 与原自动测试）；这是旧 2D 资产，并非三维固定机位/遮挡/接触已获批准的最终角色层。
- 正式阅读可使用原阅读静帧；摘记、收卷、问询、整理缺对应最终动作时显示投影文字与原静态角色。没有横向移动一张立绘冒充行走。
- 三维几何、三机位、光照、路径、书碗接触及 action-flow 均保留。只改 ledger-source 的可注入快照适配及细节过滤；R2.5 代理未接管正式人物。
- 后续素材缺口：合格的寝居透明人物层、机位匹配的坐卧姿态、摘记/收卷/真正掩嘴/端药动作及方向性行走衔接。由用户控制人物制作。

## 验证证据

- 新增 `tests/production-life.mjs`：15 项，首次基线、四类细节、起床生命周期、离线/时钟、旧存档校验、云合并/替换、来源断链、活动投影、独立计时、场景去重/后台基线、夜间增量、主书房在场性。
- 保留 L1 16 项、场景桥/来源测试、真实账户合并代码测试、DDL/睡眠/学习/AI/图片与像素回归。旧 UI fixture 改为合法 life:v4 来源；旧“玩家同行决定人物地点”的断言改为权威事实优先。旧动画模块仍有独立测试，没有删除覆盖。
- Windows 兼容修正：像素测试使用 fileURLToPath，环境路径断言兼容分隔符；带哈希的源文件固定 LF，避免 checkout 换行导致假阳性。无新增/升级依赖。
- 桌面内置 Chromium 实际打开 `http://127.0.0.1:5173/yuanhang/index.html`：主书房无异地人物；地图从书房到竹庭时姐姐仍在寝居；“去找姐姐”到寝居；陪伴计时启动/暂停，姐姐仍安静休息；复位六秒测试，不写学习分钟；重新打开可用。
- 桌面截图：本机工作区 `output/production-life-desktop.png`。截图证明实际界面，不证明移动设备或新增分钟事件的长时间实机运行。
- 公网生产仍未修改。全量测试/构建最终计数见本文件末尾的交付结果。

## 历史需求逐项对应

下表为本轮增量回执；完整原文及历史状态保留在 HANDOFF_CURRENT.md。自动测试一律不替代视觉验收。

| ID | 实现文件 | 测试证据（tests/） | 视觉证据 | 本轮状态 |
| --- | --- | --- | --- | --- |
| A01 | app.js / index.html | wendao-ui.mjs | 桌面已打开 | 双入口保留，本轮正式入口加载生活模块 |
| A02 | world.js / companion.js / HANDOFF_CURRENT.md | v1.6-world.mjs / main-map-shortcuts.mjs | 桌面入口已看；其他视觉未新增 | 保留原要求，未扩六地点动作或重做美术 |
| A03 | scene3d/* / 原寝居资产 | scene3d-bedroom.mjs / scene3d-actions.mjs / scene3d-prop-contact.mjs | 本轮未测WebGL/GPU | 保留R1/R2.5研究成果，T4未推进 |
| A04 | motion.js / life-presentation.js | production-life.mjs | 正式动作待素材 | 部分：不补演/不平移；缺动作使用静态降级 |
| A05 | app.js / companion.js | main-map-shortcuts.mjs / production-life.mjs | 桌面地图、启动/暂停已操作 | 地图与计时分离，独立生活不跟随地图 |
| A06 | scene3d/* / 原寝居资产 | scene3d-bedroom.mjs / scene3d-actions.mjs / scene3d-prop-contact.mjs | 本轮未测WebGL/GPU | 保留R1/R2.5研究成果，T4未推进 |
| A07 | companion.js / world.css | v1.6-mobile-polish.mjs | 截图已记，非视觉完成 | 旧UI保留；窄窗口顶栏遮挡人物待调整 |
| A08 | world.js / companion.js / HANDOFF_CURRENT.md | v1.6-world.mjs / main-map-shortcuts.mjs | 桌面入口已看；其他视觉未新增 | 保留原要求，未扩六地点动作或重做美术 |
| A09 | scene3d/* / 原寝居资产 | scene3d-bedroom.mjs / scene3d-actions.mjs / scene3d-prop-contact.mjs | 本轮未测WebGL/GPU | 保留R1/R2.5研究成果，T4未推进 |
| B01 | bedroom-behavior.js / bedroom-renderer.js | vnext-bedroom.mjs / vnext-pixels.mjs | 正式动作与手机待验 | 原2D实现保留；完整动作/角色细节未新增 |
| B02 | bedroom-behavior.js / bedroom-renderer.js | vnext-bedroom.mjs / vnext-pixels.mjs | 正式动作与手机待验 | 原2D实现保留；完整动作/角色细节未新增 |
| B03 | bedroom-behavior.js / bedroom-renderer.js | vnext-bedroom.mjs / vnext-pixels.mjs | 正式动作与手机待验 | 原2D实现保留；完整动作/角色细节未新增 |
| B04 | bedroom-behavior.js / bedroom-renderer.js | vnext-bedroom.mjs / vnext-pixels.mjs | 正式动作与手机待验 | 原2D实现保留；完整动作/角色细节未新增 |
| B05 | bedroom-behavior.js / bedroom-renderer.js | vnext-bedroom.mjs / vnext-pixels.mjs | 正式动作与手机待验 | 原2D实现保留；完整动作/角色细节未新增 |
| B06 | bedroom-behavior.js / bedroom-renderer.js | vnext-bedroom.mjs / vnext-pixels.mjs | 正式动作与手机待验 | 原2D实现保留；完整动作/角色细节未新增 |
| B07 | bedroom-behavior.js / bedroom-renderer.js | vnext-bedroom.mjs / vnext-pixels.mjs | 正式动作与手机待验 | 原2D实现保留；完整动作/角色细节未新增 |
| B08 | life-projection.js / bedroom-behavior.js | production-life.mjs / vnext-bedroom.mjs | 睡眠实机长时段待测 | 睡眠不主动唤醒；已有细微动作保留 |
| B09 | life-projection.js / motion.js | production-life.mjs / v1.6-injury-visual.mjs | 正式手/书/衣袖待验 | 伤中不坐起；有效研读用原静帧，翻页待批准 |
| B10 | bedroom-behavior.js / bedroom-renderer.js | vnext-bedroom.mjs / vnext-pixels.mjs | 正式动作与手机待验 | 原2D实现保留；完整动作/角色细节未新增 |
| B11 | bedroom-behavior.js / bedroom-renderer.js | vnext-bedroom.mjs / vnext-pixels.mjs | 正式动作与手机待验 | 原2D实现保留；完整动作/角色细节未新增 |
| B12 | bedroom-behavior.js / bedroom-renderer.js | vnext-bedroom.mjs / vnext-pixels.mjs | 正式动作与手机待验 | 原2D实现保留；完整动作/角色细节未新增 |
| C01 | engine.js / life-journal.js / life-projection.js / app.js | production-life.mjs / life-journal.mjs | 桌面计时与活动独立已操作 | 开发入口已接自主生活，玩家专注不调度姐姐 |
| C02 | engine.js / life-presentation.js | production-life.mjs / v1.4-rules.mjs | 桌面重开可用，手机待测 | 原睡眠保护；去重、跨午夜、后台基线 |
| C03 | engine.js / app.js renderNightRecap | wendao-night-timeline.test.mjs / production-life.mjs | 分钟/跨夜为自动测试，长时实机待测 | 既有时间轴接入有效细节及前因；保留旧快照 |
| C04 | life-journal.js | life-journal.mjs / production-life.mjs | 无新增剧情演出 | 四类既有来源细节已接；失眠/求援新剧情未做 |
| C05 | engine.js | wendao.mjs | 无新剧情画面 | 保留既有剧情边界；本轮不增加压力/主线 |
| C06 | interaction.js / app.js / life-presentation.js | production-life.mjs / pr12-review-regressions.mjs | 无在线模型实写 | 只传已核验事实，接收行动不声明动画完成 |
| C07 | interaction.js / world.js | pr12-review-regressions.mjs | 桌面留笺与在场性已看 | 来信固定创建时投影，异地/计时不改写 |
| D01 | engine.js / app.js / cloud.js | production-life.mjs / sync-v1.4.mjs / sync-conflict-review.mjs | 实际双设备账号同步待测 | 完整存档与原云算法保留，元数据合并复核 |
| D02 | engine.js | v1.3.mjs / v1.4-rules.mjs | 伤势实机长时待测 | 原DDL/伤势规则保留 |
| D03 | engine.js / app.js | rhythm-ui.mjs / production-life.mjs | 桌面入口可用，争议自动测试 | 原休息核验保留，争议期生活显式恢复 |
| D04 | world.js / companion.js / HANDOFF_CURRENT.md | v1.6-world.mjs / main-map-shortcuts.mjs | 桌面入口已看；其他视觉未新增 | 保留原要求，未扩六地点动作或重做美术 |
| D05 | HANDOFF_CURRENT.md | 不新增实现 | 不适用 | 继续后置 BGM/动态提示词 |
| D06 | world.js / companion.js / HANDOFF_CURRENT.md | v1.6-world.mjs / main-map-shortcuts.mjs | 桌面入口已看；其他视觉未新增 | 保留原要求，未扩六地点动作或重做美术 |
| D07 | requirements-audit-production-life.md | 独立PR与本轮测试记录 | 待发布前验收 | 不合并main、不覆盖生产，不把开发接线称为已上线 |
| E01 | assets/*（字节未改） | portraits.mjs / vnext-pixels.mjs | 未生成/覆盖人物 | 用户人物制作权保留 |
| E02 | scene3d/* / 原寝居资产 | scene3d-bedroom.mjs / scene3d-actions.mjs / scene3d-prop-contact.mjs | 本轮未测WebGL/GPU | 保留R1/R2.5研究成果，T4未推进 |
| E03 | scene3d/* / 原寝居资产 | scene3d-bedroom.mjs / scene3d-actions.mjs / scene3d-prop-contact.mjs | 本轮未测WebGL/GPU | 保留R1/R2.5研究成果，T4未推进 |
| E04 | scene3d/* / 原寝居资产 | scene3d-bedroom.mjs / scene3d-actions.mjs / scene3d-prop-contact.mjs | 本轮未测WebGL/GPU | 保留R1/R2.5研究成果，T4未推进 |
| E05 | scene3d/life-bridge.js / life-presentation.js | scene3d-life-bridge.mjs / production-life.mjs | 无正式新动画声明 | 生产CG接线复用去重、后台、接管门控 |
| E06 | scene3d/* / 原寝居资产 | scene3d-bedroom.mjs / scene3d-actions.mjs / scene3d-prop-contact.mjs | 本轮未测WebGL/GPU | 保留R1/R2.5研究成果，T4未推进 |
| E07 | HANDOFF_CURRENT.md / 本表 | 35条原需求 + E01—E10逐条映射 | 视觉缺口逐项保留 | 全部原文保留，新增本轮增量状态 |
| E08 | scene3d/ledger-source.js / life-presentation.js | scene3d-ledger-source.mjs / production-life.mjs | 收到意图不等于动画播放 | 从隔离来源进入正式CG只读桥，仍不结算 |
| E09 | scene3d/* / 原寝居资产 | scene3d-bedroom.mjs / scene3d-actions.mjs / scene3d-prop-contact.mjs | 本轮未测WebGL/GPU | 保留R1/R2.5研究成果，T4未推进 |
| E10 | life-journal.js / engine.js / app.js | life-journal.mjs / production-life.mjs | 桌面基本操作通过；手机待测 | L1进入正式入口、存档、合并与纪事 |
| E11 | C1原包/COMPANION_C1.md 尚未取回 | 不引用先前430项为本轮证据 | 无本轮视觉证据 | 原始条款文字与编号对应待核对；C1正反馈要求保留，未宣称恢复 |
| E12 | C1原包/COMPANION_C1.md 尚未取回 | 不引用先前430项为本轮证据 | 无本轮视觉证据 | 原始条款文字与编号对应待核对；C1正反馈要求保留，未宣称恢复 |


## 后续顺序

1. 审查独立 PR 的正式入口、存档与场景接线；在隔离浏览器或本机开发入口实际使用。
2. 用户控制的真实存档/账户做双设备同步与手机 Safari/PWA 验收，获得明确生产合入授权后再选择性提交 main。
3. 依据素材审计推进 T4/T5；不让模型/素材缺口阻塞已实现的生活事实链。
4. C1 正反馈原包未恢复，E11/E12 继续保留为待核对需求，不擅自宣称本轮恢复成功。

## 交付结果

- 全量 `node --test public/yuanhang/tests/*.mjs`：436/436，通过；包括15项新增接入测试。
- `npm run build`：通过，内容校验22条、0错误，生成生活接线bundle与网站构建产物。
- `git diff --check`：通过。桌面浏览器错误日志为空；地图/计时/纪事/重开已实际操作，截图保存在本机output目录。
- 无已知阻断性代码错误；发布与视觉验收仍受上文明确待办限制。
