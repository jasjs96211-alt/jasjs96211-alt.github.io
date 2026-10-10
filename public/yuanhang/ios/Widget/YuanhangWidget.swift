import WidgetKit
import SwiftUI

struct MonitorEntry: TimelineEntry {
    let date: Date
    let snapshot: MonitorSnapshot
}
struct MonitorProvider: TimelineProvider {
    func placeholder(in context: Context) -> MonitorEntry {
        MonitorEntry(date: Date(), snapshot: MonitorSnapshot(configuration: nil, receipt: nil, storageAvailable: true))
    }
    func getSnapshot(in context: Context, completion: @escaping (MonitorEntry) -> Void) {
        completion(MonitorEntry(date: Date(), snapshot: SharedStore.snapshot()))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<MonitorEntry>) -> Void) {
        let now = Date(), midnight = MonitorPolicy.nextMidnight(after: now)
        let current = SharedStore.snapshot(at: now)
        // A future entry prevents yesterday's receipt lingering after midnight.
        let next = MonitorSnapshot(configuration: current.configuration, receipt: nil, storageAvailable: current.storageAvailable)
        completion(Timeline(entries: [MonitorEntry(date: now, snapshot: current), MonitorEntry(date: midnight, snapshot: next)], policy: .after(min(now.addingTimeInterval(1800), midnight))))
    }
}
struct MonitorWidgetView: View {
    let entry: MonitorEntry
    @Environment(\.widgetFamily) var family
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("远航监测", systemImage: "sailboat.fill").font(.subheadline.bold())
            Text(entry.snapshot.title).font(.headline).minimumScaleFactor(0.8)
            if entry.snapshot.configuration?.enabled == true {
                if let receipt = entry.snapshot.receipt {
                    Text("\(receipt.thresholdMinutes) 分钟阈值").font(.title3.bold())
                    Text("回调 \(receipt.receivedAt.formatted(date: .omitted, time: .shortened))").font(.caption2)
                } else { Text("未收到提醒 ≠ 使用为零").font(.caption) }
                Text("每日上限 \(entry.snapshot.configuration?.limitMinutes ?? 60) 分钟").font(.caption)
            }
            if family == .systemMedium { Text("点此查看系统报告 · 更新由 iOS 调度").font(.caption2).foregroundStyle(.secondary) }
        }.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
            .containerBackground(Color(red: 0.89, green: 0.95, blue: 0.92), for: .widget)
            .widgetURL(URL(string: "yuanhang-monitor://home"))
    }
}
@main
struct YuanhangWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: MonitorPolicy.widgetKind, provider: MonitorProvider()) { MonitorWidgetView(entry: $0) }
            .configurationDisplayName("远航 · 娱乐提醒")
            .description("查看监测计划与最近阈值提醒，点开查看使用报告。")
            .supportedFamilies([.systemSmall, .systemMedium])
    }
}
