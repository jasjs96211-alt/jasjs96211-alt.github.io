# v1.3 数据保护、迁移、发布与回滚

## 本次实际范围

只修改交接包源码副本。未读取或覆盖真实电脑/iPhone存储，未更改生产Supabase表、线上域名或部署。源码回退基线是原v1.1；压缩包内的源码与增量patch独立于真实个人存档。

## 升级前

1. 电脑浏览器、桌面PWA、旧桌面入口、iPhone Safari及PWA分别核对最近记录。
2. 每个有数据入口导出“完整备份（含图片）”，文件名注明设备、入口及日期。新导出附来源及时间。保留JSON原件，不先清理任何入口。
3. 统计events、sessions、usageSessions、wendao.chat、纪事和punishments；含自定义图的JSON应存在wendaoResources。
4. 在隔离浏览器profile用本地包测试导入；不要让空测试存档覆盖真实云端。

## 自动兼容

工作台原键 `sisu_2027_study_workbench_v1`、问道键 `yuanhang_wendao_v1`、IndexedDB `yuanhang_wendao_media/assets`不变。问道保留schemaVersion=1兼容外层读取，新增rulesVersion=3；纯函数migrateLegacySave不改传入对象。第一次打开旧问道会保留 `_before_v1_3` 快照；原学习数据不重写。

旧任务无ddlImportance、dueAt、taskRevision仍有效，解释为important、北京时间截止日末、版本1。不会对首次导入前已过期且未监测的任务追罚。旧punishments保留原ID及所覆盖任务，不按新ID重罚；resolvedAt/resolution为corrected的迁移为已纠正。旧48小时自然过去但从未人工解除的真实伤势转为稳定期持续疗养，不会满血。

账本继续使用 `supervision.deadlines.punishments[]`，以兼容旧字段；每条新记录增加唯一ID、dueAt、taskRevision、importance、status、eventIds、injuryId、recoveryActions、correctedAt。character.injuries是由账本重算的派生视图。勿在外部另外创建第二份settlements并重复扣值。

所有编辑保留taskRevision；截止前修改会更新监测版本。截止后仅文字编辑不会掩盖既有DDL，延期/程度变化进入核验。已结算事件不会因删除/改期/补做消失。同一个已有结算的任务不会仅因普通编辑再结算；新的学习节点应新建任务。

## 导入及图片

导入先校验、再预览、明确选择合并或替换。旧工作台JSON不含问道时保留当前剧情；合并保留运行中计时及本机冲突选择，补入记录与状态账本。替换会停止计时。原 `_before_import`、`_before_cloud` 等快照继续可用。

图片采用新版本键导入；合并时保留已存在本机自定义图，补入缺少图；替换保留旧版本图片键。不要把聊天/纪事同步成功当成图片也同步。

## 云端核验

沿用现有Supabase项目及workbench_state。使用 `wendao/server/rls-audit.sql`只读审计，先在测试账号验证；不自动改生产权限。需要确认RLS按auth.uid()隔离、user_id唯一、revision乐观并发、payload完整、Session可刷新。

两个隔离profile A/B分别有不同数据，使用同一测试邮箱登录：首次合并后双向新增学习/聊天/DDL；A/B离线对同一DDL结算，再同步只一条；A纠正后B上传旧记录不得复活；同字段相反选择必须冲突保留。同步时本机瞬时清醒cursor、计时器及代理设置不从另一设备覆盖。离线恢复中先核验云端再确认真实逾期。

“问道→设置→导出同步诊断／冲突快照”包含来源、脱敏到无令牌的账户UUID、成功读写时间、条数、待核验及冲突快照。只在私人渠道查看，含学习和聊天内容。真实账号、iPhone验收本次未做。

## 发布

保留当前线上目录及现有完整JSON，再把新版yuanhang文件部署到原 `public/yuanhang/` 对应路径（根据实际仓库确认）。只发布静态公开文件；**不得发布wendao/server、私有env、调用账本、用户JSON**。后端单独部署。v1.3.2的sw.js已更新v9缓存名称，包含四张新立绘；不会清除localStorage或IndexedDB。

建议先发布测试分支到隔离来源，验证资源路径、备份导入、两端登录及三轮AI，再更新原路径。此交付未自动上线。

## 回滚

先导出新版完整JSON；恢复旧v1.1代码后优先导入升级前完整JSON。旧版引擎不认识持续伤势/纠正优先级，继续混用旧版双端会造成语义不一致，所有入口应同版本。`_before_v1_3`仅是问道快照，不代替含图片的完整JSON。不要用清空所有站点数据“修复”同步；冲突要从保留快照核对恢复。
