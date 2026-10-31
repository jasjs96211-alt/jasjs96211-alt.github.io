# 《远航·问道》自主生活生产接入 T0 审计（2026-10-31）

> 状态：T0 静态审计 / 待工程运行验证。此文不代表 T1–T3 已合入、通过实机或发布。
> 基线：main `6e492b645a801f373c7237e8d6421a4eaeea6021`，PR #26 head `49803523bcaaa86dd41f5583786d6ccc4da039ea`（Draft/Open，2026-10-31 核对）。
> 依据：`HANDOFF_CURRENT.md`（2026-10-26）、`LIFE_JOURNAL_L1.md`、历史 2.5D/夜间纪事需求、2026-10-31 用户产品与技术实施总纲。

## T0 实际审查结果

1. `engine.js` 已有 `advanceAutonomy`（整点基础事件及稳定 ID）、`nightRecap` 和 `recapTimeline`（现有真实事件时间轴）、`vitals`、`merge`、`setMode`。**没有必要重建夜间纪事**。
2. `life-journal.js` 在 #26 中是 ESM，无副作用的 `createLifeJournal(E)`。可直接复用 `enable / advance / resume / reconcile / merge / timeline`，但正式 `index.html / app.js / sw.js` 尚未接入此模块。
3. `app.js` 存在多个生活推进入口：`dailyUpdates`（24 行）、`openStage`（116–119 行）、`resumeTimedNap` -> `E.setMode`（14–23 行）、手动模式切换（319 行）、打开时引导（455 行）及页面恢复/定时器。引擎 `setMode` 内也调用 `advanceAutonomy` 和 `nightRecap`（engine.js 337 行）。**仅在 dailyUpdates 补一行调用会漏接或导致先生成 recap 再生成 detail**。
4. `world.js::scheduleActivity` 优先读 `state.schedule`，但目前由 `app.js` 将 `s.life.ledger.at(-1)` 直接传给 companion：可能正好是 kind=detail，且 world 对 detail 不认识；后续无来源时使用自己独立的 20 分钟循环及 `focus.running` 触发行为。这个逻辑会让场景与引擎不一致。建议新增**只读**投影并将其注入现有 schedule，不建第四套自主调度器。
5. `companion.js` 以 `WendaoWorld.derive` 为主，缺 world 时才用 `STATES` 列表；必须限制 fallback 产生无来源的事实，不拿播放帧充当规则事件。
6. `engine.js::recapTimeline` 当前对 `status='unresolved'` 无过滤（310–319 行）；`nightRecap` 会收集全 ledger，且已有快照时直接返回（321–327 行）。需保留旧 recap，确保 detail 在来源核验后才显示。
7. `engine.js::validExtras` 当前只检查 `life.cursor/ledger`，未校验 `life.detailState` 的版本与游标；`engine.js::merge` 合并 `life.ledger` 却未显式合并 detailState，需防止远端游标和 unresolved 失配。
8. `app.js::commit` 现有本地 revision 冲突保护必须保留。云同步不仅在 `app.js::cloudApply`（35–48 行）；`cloud.js::mergeWendao`（36–54）、`reconcile`（56–78）、首次云合并（303–307）以及 `apply`（275–290）均为实际路径。不能擅自将 cloudApply 的快照恢复改成全新云合并算法。
9. `sw.js` 当前缓存 `yuanhang-static-v31-chronicle-breath-20261018`，预缓存没有 life-journal ESM，fetch 白名单也无该文件。接入必须处理版本及离线资源。
10. #26 的 `scene3d/ledger-source.js` 当前只消费 `life:v4`（study→read、rest→rest），不能把 detail 子事件误作为服药、行走、读书的独立授权。R2.5 代理、道具约束与实际人物动作要严格区分。
11. #26 自述 421/421 及 build 通过：这是**旧分支当时的记录**；本轮尚未在本执行环境重新运行 Node、构建、桌面/手机 Safari 及 WebGL，均须另行取证。

## 建议正式接线次序（不得再造系统）

- **T1-A** 保留 `life-journal.js` 原算法，生产启动先立当前基线；生命周期调用次序：时钟/休息核对 → 原 advanceAutonomy → journal.advance/核验 → 原 nightRecap → 原监督与结算 → commit。
- **T1-B** 确定性、零增量 detail 追加到 `life.ledger`；只把经核验的事实显示到正式 recap；旧摘要不得伪造发生时刻；历史数据不重算奖励。
- **T1-C** `validExtras` 校验新元数据；旧存档兼容；E.merge / 手动导入 / 云端三方合并后必须 reconcile。用户主动核对时钟后才可 resume，后台恢复不补播动作。
- **T2** `getLifeProjection(state, at)` 只读；从有效基础事件和关联 detail 提取当前活动，不重复结算； world 优先该投影、用既有状态门控；用户专注计时与姐姐活动彻底分离。
- **T3** 审核 #26 的 life bridge / action flow / ledger source；只发送当前有效、许可、前台新请求，不把旧日记变动作队列。
- **T4** 先做 CG 是否存在透明独立层的资产审计。合成图不是透明角色，R2.5 代理不等于正式动画。手机 Safari + WebGL 视觉 QA 未通过前不进入生产发布。

## 需求覆盖矩阵

**状态词定义**：已存在=当前 main 或 #26 有代码/旧回执；待接线=存在但未正式可用；缺素材=美术阻塞；待验收=缺实机/可见证据；暂缓=已获授权后置。凡未在此轮复测的测试统一标「本轮未复测」。

