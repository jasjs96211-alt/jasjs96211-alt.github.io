# 温知遥真实模型后端 · v1.3

已实现模型请求通路和本机/远程两种运行模式。此次环境没有 MODEL_API_KEY、MODEL_BASE_URL、MODEL_NAME；**真实模型调用为0次，未接通在线AI**。自动测试用受控假模型，只证明协议、鉴权、重试与隔离，不能当作实连证据。

## 本机电脑

Node.js22+。环境变量只在服务器配置，不写网页或聊天。复制 `.env.example` 到公开目录以外，填入模型服务提供商的密钥、兼容 chat/completions 的 HTTPS `/v1` 地址、实际模型ID。单价按供应商现行价格填写。

```sh
# 由你自己的私有配置路径载入；不要把真实配置加入源码包
node --env-file=/PRIVATE/PATH/yuanhang.env wendao/server/launcher.mjs
```

Windows可先用PowerShell设置环境变量，再双击 start-windows.cmd；或在 yuanhang 目录运行上面命令。页面默认 `http://127.0.0.1:8765`，聊天 `http://127.0.0.1:8787/api/chat`。默认只绑定本机；本地网页来源与线上 GitHub Pages 存档不同，先完整备份再合并。ChatGPT订阅不是此后端的API凭据。浏览器对于HTTPS网页访问本机HTTP可能有额外限制，电脑演示优先使用本机网页。

## 手机远程HTTPS

实现了可部署模式，**本次未部署、未验证用户真实账号**。部署到单实例、带持久盘的自有服务器，Node仍监听127.0.0.1；前置同机Nginx终止HTTPS。配置 `nginx.example.conf` 中自有域名及证书，限制8787端口外部访问。

必须设置：`REMOTE_MODE=true`、精确 `PUBLIC_HOSTS`、精确 `ALLOWED_ORIGINS`、`SUPABASE_URL`、该项目publishable key、用户UUID白名单 `ALLOWED_USER_IDS`、私有持久 `PROXY_LEDGER_FILE`、正的输入/输出单价与日预算。缺一项即拒绝远程启动。不要提供 service-role key。私有env和账本不能由任何静态服务器公开。

前端用原数据页邮箱登录同一Supabase项目，问道设置填 `https://你的聊天域名/api/chat` 并开启在线。每次聊天自动获取当前用户访问令牌；密钥不进网页，令牌不进导出JSON或请求URL。服务端向项目Auth `/auth/v1/user`验证令牌，再核对用户UUID白名单。官方说明参考：<https://supabase.com/docs/reference/javascript/auth-getuser>。不信任浏览器自行声明的userId。

代理仅信任来自本机反向代理的 `X-Forwarded-Proto: https`，校验Host及Origin；OPTIONS允许Authorization预检。非白名单401/403。远程状态查询同样鉴权。不支持直接暴露Node公网端口或任意反向代理链。

## 请求、记忆和重试

`POST /api/chat {requestId,messages:[{role,content}],context}` 返回 `{reply,model,requestId,usage}`。上下文包括准备期正史摘要、现实学习/任务、DDL事件链/持续伤势/修复、姐姐独立行动、最近20条消息、手选最多25条可编辑记忆。完整原AU未收录，不发送用户未审核大纲中的未来事实。只接收台词，不把模型输出写为健康、任务或惩罚。

前端保存首次请求快照，失败后使用相同requestId和内容重试，避免日期变化导致重复计费。后端缓存按已验证用户隔离，相同ID不同内容返回409。配置持久盘后，成功回复和次数跨重启保留，最多缓存200个成功回复且每日轮转；较早请求依靠前端已有reply去重。新一天未成功返回的旧请求可能再次产生调用，不承诺供应商级exactly-once。

96KB请求上限、25秒模型超时、每次650输出token、默认每用户每分钟6次/每天60次、最多8个并发。预算按UTF-8输入字节上界及650输出token预留，成功后按用量记账；失败/崩溃的预留保留到日切，防止错误重启绕过限制。模型未返回usage时保守估算。费用是估算，需在供应商另设硬预算。账本仅存用户ID、请求哈希、成功回复与额度，不存密钥、认证令牌或完整提示词；它包含私人对话，文件权限600，需私有保管。

**只支持单进程／单实例共享账本**。多副本、无持久盘或多进程会破坏全局额度和去重，需要事务数据库后再横向扩容。运行时跨天待当前请求完成再轮转。

## 真正实连验收（待完成）

1. 正确登录后检查模型与用量，确认configured=true、目标模型正确。
2. 连续发送三轮不同自由输入：询问真实学习摘要、询问已结算DDL伤势、追问前一句及收藏记忆。
3. 每轮应有新requestId、有效生成文本、model及usage；前端显示最近成功时间，供应商调用日志有对应记录。不得把协议测试或status可达作为真实模型证明。
4. 断网重试同一消息，无重复回复；重复请求恢复缓存不再次调用；错误用户及Origin无权访问。
5. iPhone通过HTTPS完成相同三轮并验证软键盘，另行记录结果。

当前为完整JSON即时请求/响应，不含SSE逐token流式输出。关闭浏览器后不保证后台AI或推送。CG生成后置，应用不会自动付费生成图片。
