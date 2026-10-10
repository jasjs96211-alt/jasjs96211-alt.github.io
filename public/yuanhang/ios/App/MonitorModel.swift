import SwiftUI
import FamilyControls
import DeviceActivity
import UserNotifications
import WidgetKit

@MainActor
final class MonitorModel: ObservableObject {
    @Published var selection = FamilyActivitySelection()
    @Published var limitMinutes = 60
    @Published var authorized = false
    @Published var active = false
    @Published var notificationsAllowed = false
    @Published var busy = false
    @Published var message = "先授权，再选择想减少使用的游戏或娱乐 App。"
    @Published var snapshot = SharedStore.snapshot()
    private let center = DeviceActivityCenter()
    private let selectionKey = "yuanhang.family.selection.v1"

    init() {
        if let bytes = UserDefaults.standard.data(forKey: selectionKey),
           let saved = try? JSONDecoder().decode(FamilyActivitySelection.self, from: bytes) { selection = saved }
        if let configuration = snapshot.configuration { limitMinutes = configuration.limitMinutes }
        refresh()
    }
    var selectionCount: Int { selection.applicationTokens.count + selection.categoryTokens.count + selection.webDomainTokens.count }
    var ownActivities: [DeviceActivityName] { center.activities.filter { $0.rawValue.hasPrefix(MonitorPolicy.activityPrefix) } }
    func refresh() {
        authorized = AuthorizationCenter.shared.authorizationStatus == .approved
        snapshot = SharedStore.snapshot()
        active = authorized && snapshot.configuration?.enabled == true && center.activities.contains(where: { $0.rawValue == snapshot.configuration?.activityName })
        if !authorized && snapshot.configuration?.enabled == true { stop(); message = "屏幕时间授权已关闭，请重新授权。" }
        else if snapshot.configuration?.enabled == true && !active { stop(); message = "系统监测计划已失效，请重新开启。" }
        else if active { message = "系统监测已注册；关闭 App 后由 iOS 处理阈值回调。" }
        Task {
            let settings = await UNUserNotificationCenter.current().notificationSettings()
            notificationsAllowed = settings.authorizationStatus == .authorized || settings.authorizationStatus == .provisional
        }
    }
    func authorize() async {
        busy = true
        defer { busy = false }
        do { try await AuthorizationCenter.shared.requestAuthorization(for: .individual); refresh() }
        catch { message = "未取得屏幕时间授权：\(error.localizedDescription)"; refresh() }
    }
    func requestNotifications() async {
        do {
            notificationsAllowed = try await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound])
            message = notificationsAllowed ? "提醒通知已允许。专注模式或系统设置仍可能静音。" : "通知未开启，仍可在 App 内查看报告。"
        } catch { message = "通知授权失败：\(error.localizedDescription)" }
    }
    func start() {
        guard !busy else { return }
        guard AuthorizationCenter.shared.authorizationStatus == .approved else { message = "请先授权屏幕时间。"; return }
        guard selectionCount > 0 else { message = "请至少选择一个 App、类别或网站。"; return }
        guard MonitorPolicy.limits.contains(limitMinutes) else { return }
        busy = true
        defer { busy = false }
        do {
            let store = try SharedStore()
            let encodedSelection = try JSONEncoder().encode(selection)
            var configuration = MonitorConfiguration()
            configuration.enabled = true
            configuration.limitMinutes = limitMinutes
            // New generation rejects delayed callbacks from any previous configuration.
            center.stopMonitoring(ownActivities)
            active = false
            try store.save(configuration)
            var begin = DateComponents(hour: 0, minute: 0)
            var end = DateComponents(hour: 23, minute: 59, second: 59)
            begin.timeZone = MonitorPolicy.calendar.timeZone
            end.timeZone = MonitorPolicy.calendar.timeZone
            let schedule = DeviceActivitySchedule(intervalStart: begin, intervalEnd: end, repeats: true)
            var events: [DeviceActivityEvent.Name: DeviceActivityEvent] = [:]
            for threshold in MonitorPolicy.thresholds(for: limitMinutes) {
                events[DeviceActivityEvent.Name("minutes.\(threshold)")] = DeviceActivityEvent(
                    applications: selection.applicationTokens, categories: selection.categoryTokens,
                    webDomains: selection.webDomainTokens, threshold: DateComponents(minute: threshold), includesPastActivity: true)
            }
            do { try center.startMonitoring(DeviceActivityName(configuration.activityName), during: schedule, events: events) }
            catch { configuration.enabled = false; try? store.save(configuration); throw error }
            UserDefaults.standard.set(encodedSelection, forKey: selectionKey)
            store.pruneReceipts()
            WidgetCenter.shared.reloadTimelines(ofKind: MonitorPolicy.widgetKind)
            refresh()
            message = "已开启：每日合计 \(limitMinutes) 分钟，达到一半和上限时提醒。"
        } catch { refresh(); message = "未能开启监测：\(error.localizedDescription)" }
    }
    func stop() {
        center.stopMonitoring(ownActivities)
        active = false
        do {
            let store = try SharedStore()
            if var configuration = try store.configuration() {
                configuration.enabled = false
                configuration.changedAt = Date()
                try store.save(configuration)
            }
            snapshot = SharedStore.snapshot()
            WidgetCenter.shared.reloadTimelines(ofKind: MonitorPolicy.widgetKind)
            message = "已停止监测。"
        } catch { message = "系统监测已停止，但本地状态写入失败：\(error.localizedDescription)" }
        UNUserNotificationCenter.current().removeAllPendingNotificationRequests()
    }
    var reportFilter: DeviceActivityFilter {
        let interval = MonitorPolicy.calendar.dateInterval(of: .day, for: Date())!
        return DeviceActivityFilter(segment: .daily(during: interval), users: .all, devices: .init([.iPhone]),
            applications: selection.applicationTokens, categories: selection.categoryTokens, webDomains: selection.webDomainTokens)
    }
}
