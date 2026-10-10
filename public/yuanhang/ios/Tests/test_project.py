"""Portable structural checks. These are NOT Swift compilation or device tests."""
from pathlib import Path
import importlib.util
import plistlib
import re
import unittest
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("generator", ROOT / "Scripts/generate_project.py")
generator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(generator)

class ProjectChecks(unittest.TestCase):
    def setUp(self):
        self.model = generator.project_model()
        self.objects = self.model["objects"]
    def test_generated_project_is_current(self):
        expected = "// !$*UTF8*$!\n" + generator.openstep(self.model) + "\n"
        self.assertEqual(expected, (ROOT / "YuanhangMonitor.xcodeproj/project.pbxproj").read_text())
    def test_all_project_references_resolve(self):
        def check(value):
            if isinstance(value, dict):
                for child in value.values(): check(child)
            elif isinstance(value, list):
                for child in value: check(child)
            elif isinstance(value, str) and re.fullmatch(r"[A-F0-9]{24}", value): self.assertIn(value, self.objects)
        check(self.model)
    def test_four_targets_and_three_embedded_extensions(self):
        targets = [x for x in self.objects.values() if x["isa"] == "PBXNativeTarget"]
        self.assertEqual(len(targets), 4)
        app = next(x for x in targets if x["name"] == "YuanhangMonitor")
        self.assertEqual(len(app["dependencies"]), 3)
        embed = self.objects[generator.identifier("embed-phase")]
        self.assertEqual(len(embed["files"]), 3)
        self.assertEqual(embed["dstSubfolderSpec"], "13")
    def test_source_files_exist_and_are_assigned_once_per_target(self):
        for target in generator.TARGETS.values():
            self.assertEqual(len(target["sources"]), len(set(target["sources"])))
            for path in target["sources"]: self.assertTrue((ROOT / path).is_file(), path)
        assigned = {p for t in generator.TARGETS.values() for p in t["sources"]}
        actual = {str(p.relative_to(ROOT)) for d in ["App", "Shared", "Monitor", "Report", "Widget"] for p in (ROOT / d).glob("*.swift")}
        self.assertEqual(assigned, actual)
    def test_entitlements_match_privacy_boundary(self):
        for name, target in generator.TARGETS.items():
            values = plistlib.loads((ROOT / target["directory"] / (name + ".entitlements")).read_bytes())
            self.assertEqual(values.get("com.apple.developer.family-controls", False), target["family"])
            self.assertEqual("com.apple.security.application-groups" in values, target["group"])
        self.assertEqual(generator.TARGETS["YuanhangReport"]["sources"], ["Report/YuanhangReport.swift"])
    def test_extension_points_and_deep_link(self):
        for name, target in generator.TARGETS.items():
            info = plistlib.loads((ROOT / target["directory"] / "Info.plist").read_bytes())
            if "extension" in target: self.assertEqual(info["NSExtension"]["NSExtensionPointIdentifier"], target["extension"])
            if target["group"]: self.assertEqual(info["YHAppGroup"], "$(YH_APP_GROUP)")
        app = plistlib.loads((ROOT / "App/Info.plist").read_bytes())
        self.assertEqual(app["CFBundleURLTypes"][0]["CFBundleURLSchemes"], ["yuanhang-monitor"])
    def test_scheme_builds_containing_app(self):
        scheme = ET.parse(ROOT / "YuanhangMonitor.xcodeproj/xcshareddata/xcschemes/YuanhangMonitor.xcscheme")
        self.assertEqual(scheme.find(".//BuildableReference").get("BlueprintIdentifier"), generator.identifier("target:YuanhangMonitor"))
    def test_report_has_no_network_or_shared_storage(self):
        source = (ROOT / "Report/YuanhangReport.swift").read_text()
        source = re.sub(r"//[^\n]*", "", source)
        for forbidden in ["URLSession", "UserDefaults", "SharedStore", "FileManager", "WidgetCenter"]: self.assertNotIn(forbidden, source)
    def test_minimum_ios_covers_includes_past_activity(self):
        for obj in self.objects.values():
            if obj["isa"] == "XCBuildConfiguration" and "IPHONEOS_DEPLOYMENT_TARGET" in obj["buildSettings"]:
                self.assertGreaterEqual(tuple(map(int, obj["buildSettings"]["IPHONEOS_DEPLOYMENT_TARGET"].split("."))), (17, 4))
        source = (ROOT / "App/MonitorModel.swift").read_text()
        self.assertIn("guard selectionCount > 0", source)
        self.assertIn("includesPastActivity: true", source)
    def test_report_does_not_relabel_whole_screen_duration(self):
        source = (ROOT / "Report/YuanhangReport.swift").read_text()
        self.assertNotIn("segment.totalActivityDuration", source)
        self.assertIn("application.totalActivityDuration", source)
        self.assertIn("domain.totalActivityDuration", source)
    def test_no_identity_or_signing_secrets_committed(self):
        signing = (ROOT / "Configuration/Signing.xcconfig").read_text()
        self.assertRegex(signing, r"DEVELOPMENT_TEAM =\s*\n")
        self.assertFalse(list(ROOT.rglob("*.p12")))
        self.assertFalse(list(ROOT.rglob("*.mobileprovision")))

if __name__ == "__main__": unittest.main(verbosity=2)
