# v1.3事件与持续伤势表

所有事件只属于虚构修仙AU。姐妹亲情不随学习不足下降，不以安危要求现实用户牺牲休息。原完整AU未收录，后续不可逆遭遇、离家、入学及未知能力不自动解锁。

| ID | 名称 | 实现入口与作用 |
|---|---|---|
| EV-01 | 书案未启 | advance：清醒无有效学习120分钟，warning/fatigue轻度反馈；不生成严重伤势。 |
| EV-02 | 灯尽未成 | settle：仅用户确认的合理目标且有清醒观测时日结，轻度压力；休息豁免。 |
| EV-03 | 页角残章 | checkDeadlines：普通study任务逾期仅提示；报名/考试也不重伤。 |
| EV-04 | 温家问询 | important DDL首次失守开端；同次绑定EV-06或07、08及severe伤势。 |
| EV-05 | 令书至门 | critical DDL首次失守开端；同次重伤，无压力或累计次数门槛，保留更高剧情规格元数据。 |
| EV-06 | 禁足与责罚 | 净化分支未授权时的责罚/旧伤严重恶化；首次即可。 |
| EV-07 | 净殿传召 | 当前已确认摘要允许净化时的强制抽取后果；不与未来正史章节混同。 |
| EV-08 | 血染衣袖 | 同链咳血/旧伤严重复发演出，绑定同一伤势，不额外重复扣值。 |
| EV-09 | 并肩修行 | 合理目标达成、疗养、姐姐每日独立行动推进恢复。 |
| EV-10 | 护在身前 | 保护能力至少3（90修为）后，整理规约/证据与求援；不虚构新增法术或温家放人。 |
| EV-11 | 重订修行簿 | correction：误判撤销贡献并保留史；makeup：补做仅推进疗养；核验豁免有审计。 |

名称常量在engine.js的EVENTS；DDL账本每条有eventIds。修订/补做/日结等纪事以同名标题标识。若未来补齐AU后更改分支，应保留已结算事实，不重新抽取或重新扣值。

## 参数与状态机

集中常量RULES：healthFloor=35，dailyDamageCap=30，severeDamage=22，acuteHours=48，recoverySteps=4，minHealingDays=3。当前critical保留EV-05/importance；两档数值最低标准相同，关键级不以无限叠加健康扣减表现强度。

每条曾于截止前监测的有效DDL在now>dueAt且未按时完成、未豁免时生成：`ddl:<taskId>:<UTC dueAt>:<taskRevision>:overdue`。ledger=punishments；每条对应injuryId，severity始终severe。健康触底或同日封顶不会漏掉新的账本/伤势。按截止时刻+1ms形成稳定结算at，detectedAt另记实际检测时刻；避免A/B恢复时间不同造成不同种子/伤势。聊天只读这些结构化事实。

acute → stable（48h，无自动治愈）→ recovering（疗养进度）→ healed（至少4个不同自然日动作＋至少3天）。同日不同设备、不同补救动作共用一个recovery ID，不可刷进度。旧v1.1已明确解除的事件维持resolved。错误结算可从任意阶段→corrected，撤销该条贡献，纪事仍可查。

身体由去重账本重算，同日所有未恢复伤势贡献累计最多30，全部健康最低35；active伤势期间最高64，保证表情/剧情持续。学习、休养和自主行动仍有旧兼容数值，但不能绕开伤势状态机。家族压力/疲劳上限100。爱意不参与计算。

## 资源表

v1.3.1六态逻辑与六张独立静态图均接入：原sister-calm、sister-tired保持；新sister-concerned、sister-ill、sister-injured、sister-relieved已生成并无损转为透明WebP。受罚资源内部ID仍为sister-weakened以兼容自定义图片存档。场景临时强撑微笑仅在有明确forcedPortrait/forcedUntil语境时覆盖表情，不清空伤势。
