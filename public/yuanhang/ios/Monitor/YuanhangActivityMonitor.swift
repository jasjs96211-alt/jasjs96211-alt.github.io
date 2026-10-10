import DeviceActivity
import Foundation
import UserNotifications
import WidgetKit
import OSLog

final class YuanhangActivityMonitor: DeviceActivityMonitor {
    private let logger = Logger(subsystem: "YuanhangMonitor", category: "Threshold")
    override func intervalDidStart(for activity: DeviceActivityName) {
        super.intervalDidStart(for: activity)
        // Do not clear today's receipts: duplicate start callbacks must not reset them.
        WidgetCenter.shared.reloadTimelines(ofKind: MonitorPolicy.widgetKind)
    }
    override func eventDidReachThreshold(_ event: DeviceActivityEvent.Name, activity: DeviceActivityName) {
        super.eventDidReachThreshold(event, activity: activity)
        do {
            let store = try SharedStore()
            guard let configuration = try store.configuration(), configuration.enabled,
                  activity.rawValue == configuration.activityName,
                  let threshold = MonitorPolicy.threshold(from: event.rawValue, limit: configuration.limitMinutes) else { return }
            let now = Date()
            guard try store.record(threshold: threshold, configuration: configuration, at: now) else { return }
            WidgetCenter.shared.reloadTimelines(ofKind: MonitorPolicy.widgetKind)
            let content = UNMutableNotificationContent()
            content.title = threshold >= configuration.limitMinutes ? "远航：今天的娱乐额度到了" : "远航：娱乐额度已用到一半"
            content.body = "所选应用已触发 \(threshold) 分钟提醒。放下手机，回到你今天最重要的任务。"
            content.sound = .default
            let id = "yuanhang.\(configuration.generation).\(MonitorPolicy.dayKey(now)).\(threshold)"
            // A fixed identifier makes repeated delivery requests replace each other.
            UNUserNotificationCenter.current().add(UNNotificationRequest(identifier: id, content: content, trigger: nil)) { error in
                if error != nil { self.logger.error("Unable to schedule the threshold notification") }
            }
        } catch { logger.error("Unable to persist the monitor callback") }
    }
    override func intervalDidEnd(for activity: DeviceActivityName) {
        super.intervalDidEnd(for: activity)
        WidgetCenter.shared.reloadTimelines(ofKind: MonitorPolicy.widgetKind)
    }
}