| ID | 实现文件/证据 | 本轮审计状态 | 下一验收证据 |
|---|---|---|---|
| A01 | app.js / index.html / cloud.js | 已存在，待回归 | 双入口与学习数据只计一次 |
| A02 | 2.5D 规格 / 场景资产 | 方向保留，待验收 | 国风精致 RPG 视觉 QA |
| A03 | world.js / scene3d/camera-rig 等 | 部分存在，待验收 | 三机位/空间遮挡 |
| A04 | companion.js / bedroom-renderer.js | 局部动作存在，正式完整动作缺素材 | 真动作非整图位移 |
| A05 | app.js 主界面地图与陪伴按钮 | 已存在，待回归 | 不启动计时也可入地图 |
| A06 | world.js / scene3d/action-flow | 部分存在，暂缓 | 四向转场连贯实录 |
| A07 | app.js / UI CSS | 已存在，待实机 | 人物面部和道具不被覆盖 |
| A08 | world.js 六地点 | 地点存在，生活演出未全部实现 | 六地点真实活动 |
| A09 | 夜景图 / scene3d/lighting | 已存在，WebGL待验收 | 暖灯与昼夜真实画面 |
| B01 | companion.js / bedroom-behavior.js | 已有限制，待实机 | 病中克制自然 |
| B02 | 正式原 CG / asset manifest | 用户制作权锁定 | 五官服装不变 |
| B03 | bedroom-renderer.js / behavior | 微呼吸存在，待实机 | 自然呼吸 1×视频 |
| B04 | bedroom-behavior.js | 眨眼/抬眸存在，待实机 | 手机视频 |
| B05 | bedroom-behavior.js | 压咳/手指存在，待实机 | 连贯镜头 |
| B06 | 正式手臂/袖/口前遮挡 | 缺素材 | 抬手→掩口→放回连续 |
| B07 | bedroom-behavior.js | 呼吸曲线存在，待实机 | 动作衔接无跳变 |
| B08 | companion.js / world.js | 部分存在，待验收 | 入睡不强制唤醒 |
| B09 | R2.5 action-flow / book contact | 代理存在，正式缺素材 | 伤势允许才半坐翻书 |
| B10 | R2.5 bowl grip | 代理存在，正式缺素材 | 取盏/浅抿/归位真实接触 |
| B11 | engine.js injuryFor / bodyState | 规则已存在，待回归 | 急性与持续伤伤势不重置 |
| B12 | bedroom CG / night lighting | 原画存在，待验收 | 同一人物夜间不换脸 |
| C01 | engine.js life.ledger + #26 life-journal | 待生产接线（P0） | 进入正式游戏即见生活 |
| C02 | engine.js / app.js | 部分存在，待回归 | 合法休息与离线不误罚 |
| C03 | engine.js recapTimeline / app.js renderNightRecap | 现有时间轴，待 detail 接线 | 逐时点原始事件 ID |
| C04 | #26 life-journal.js | 已有部分日常细节，待接线 | 每事件来源及因果核验 |
| C05 | engine.js 剧情门控 | 现有，待回归 | 无额外主线与随机来信 |
| C06 | engine.js + AI readonly context | 部分存在，待接线 | AI只润色事实 |
| C07 | app.js / companion.js | 历史修复，待回归 | 来信时间地点一致 |
| D01 | engine.js / cloud.js | 核心已有，高风险保护 | 数据迁移/云合并/真实 DDL |
| D02 | engine.js deadline ledger | 已存在，待回归 | DDL首逾期严重、后续持续 |
| D03 | rhythmState / supervision | 已存在，待回归 | 清醒默认/午睡免罚 |
| D04 | HANDOFF_CURRENT.md / 资产规划 | 新优先级以10-31为准 | 先 T1—T3 后 T4 |
| D05 | backlog | 暂缓 | BGM与动态Prompt不挤占 |
| D06 | Canvas2D + DOM / scene3d 隔离 | 已存在，待回归 | 不全量重构 UI |
| D07 | HANDOFF_CURRENT.md 最新授权 | 验证后才发布 | CI/手机/生产可见证据 |
| E01 | scene3d/NEXT_SCOPE_20261021.md | 已确认 | 不替换正式人物 |
| E02 | R1/R2.2 camera/lighting | 部分存在，待 GPU 验收 | 三机位与写实寝居 |
| E03 | R2.2 屏风及路径 | 已有设计，待GPU | 不透化屏风 |
| E04 | action-flow / interactions / contact | 代理流程已有 | 手脚接触动作视觉 |
| E05 | life-bridge / ledger-source | 独立实现，待接线 | 去重/过期/后台 |
| E06 | lighting R2.4 / 亮度滑杆 | 已有代码，待 GPU 验收 | 昼夜可读性 |
| E07 | HANDOFF_CURRENT.md A01–D07 | 35 条保留 | 每批逐条映射 |
| E08 | scene3d/ledger-source.js | 已有只读样板，待生产 | 真实 ledger 来源 |
| E09 | scene3d/PROP_CONTACT_R25.md | 代理约束存在，待视觉验收 | 书碗释放与取消 |
| E10 | life-journal.js / LIFE_JOURNAL_L1.md | L1 已开发，未生产 | 首次基线/持久化/同步闭环 |

## 高风险发布闸门

1. 禁止直接合并 #26（大范围实验 + 未有 WebGL/iPhone GPU 证据）。
2. 禁止多次基础事件结算或 L1 detail 累加奖励。
3. 禁止用 `ledger.at(-1)` 当唯一可用来源；需去掉未核验 detail 和未来记录。
4. 禁止旧 recap 伪造分钟，不重制已有夜间纪事 UI。
5. 云端冲突时必须保留导入前快照，不丢失本地细节游标。
6. 缺正式透明 CG 和动作时保持原安全画面，不宣称 3D 动画已完成。
7. 待执行：`node --test public/yuanhang/tests/*.mjs`、`npm run build`、旧存档/跨端/异常时钟/跨午夜与真实 Safari/PWA/GPU。
