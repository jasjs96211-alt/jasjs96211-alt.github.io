import SwiftUI
import FamilyControls
import DeviceActivity
import UserNotifications
import UIKit

final class NotificationDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        return true
    }
    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .sound])
    }
}

@main
@MainActor
struct YuanhangApp: App {
    @UIApplicationDelegateAdaptor(NotificationDelegate.self) private var notificationDelegate
    @StateObject private var model = MonitorModel()
    var body: some Scene { WindowGroup { MonitorHome().environmentObject(model) } }
}

struct MonitorHome: View {
    @EnvironmentObject private var model: MonitorModel
    @Environment(\.scenePhase) private var scenePhase
    @State private var showPicker = false
    @State private var showStopConfirmation = false
    @State private var reportID = UUID()
    private let teal = Color(red: 0.14, green: 0.45, blue: 0.42)

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    VStack(alignment: .leading, spacing: 12) {
                        Label("远航 · 把注意力留给重要的事", systemImage: "sailboat.fill").font(.subheadline)
                        Text(model.active ? "监测计划已开启" : "让娱乐有一个边界").font(.title2.bold())
                        Text(model.message).font(.callout)
                    }.padding(22).frame(maxWidth: .infinity, alignment: .leading)
                        .background(teal, in: RoundedRectangle(cornerRadius: 22)).foregroundStyle(.white)
                    GroupBox("1 · 授权") {
                        VStack(alignment: .leading, spacing: 12) {
                            Label(model.authorized ? "屏幕时间已授权" : "等待你的授权", systemImage: model.authorized ? "checkmark.shield" : "lock.shield")
                            if !model.authorized {
                                Button("授权屏幕时间") { Task { await model.authorize() } }.buttonStyle(.borderedProminent).disabled(model.busy)
                            }
                            Button(model.notificationsAllowed ? "通知权限已开启" : "允许超限提醒通知") { Task { await model.requestNotifications() } }
                                .disabled(model.notificationsAllowed)
                            Text("只在本机处理。详细使用报告不会上传到远航网页或 ChatGPT。").font(.footnote).foregroundStyle(.secondary)
                        }.frame(maxWidth: .infinity, alignment: .leading).padding(.vertical, 8)
                    }
                    GroupBox("2 · 选择要监测的内容") {
                        VStack(alignment: .leading, spacing: 12) {
                            Button("选择游戏、娱乐 App 或类别（\(model.selectionCount) 项）") { showPicker = true }
                                .disabled(!model.authorized || model.active)
                            Picker("每日合计上限", selection: $model.limitMinutes) {
                                ForEach(MonitorPolicy.limits, id: \.self) { Text("\($0) 分钟").tag($0) }
                            }.pickerStyle(.segmented).disabled(model.active)
                            Text("所选内容合计达到一半和上限时提醒。按北京时间每日重新统计；首日包含当天开启前的使用。").font(.footnote).foregroundStyle(.secondary)
                            if model.active {
                                Button("停止监测 / 修改选择", role: .destructive) { showStopConfirmation = true }
                            } else {
                                Button("开启监测") { model.start(); reportID = UUID() }
                                    .buttonStyle(.borderedProminent).disabled(!model.authorized || model.selectionCount == 0 || model.busy)
                            }
                        }.frame(maxWidth: .infinity, alignment: .leading).padding(.vertical, 8)
                    }
                    GroupBox("今日使用报告") {
                        if model.authorized && model.selectionCount > 0 {
                            VStack(alignment: .leading) {
                                DeviceActivityReport(DeviceActivityReport.Context("yuanhang.selected.daily"), filter: model.reportFilter)
                                    .id(reportID).frame(minHeight: 180)
                                Button("刷新报告") { model.refresh(); reportID = UUID() }
                                Text("由 iOS 提供，统计可能延迟。这里的时长不会写入网页中的手动屏幕时间。").font(.footnote).foregroundStyle(.secondary)
                            }
                        } else { Text("授权并选择应用后显示系统报告。").foregroundStyle(.secondary).padding() }
                    }
                    GroupBox("桌面小组件") {
                        VStack(alignment: .leading, spacing: 10) {
                            Text("长按 iPhone 桌面 → 编辑 → 添加小组件 → 远航监测。")
                            Text("显示当前计划与最近收到的阈值提醒；点一下回到 App。刷新由 iOS 调度，不显示虚假的实时分钟数。").font(.footnote).foregroundStyle(.secondary)
                            Link("打开远航考研工作台 ↗", destination: URL(string: "https://jasjs96211-alt.github.io/yuanhang/")!)
                        }.frame(maxWidth: .infinity, alignment: .leading).padding(.vertical, 8)
                    }
                }.padding()
            }.background(Color(.systemGroupedBackground)).navigationTitle("远航监测").tint(teal)
                .familyActivityPicker(isPresented: $showPicker, selection: $model.selection)
                .confirmationDialog("停止后不会继续提醒。确定停止？", isPresented: $showStopConfirmation, titleVisibility: .visible) {
                    Button("停止监测", role: .destructive) { model.stop() }
                }
                .onChange(of: scenePhase) { _, phase in if phase == .active { model.refresh(); reportID = UUID() } }
                .onChange(of: showPicker) { _, showing in if !showing { reportID = UUID() } }
        }
    }
}
