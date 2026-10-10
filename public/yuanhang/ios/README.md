# 远航监测 · iPhone 原生配套工程 0.1

状态：首版源码与 Xcode 工程已建立，**尚未在 Xcode 编译、签名或安装到 iPhone**。不能把本目录或网页当成已经生效的监测服务。

本工程与远航网页独立，不替换网页、不迁移浏览器学习记录，不恢复 Supabase，不修改侨批项目。

## 首版实现范围

- 用户通过 Apple 的个人屏幕时间授权，选择要监测的应用、类别或网站。
- 每日合计额度可选 30 / 60 / 90 / 120 分钟；系统阈值回调达到一半和上限时请求本地通知。默认仅提醒，不封锁应用。
- 使用系统 Device Activity Report 扩展展示所选内容的当日使用报告；应用与网站分别汇总，避免把可能重叠的时长相加，也不把全屏幕时长误标为所选应用时长。
- 小号、中号桌面小组件展示计划及最近阈值提醒，点击打开 App。
- 支持停止监测、更改选择，检查授权撤销、拒绝空选择，区分旧配置回调。
- 监测按北京时间每日重复。首次开启包含当日更早的活动；此行为使用 iOS 17.4 起的 `includesPastActivity`。
- 小组件不显示精确实时用时，也不把“没有回调”解释为使用为零。系统报告和通知均可能延迟。

## 安装前必须具备的条件

1. 支持 iPhone 当前系统的 Xcode 构建环境（工程最低 iOS 17.4）。可以使用 GitHub 云端 macOS，不要求用户拥有 Mac；签名及实际安装仍需单独配置。
2. 有权配置 Family Controls 和 App Groups 的 Apple 开发者团队及签名。不要假定普通免费个人签名具备全部能力。
3. 用户在 iPhone 上亲自授予屏幕时间与通知权限；必要时启用开发者模式。
4. 走 TestFlight / App Store 等分发路径时，账户持有人还需为主 App 和 Screen Time 扩展申请 Family Controls 分发授权。源码本身不等于获得授权。

没有注册账户、申请权限、支付费用或上传 App；也没有读取任何现有 Apple 凭据。

## 工程入口

打开 `YuanhangMonitor.xcodeproj`，选择 `YuanhangMonitor` scheme。

| Target | 作用 | Family Controls | App Group |
| --- | --- | --- | --- |
| YuanhangMonitor | 授权、选择、额度设置、报告入口 | 是 | 是 |
| YuanhangActivityMonitor | 每日区间及使用阈值回调、本地通知 | 是 | 是 |
| YuanhangReport | 隔离的屏幕使用报告 | 是 | **否** |
| YuanhangWidget | 桌面小组件 | 否 | 是 |

在 `Configuration/Signing.xcconfig` 配置自己的 `DEVELOPMENT_TEAM` 和唯一 `YH_BUNDLE_PREFIX`，或在 Xcode 对各 target 选择团队。`YH_APP_GROUP` 默认随前缀生成。
确保三个需要共享存储的 targets 注册同一个 App Group，主 App / Monitor / Report 均具有相应 Family Controls entitlement 与有效 provisioning profile。不要将证书、私钥、profile 或账户密码提交到仓库。
工程已嵌入三个扩展并配置 URL scheme；不需要先安装 XcodeGen、CocoaPods 或第三方 Swift 包。

## 可重复检查

任意有 Python 3 的环境：

```sh
python3 Tests/test_project.py
```

只检查工程引用、文件分配、权限边界和配置；**不能证明 Swift 能编译或 iOS 监测正常**。

Mac + Xcode（本地或云端）：

```sh
python3 Scripts/check_macos.py
```

执行真正的 Swift 策略检查（北京时间跨日、阈值、状态、配置序列化），随后编译未签名 iOS 工程。不会安装、签名或上传；没有 Xcode 会明确失败，不伪报通过。

`.github/workflows/yuanhang-ios-check.yml` 在原生源码变更时自动使用 GitHub 的标准 `macos-15` runner 执行以上检查，也可以手动触发。仅授予仓库读取权限，不读取 Apple 凭据、不生成可安装的签名 IPA，不修改网站部署流程。首轮云端编译结果待验证。

修改 target 结构后，可用 `python3 Scripts/generate_project.py` 重建 pbxproj、Info.plist、entitlements、shared scheme。生成器不修改 Swift 文件或 Signing.xcconfig。

## 数据与隐私边界

- 选择的 opaque tokens 仅保存在主 App 本机 UserDefaults。
- App Group 仅存监测配置及阈值回调回执，不存系统报告的逐应用明细或精确时长。
- 报告扩展不编译 SharedStore，不配置 App Group，不访问网络，不把报告数据移出隔离地址空间。
- 小组件不含授权能力，也不查询其他 App。它展示的是最近快照，不是实时系统授权状态；授权撤销后需回到 App 刷新状态。
- 不向 ChatGPT 或网页发送数据；网页的手动屏幕时间仍独立保存。
- 同一配置/日期/阈值使用固定通知 ID；回执按阈值分文件保存，避免低阈值覆盖高阈值。旧配置回调被拒绝。
- 阈值回调只带回调时刻，不包含精确发生时刻；跨午夜的延迟回调不能当成当日精确用时，需以 App 内报告核对。
- 旧回执在启动监测时清理至约最近七天；没有删改用户的网页数据。

## 发布门槛 / 真机验收清单

- [ ] Mac 上运行 `check_macos.py`，完成 Swift 检查与四个 targets 的 iOS 编译。
- [ ] 确认 Apple 团队、标识符、共享组、开发签名及设备安装。
- [ ] 首次授权允许/拒绝、撤销授权、通知拒绝、设置中重新开启通知。
- [ ] 选择单个应用、多个应用、类别、网站，验证统计范围与 App 内报告一致。
- [ ] 达到一半/上限，分别验证前台、后台、锁屏、专注模式下的通知行为。
- [ ] 系统重复/延迟回调、停止后回调、快速更换配置：不重复提醒、不显示旧计划结果。
- [ ] 午夜、重启、时区切换、跨日迟到回调、系统更改时间；不能只用模拟器验收。
- [ ] 桌面两种尺寸、深浅色、大字体、点击跳回 App，检查系统刷新延迟。
- [ ] 长期使用与性能；应用图标/分发素材、隐私声明和发布审核单独完善。

当前只有工程静态检查可在 Linux 执行；以上原生验收未完成前，不标记“已上线可用”。

## Apple 官方依据

- [Family Controls 配置与签名](https://developer.apple.com/documentation/xcode/configuring-family-controls)
- [Family Controls 分发授权](https://developer.apple.com/documentation/familycontrols/requesting-the-family-controls-entitlement)
- [Device Activity 阈值事件](https://developer.apple.com/documentation/deviceactivity/deviceactivityevent)
- [报告与隐私隔离](https://developer.apple.com/documentation/deviceactivity/deviceactivityreport)
- [小组件刷新调度](https://developer.apple.com/documentation/widgetkit/keeping-a-widget-up-to-date)
