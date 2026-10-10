import Foundation

/// App writes configuration; the monitor writes one immutable file per threshold.
/// The report target intentionally has neither this source nor App Group access.
struct SharedStore {
    private let directory: URL
    init() throws {
        guard let group = Bundle.main.object(forInfoDictionaryKey: "YHAppGroup") as? String,
              !group.isEmpty,
              let root = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: group)
        else { throw StoreError.missingAppGroup }
        directory = root.appendingPathComponent("YuanhangMonitor", isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    }
    enum StoreError: LocalizedError {
        case missingAppGroup
        var errorDescription: String? { "本机共享存储不可用，请检查 App Group 签名配置。" }
    }
    private var configurationURL: URL { directory.appendingPathComponent("configuration.json") }
    func configuration() throws -> MonitorConfiguration? {
        guard FileManager.default.fileExists(atPath: configurationURL.path) else { return nil }
        return try JSONDecoder().decode(MonitorConfiguration.self, from: Data(contentsOf: configurationURL))
    }
    func save(_ configuration: MonitorConfiguration) throws {
        try JSONEncoder().encode(configuration).write(to: configurationURL, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
    }
    func receipt(for configuration: MonitorConfiguration, at date: Date) -> ThresholdReceipt? {
        // Highest confirmed checkpoint wins even when callbacks arrive out of order.
        for threshold in MonitorPolicy.thresholds(for: configuration.limitMinutes).reversed() {
            let url = receiptURL(configuration, threshold: threshold, date: date)
            if let bytes = try? Data(contentsOf: url),
               let receipt = try? JSONDecoder().decode(ThresholdReceipt.self, from: bytes),
               receipt.generation == configuration.generation,
               receipt.day == MonitorPolicy.dayKey(date) { return receipt }
        }
        return nil
    }
    private func receiptURL(_ configuration: MonitorConfiguration, threshold: Int, date: Date) -> URL {
        directory.appendingPathComponent("receipt-\(configuration.generation)-\(MonitorPolicy.dayKey(date))-\(threshold).json")
    }
    /// Returns false for repeated or lower callbacks. No report data enters this store.
    func record(threshold: Int, configuration: MonitorConfiguration, at date: Date) throws -> Bool {
        guard configuration.enabled,
              MonitorPolicy.thresholds(for: configuration.limitMinutes).contains(threshold),
              (receipt(for: configuration, at: date)?.thresholdMinutes ?? 0) < threshold else { return false }
        let receipt = ThresholdReceipt(generation: configuration.generation, day: MonitorPolicy.dayKey(date), thresholdMinutes: threshold, receivedAt: date)
        try JSONEncoder().encode(receipt).write(to: receiptURL(configuration, threshold: threshold, date: date), options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
        return true
    }
    func pruneReceipts(now: Date = Date()) {
        let cutoff = now.addingTimeInterval(-7 * 86400)
        guard let urls = try? FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: [.contentModificationDateKey]) else { return }
        for url in urls where url.lastPathComponent.hasPrefix("receipt-") {
            if let values = try? url.resourceValues(forKeys: [.contentModificationDateKey]), let date = values.contentModificationDate, date < cutoff { try? FileManager.default.removeItem(at: url) }
        }
    }
    static func snapshot(at date: Date = Date()) -> MonitorSnapshot {
        do {
            let store = try SharedStore()
            let configuration = try store.configuration()
            let receipt = configuration.flatMap { store.receipt(for: $0, at: date) }
            return MonitorSnapshot(configuration: configuration, receipt: receipt, storageAvailable: true)
        } catch { return MonitorSnapshot(configuration: nil, receipt: nil, storageAvailable: false) }
    }
}
