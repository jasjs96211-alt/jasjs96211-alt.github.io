import Foundation

// No application names, raw Screen Time durations or report data are stored here.
enum MonitorPolicy {
    static let widgetKind = "YuanhangMonitorWidget"
    static let activityPrefix = "yuanhang.daily."
    static let limits = [30, 60, 90, 120]
    static var calendar: Calendar {
        var value = Calendar(identifier: .gregorian)
        value.timeZone = TimeZone(identifier: "Asia/Shanghai")!
        return value
    }
    static func dayKey(_ date: Date) -> String {
        let parts = calendar.dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", parts.year!, parts.month!, parts.day!)
    }
    static func thresholds(for limit: Int) -> [Int] { [limit / 2, limit] }
    static func threshold(from name: String, limit: Int) -> Int? {
        guard name.hasPrefix("minutes."), let value = Int(name.dropFirst(8)),
              thresholds(for: limit).contains(value) else { return nil }
        return value
    }
    static func nextMidnight(after date: Date) -> Date {
        calendar.date(byAdding: .day, value: 1, to: calendar.startOfDay(for: date))!
    }
}

struct MonitorConfiguration: Codable {
    var enabled = false
    var generation = UUID().uuidString
    var limitMinutes = 60
    var changedAt = Date()
    var activityName: String { MonitorPolicy.activityPrefix + generation }
}

struct ThresholdReceipt: Codable {
    let generation: String
    let day: String
    let thresholdMinutes: Int
    let receivedAt: Date
}

struct MonitorSnapshot {
    let configuration: MonitorConfiguration?
    let receipt: ThresholdReceipt?
    let storageAvailable: Bool
    var title: String {
        guard storageAvailable else { return "请打开 App 完成配置" }
        guard configuration?.enabled == true else { return "监测未开启" }
        return receipt == nil ? "等待今日提醒回调" : "已收到阈值提醒"
    }
}
