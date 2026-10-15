# 私人聊天服务接入（2026-10-16）

原工作台：https://jasjs96211-alt.github.io/yuanhang/
私人服务：https://yuanhang-wendao-ai.jasjs96211.chatgpt.site
Sites project_id：appgprj_6ad13d04e5bc8191937c5557dda610dd

服务端源码由该 Sites 的源代码仓库保存，后续用 Sites 官方 source helper 打开原项目继续开发；不要重新创建同名服务。访问范围仅站点所有者。

问道→姐姐→「连接私人聊天服务」。顶层窗口完成ChatGPT登录，保持窗口打开并切回原站。原站只发送当前对话所需的学习/伤势/记忆上下文，不向服务移动本地存档。原站不保存API密钥或私人服务登录令牌。电脑/iPhone弹窗、登录回跳和跨窗口通信需独立真机验证。

服务当前没有模型凭据，configured=false；尚未完成真实模型三轮验收。「私人服务连接成功」不代表模型已接通。密钥须通过安全授权流程配置于服务端，不能粘贴到聊天、源码或网页输入框。

配置名：MODEL_API_KEY（secret）、MODEL_BASE_URL（HTTPS兼容/v1）、MODEL_NAME、INPUT_PRICE_PER_MILLION、OUTPUT_PRICE_PER_MILLION、DAILY_BUDGET（USD）。修改后重新部署同一服务版本应用环境。OpenAI凭据使用OpenAI Developers插件的openai-platform-api-key技能及其授权流程；当前会话该插件未启用。

后端使用D1持久化请求编号、摘要、回复与额度；原子条件写入限制每用户每日60次、滚动每分钟6次及全站日预算。重试相同编号不重复调用，未知结果保留费用预留。JSON最大96KB、模型超时25秒、输出650token；上游密钥仅存在服务端。

此次验证：8项后端协议/真实SQLite测试、3项跨窗口协议测试，原工作台123项回归测试通过。协议测试使用模拟模型；未冒充真实模型调用或iPhone验收。
