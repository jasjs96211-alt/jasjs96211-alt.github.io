import SwiftUI
import DeviceActivity

// Deliberately no SharedStore, App Group, networking or data export in this target.
@main
struct YuanhangReportExtension: DeviceActivityReportExtension {
    var body: some DeviceActivityReportScene { SelectedDailyReport { DailyReportView(configuration: $0) } }
}
struct DailyConfiguration {
    var applicationSeconds: TimeInterval = 0
    var webSeconds: TimeInterval = 0
    var hasRecords = false
}
struct SelectedDailyReport: DeviceActivityReportScene {
    let context = DeviceActivityReport.Context("yuanhang.selected.daily")
    let content: (DailyConfiguration) -> DailyReportView
    func makeConfiguration(representing data: DeviceActivityResults<DeviceActivityData>) async -> DailyConfiguration {
        var result = DailyConfiguration()
        for await device in data {
            for await segment in device.activitySegments {
                // Do not relabel the segment's whole-screen duration as selected-app usage.
                for await category in segment.categories {
                    for await application in category.applications {
                        result.hasRecords = true
                        result.applicationSeconds += application.totalActivityDuration
                    }
                    for await domain in category.webDomains {
                        result.hasRecords = true
                        result.webSeconds += domain.totalActivityDuration
                    }
                }
            }
        }
        return result
    }
}
struct DailyReportView: View {
    let configuration: DailyConfiguration
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("今日所选内容 · 系统报告").font(.subheadline).foregroundStyle(.secondary)
            if configuration.hasRecords {
                Text("应用 \(duration(configuration.applicationSeconds))").font(.title2.bold())
                Text("网站 \(duration(configuration.webSeconds))").font(.subheadline)
            } else { Text("暂无可用记录").font(.title2.bold()) }
            Text("应用与网站时长可能重叠，不相加。系统统计可能延迟；无记录不代表使用为零。").font(.footnote).foregroundStyle(.secondary)
        }.frame(maxWidth: .infinity, alignment: .leading).padding()
    }
    private func duration(_ seconds: TimeInterval) -> String {
        let minutes = Int(max(0, seconds) / 60)
        return minutes < 1 ? "不足 1 分钟" : "\(minutes) 分钟"
    }
}
