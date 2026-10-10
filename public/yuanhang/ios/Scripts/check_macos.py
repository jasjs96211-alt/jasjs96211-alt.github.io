"""Run actual Swift policy tests and unsigned iOS compilation on a Mac with Xcode.

Usage: python3 Scripts/check_macos.py
Does not install, sign, upload, register identifiers or access Apple accounts.
"""
from pathlib import Path
import shutil
import subprocess
import tempfile
import sys

root = Path(__file__).resolve().parents[1]
if not shutil.which("xcodebuild") or not shutil.which("xcrun"):
    sys.exit("BLOCKED: Xcode is required. No Swift compilation or iPhone validation was performed.")
with tempfile.TemporaryDirectory(prefix="yuanhang-native-check-") as temp:
    binary = str(Path(temp) / "policy-checks")
    subprocess.run(["xcrun", "swiftc", str(root / "Shared/MonitorPolicy.swift"), str(root / "Tests/PolicyChecks.swift"), "-o", binary], check=True)
    subprocess.run([binary], check=True)
    subprocess.run(["xcodebuild", "-project", str(root / "YuanhangMonitor.xcodeproj"), "-scheme", "YuanhangMonitor", "-configuration", "Debug", "-sdk", "iphoneos", "-destination", "generic/platform=iOS", "-derivedDataPath", str(Path(temp) / "DerivedData"), "CODE_SIGNING_ALLOWED=NO", "build"], check=True)
print("Unsigned compilation passed. Signed iPhone authorization/callback/widget tests remain required.")
