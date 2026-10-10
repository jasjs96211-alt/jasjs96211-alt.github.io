import Foundation

// Compile with Shared/MonitorPolicy.swift. No Apple account or device required.
@main
struct PolicyChecks {
    static func main() {
        let formatter = ISO8601DateFormatter()
        let before = formatter.date(from: "2026-10-10T15:59:59Z")!
        let after = formatter.date(from: "2026-10-10T16:00:00Z")!
        precondition(MonitorPolicy.dayKey(before) == "2026-10-10")
        precondition(MonitorPolicy.dayKey(after) == "2026-10-11")
        precondition(MonitorPolicy.nextMidnight(after: before) == after)
        for limit in MonitorPolicy.limits {
            precondition(MonitorPolicy.thresholds(for: limit) == [limit / 2, limit])
            precondition(MonitorPolicy.threshold(from: "minutes.\(limit)", limit: limit) == limit)
            precondition(MonitorPolicy.threshold(from: "minutes.\(limit / 2)", limit: limit) == limit / 2)
            precondition(MonitorPolicy.threshold(from: "minutes.999", limit: limit) == nil)
            precondition(MonitorPolicy.threshold(from: "unexpected.60", limit: limit) == nil)
        }
        var config = MonitorConfiguration()
        let stopped = MonitorSnapshot(configuration: config, receipt: nil, storageAvailable: true)
        precondition(stopped.title == "监测未开启")
        config.enabled = true
        let pending = MonitorSnapshot(configuration: config, receipt: nil, storageAvailable: true)
        precondition(pending.title == "等待今日提醒回调")
        let unavailable = MonitorSnapshot(configuration: nil, receipt: nil, storageAvailable: false)
        precondition(unavailable.title == "请打开 App 完成配置")
        precondition(config.activityName.hasPrefix(MonitorPolicy.activityPrefix))
        precondition(MonitorConfiguration().generation != config.generation)
        let encoded = try! JSONEncoder().encode(config)
        let decoded = try! JSONDecoder().decode(MonitorConfiguration.self, from: encoded)
        precondition(decoded.generation == config.generation && decoded.enabled)
        print("PASS: threshold policy, Shanghai midnight, status semantics, configuration round-trip")
    }
}
