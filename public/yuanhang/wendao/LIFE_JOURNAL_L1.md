# 自主生活与纪事 L1 · 灯下小记

2026-10-26。用户决定暂缓寝居细节打磨，选择优先开发“自主生活与纪事”。本轮沿用原引擎的生活台账与夜间纪事，增加可独立验证的分钟级日常衔接，不改正式入口、主线或结算规则。

## 可体验内容

- 平常的一日：研读医理 → 摘记疑问 → 夹签收卷。
- 一次催问之后：已有温家问询 → 整理待答之事 → 暂收来函。子事件不新增催问，不代发回信，不解决温家压力。
- 疗养中的一夜：已有休息安排 → 夜间调息 → 继续静养；清晨仍按身体状态温养，不强迫起身。
- “过一刻钟”“专心读一小时”“离开，到明早再来”推进示例时钟；按这段日常/今日/昨夜阅读，展开每则小记的前因，导出文字纪事。
- 页面明确标识独立示例。关闭页面不会保存示例进度；正式用户存档不读取、不改动。时间快进不记录真实学习。

## 源码与接口

`life-journal.js` 为无存储、无网络的规则模块，导出 `createLifeJournal(E)`，E 是仓库原有 `WendaoEngine`。

```js
const journal = createLifeJournal(E);
journal.enable(state, now);      // 只建立启用基线，不改造旧历史
E.advanceAutonomy(state, later); // 先由原引擎记录来源
journal.advance(state, later);   // 再追加已经到时的细节
const recap = E.nightRecap(state, later);
const timeline = journal.timeline(state, {from, to: later});
const merged = journal.merge(local, remote); // 原 E.merge 后重新核对细节
```

不得直接把示例页 fixture 接入真实存档。生产集成仍待下一轮：需在 dailyUpdates 的原作息结算之后接线，持久化模块游标，并在云合并后执行 reconcile；当前 HTML / app.js / sw.js 没有注册本模块。不得声称正式游戏已上线此功能。

### 事件约束

| 项目 | 规则 |
| --- | --- |
| 来源 | 已有 `life:v4:*`、准备期 chapter、明确 study/rest/social/pressure 和身体状态；未知/冲突/未来来源不猜测 |
| 身份 | `life:detail:v1:<source-id>:<step>`；携带 sourceEventId、previousEventId、step、cause 与 location |
| 时间 | 来源后 12—23 分钟及 38—49 分钟，偏移由固定哈希决定，不使用随机数；新安排开始后旧链不继续 |
| 依赖 | 第二步必须有第一步；首次启用、状态待核验或时钟异常区间不补造细节 |
| 休息 | 连续 90 分钟内的同类休息不生成重复子链；不会因跨午夜而人为打断休息 |
| 伤势 | 依据来源身体状态及事件发生时已存在的伤势，转为寝居静养；未来疗愈不能倒改过去为健康活动 |
| 数值 | kind=detail，autonomy/cultivation/pressure 的增量全为零；不重复触发原 vitals 的学习/温养奖励 |
| 离线 | 最多最近三天、最近 12 项来源、一次最多 24 项细节；不补造更早历史 |
| 核验 | 时钟/离线结算/云状态待核验时暂停；clear 后还须显式 resume 重建基线，不追演不确定区间 |
| 合并 | 复用 E.merge 去重，再依合并后的来源/伤势重核细节；被替代或失去来源的记录标 unresolved，timeline 不当成事实展示 |

`E.recapTimeline` 继续根据真实 ledger ID 和 at 投影，不把文案拼成虚构时刻。正式接线时还需统一 unresolved 的过滤，并让世界/动作适配器取最近基础生活事件，不能把 kind=detail 当成新的服药/行走指令。现有 scene3d/ledger-source 只消费 life:v4，本轮不改动。

## 验证

- Node 全量 421/421，通过；16 项新增测试覆盖基线、分钟依赖、前台/离线一致、无额外数值结算、伤中/睡眠、事件中途受伤、活动替代、非法/冲突来源、时钟与核验门控、回填上限、跨端去重、夜间投影、未来疗愈不得改写历史、跨午夜休息去重、合并后的活动替代以及原 vitals 无额外收益。
- `npm run build` 通过。独立 HTML 使用已有 Rolldown 打包，无新增依赖，无 CDN。
- 真实远程 Chrome 实际操作通过：平常的一日产生 09:00 → 09:23 → 09:49；催问示例产生 16:00 → 16:16 → 16:42；伤中示例到次日 08:00 显示 7 条昨夜记录。今日筛选 4 条，前因可展开。桌面版式已看图检查。
- 浏览器自动等待文字下载事件超时，因此导出下载的实机结果未确认；不能称浏览器导出已验收。单文件 HTML 的交付保存另行验证。
- 手机浏览器/窄屏实机未验收；CSS 已提供窄屏布局，但不以代码断言替代实机。

## 待办与边界

1. 接入原游戏的日常控制器与来信/纪事 UI，统一持久化、合并和当前活动来源后，再进入正式体验；依旧不擅自合并 main。
2. 扩充生活差异与持续上下文，控制重复和密度。旧伤失眠、真正求援、温家新事件须有单独条件与因果，不用定时模板擅自制造主线事件。
3. 用户作息、睡眠保护、DDL、学习成长和原有夜间纪事保持现有规则。人物与场景继续停在 R2.5，待后续反馈再细磨。

## 2026-10-31 接线更新

上述“未接生产”是10-26的历史状态。本轮在独立开发分支的正式入口加载 production-life.js（由原 life-journal、life-projection、life-presentation 生成）。E.advanceLife 统一推进，E.merge/migrateLegacySave 复核，cloudApply 保留单调游标及快照替换语义。原算法不重写，只补缺前置事件核验。详见 requirements-audit-production-life.md；未合并main，未发布生产，未宣称新增角色动画。
