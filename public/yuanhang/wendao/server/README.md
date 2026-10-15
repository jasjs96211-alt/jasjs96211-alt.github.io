# 温知遥AI后端

当前交付包含可运行本地代理，不含用户的模型服务凭据。在线对话尚未实连验证；离线台词明确标记。ChatGPT订阅不会给这个程序提供API授权。

Windows安装Node.js后，在本目录打开PowerShell，设置仅当前进程生效的环境变量（不要将真实密钥写进网页、Git、备份或聊天）：

```powershell
$env:MODEL_API_KEY = Read-Host '模型服务API Key'
$env:MODEL_BASE_URL = 'https://你的模型服务地址/v1'
$env:MODEL_NAME = '你的模型名'
$env:ALLOWED_ORIGINS = 'https://jasjs96211-alt.github.io'
$env:DAILY_REQUEST_LIMIT = '60'
$env:INPUT_PRICE_PER_MILLION = '0' # 按实际供应商价格填写
$env:OUTPUT_PRICE_PER_MILLION = '0'
$env:DAILY_BUDGET = '5'
$env:COST_CURRENCY = 'USD'
node ./chat-proxy.mjs
```

前端问道设置填写 `http://127.0.0.1:8787/api/chat` 并开启在线。浏览器可能要求允许网站访问本地网络；只在此Windows电脑可用。iPhone访问127.0.0.1指向手机自身，必须另外部署有HTTPS、登录鉴权及用户隔离的远程后端；不要把这个仅绑定本机的代理直接公开。

代理限制来源Origin、Host、本机绑定、48KB输入、每天60次、每次650输出token和25秒超时；不会记录提示词/密钥；相同requestId在进程内去重。重启后去重缓存/次数重置，不构成供应商账单硬上限，请在模型服务商处另设预算。断网/额度不足会明确报错，不伪装在线。费用由所配置服务按实际调用计收；此交付没有进行付费API调用。

接口：POST `/api/chat` 接收 `{requestId,messages:[{role,content}],context}`，返回 `{reply:string}`。只返回文本；前端没有将模型输出应用为状态变更的通路。当前为完整响应JSON，**尚未实现SSE流式输出**。

CG生成扩展协议（当前未自动调用）：POST `/api/cg`，请求 `{assetId,revision,prompt,referenceAssetIds}`，响应 `{assetId,revision,mimeType,dataBase64}`。服务端应以 assetId+revision 建立持久缓存，生成前显式核对费用、鉴权、限频；前端通过资源管理导入产物后即永久缓存。当前版本未实现自动付费生成服务，不能将这份协议当成已上线功能。

设置中“检查模型与用量”读取 `/api/status`，显示后端模型、今日请求、输入输出token和按配置单价估算的费用。单价为0时明确显示无法估算，不宣称免费。估算预算在下一次请求前检查，单次请求可能越过预算；供应商账单和硬预算为准。
