"""Generate a dependency-free Xcode project. Python 3 standard library only.

Project/plist outputs are generated; Swift and Signing.xcconfig stay untouched.
"""
from pathlib import Path
import hashlib
import json
import plistlib
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
TARGETS = {
    "YuanhangMonitor": {"directory": "App", "suffix": "monitor", "sources": ["App/YuanhangApp.swift", "App/MonitorModel.swift", "Shared/MonitorPolicy.swift", "Shared/SharedStore.swift"], "family": True, "group": True},
    "YuanhangActivityMonitor": {"directory": "Monitor", "suffix": "monitor.activity", "sources": ["Monitor/YuanhangActivityMonitor.swift", "Shared/MonitorPolicy.swift", "Shared/SharedStore.swift"], "family": True, "group": True, "extension": "com.apple.deviceactivity.monitor-extension", "principal": "$(PRODUCT_MODULE_NAME).YuanhangActivityMonitor"},
    "YuanhangReport": {"directory": "Report", "suffix": "monitor.report", "sources": ["Report/YuanhangReport.swift"], "family": True, "group": False, "extension": "com.apple.deviceactivityui.report-extension"},
    "YuanhangWidget": {"directory": "Widget", "suffix": "monitor.widget", "sources": ["Widget/YuanhangWidget.swift", "Shared/MonitorPolicy.swift", "Shared/SharedStore.swift"], "family": False, "group": True, "extension": "com.apple.widgetkit-extension"},
}

def identifier(label):
    return hashlib.sha256(label.encode()).hexdigest()[:24].upper()

def project_model():
    objects = {}
    def add(label, isa, **fields):
        key = identifier(label)
        assert key not in objects
        objects[key] = {"isa": isa, **fields}
        return key
    file_refs = {}
    paths = sorted({p for t in TARGETS.values() for p in t["sources"]})
    paths += ["Configuration/Signing.xcconfig"]
    for path in paths:
        kind = "sourcecode.swift" if path.endswith(".swift") else "text.xcconfig"
        file_refs[path] = add("file:" + path, "PBXFileReference", lastKnownFileType=kind, path=path, sourceTree="<group>")
    products = []
    for name, spec in TARGETS.items():
        ext = "extension" in spec
        products.append(add("product:" + name, "PBXFileReference", explicitFileType="wrapper.app-extension" if ext else "wrapper.application", includeInIndex="0", path=name + (".appex" if ext else ".app"), sourceTree="BUILT_PRODUCTS_DIR"))
    product_group = add("products", "PBXGroup", children=products, name="Products", sourceTree="<group>")
    main_group = add("main", "PBXGroup", children=list(file_refs.values()) + [product_group], sourceTree="<group>")
    def configurations(label, settings):
        refs = []
        for configuration in ("Debug", "Release"):
            values = dict(settings)
            values.update(SWIFT_OPTIMIZATION_LEVEL="-Onone" if configuration == "Debug" else "-O", DEBUG_INFORMATION_FORMAT="dwarf" if configuration == "Debug" else "dwarf-with-dsym")
            if configuration == "Debug": values["SWIFT_ACTIVE_COMPILATION_CONDITIONS"] = "DEBUG"
            refs.append(add(label + configuration, "XCBuildConfiguration", name=configuration, baseConfigurationReference=file_refs["Configuration/Signing.xcconfig"], buildSettings=values))
        return add(label + "configs", "XCConfigurationList", buildConfigurations=refs, defaultConfigurationIsVisible="0", defaultConfigurationName="Release")
    project_configs = configurations("project:", {"IPHONEOS_DEPLOYMENT_TARGET": "17.4", "SDKROOT": "iphoneos", "SWIFT_VERSION": "5.0", "CLANG_ENABLE_MODULES": "YES", "CODE_SIGN_STYLE": "Automatic"})
    for name, spec in TARGETS.items():
        ext = "extension" in spec
        build_files = [add("build:" + name + path, "PBXBuildFile", fileRef=file_refs[path]) for path in spec["sources"]]
        phases = [add("sources:" + name, "PBXSourcesBuildPhase", buildActionMask="2147483647", files=build_files, runOnlyForDeploymentPostprocessing="0"), add("frameworks:" + name, "PBXFrameworksBuildPhase", buildActionMask="2147483647", files=[], runOnlyForDeploymentPostprocessing="0"), add("resources:" + name, "PBXResourcesBuildPhase", buildActionMask="2147483647", files=[], runOnlyForDeploymentPostprocessing="0")]
        dependencies = []
        if not ext:
            embedded = []
            for child in list(TARGETS)[1:]:
                embedded.append(add("embed:" + child, "PBXBuildFile", fileRef=identifier("product:" + child), settings={"ATTRIBUTES": ["RemoveHeadersOnCopy"]}))
                proxy = add("proxy:" + child, "PBXContainerItemProxy", containerPortal=identifier("project"), proxyType="1", remoteGlobalIDString=identifier("target:" + child), remoteInfo=child)
                dependencies.append(add("dependency:" + child, "PBXTargetDependency", target=identifier("target:" + child), targetProxy=proxy))
            phases.append(add("embed-phase", "PBXCopyFilesBuildPhase", buildActionMask="2147483647", dstPath="", dstSubfolderSpec="13", files=embedded, name="Embed App Extensions", runOnlyForDeploymentPostprocessing="0"))
        settings = {"PRODUCT_NAME": "$(TARGET_NAME)", "PRODUCT_BUNDLE_IDENTIFIER": "$(YH_BUNDLE_PREFIX)." + spec["suffix"], "INFOPLIST_FILE": spec["directory"] + "/Info.plist", "CODE_SIGN_ENTITLEMENTS": spec["directory"] + "/" + name + ".entitlements", "CURRENT_PROJECT_VERSION": "1", "MARKETING_VERSION": "0.1.0", "TARGETED_DEVICE_FAMILY": "1", "SUPPORTED_PLATFORMS": "iphoneos iphonesimulator", "SUPPORTS_MACCATALYST": "NO", "GENERATE_INFOPLIST_FILE": "NO", "SKIP_INSTALL": "YES" if ext else "NO", "LD_RUNPATH_SEARCH_PATHS": ["$(inherited)", "@executable_path/Frameworks"] + (["@executable_path/../../Frameworks"] if ext else [])}
        if ext: settings["APPLICATION_EXTENSION_API_ONLY"] = "YES"
        configs = configurations("target:" + name, settings)
        add("target:" + name, "PBXNativeTarget", buildConfigurationList=configs, buildPhases=phases, buildRules=[], dependencies=dependencies, name=name, productName=name, productReference=identifier("product:" + name), productType="com.apple.product-type.app-extension" if ext else "com.apple.product-type.application")
    add("project", "PBXProject", attributes={"LastUpgradeCheck": "1600", "BuildIndependentTargetsInParallel": "YES"}, buildConfigurationList=project_configs, compatibilityVersion="Xcode 14.0", developmentRegion="zh-Hans", hasScannedForEncodings="0", knownRegions=["en", "zh-Hans", "Base"], mainGroup=main_group, productRefGroup=product_group, projectDirPath="", projectRoot="", targets=[identifier("target:" + n) for n in TARGETS])
    return {"archiveVersion": "1", "classes": {}, "objectVersion": "56", "objects": objects, "rootObject": identifier("project")}

def openstep(value, level=0):
    pad = "\t" * level
    if isinstance(value, dict):
        return "{\n" + "".join(pad + "\t" + json.dumps(k) + " = " + openstep(v, level + 1) + ";\n" for k, v in value.items()) + pad + "}"
    if isinstance(value, list):
        return "(\n" + "".join(pad + "\t" + openstep(v, level + 1) + ",\n" for v in value) + pad + ")"
    return json.dumps(str(value), ensure_ascii=False)

def generate():
    project = ROOT / "YuanhangMonitor.xcodeproj"
    project.mkdir(exist_ok=True)
    (project / "project.pbxproj").write_text("// !$*UTF8*$!\n" + openstep(project_model()) + "\n")
    for name, spec in TARGETS.items():
        info = {"CFBundleDevelopmentRegion": "$(DEVELOPMENT_LANGUAGE)", "CFBundleDisplayName": "远航监测", "CFBundleExecutable": "$(EXECUTABLE_NAME)", "CFBundleIdentifier": "$(PRODUCT_BUNDLE_IDENTIFIER)", "CFBundleInfoDictionaryVersion": "6.0", "CFBundleName": "$(PRODUCT_NAME)", "CFBundlePackageType": "XPC!" if "extension" in spec else "APPL", "CFBundleShortVersionString": "$(MARKETING_VERSION)", "CFBundleVersion": "$(CURRENT_PROJECT_VERSION)"}
        if spec["group"]: info["YHAppGroup"] = "$(YH_APP_GROUP)"
        if "extension" in spec:
            info["NSExtension"] = {"NSExtensionPointIdentifier": spec["extension"]}
            if spec.get("principal"): info["NSExtension"]["NSExtensionPrincipalClass"] = spec["principal"]
        else:
            info.update(LSRequiresIPhoneOS=True, UILaunchScreen={}, UISupportedInterfaceOrientations=["UIInterfaceOrientationPortrait", "UIInterfaceOrientationLandscapeLeft", "UIInterfaceOrientationLandscapeRight"], UIApplicationSceneManifest={"UIApplicationSupportsMultipleScenes": False}, CFBundleURLTypes=[{"CFBundleURLName": "yuanhang-monitor", "CFBundleURLSchemes": ["yuanhang-monitor"]}])
        entitlements = {}
        if spec["family"]: entitlements["com.apple.developer.family-controls"] = True
        if spec["group"]: entitlements["com.apple.security.application-groups"] = ["$(YH_APP_GROUP)"]
        (ROOT / spec["directory"] / "Info.plist").write_bytes(plistlib.dumps(info))
        (ROOT / spec["directory"] / (name + ".entitlements")).write_bytes(plistlib.dumps(entitlements))
    scheme = ET.Element("Scheme", LastUpgradeVersion="1600", version="1.3")
    action = ET.SubElement(scheme, "BuildAction", parallelizeBuildables="YES", buildImplicitDependencies="YES")
    entries = ET.SubElement(action, "BuildActionEntries")
    entry = ET.SubElement(entries, "BuildActionEntry", buildForTesting="YES", buildForRunning="YES", buildForProfiling="YES", buildForArchiving="YES", buildForAnalyzing="YES")
    reference = {"BuildableIdentifier": "primary", "BlueprintIdentifier": identifier("target:YuanhangMonitor"), "BuildableName": "YuanhangMonitor.app", "BlueprintName": "YuanhangMonitor", "ReferencedContainer": "container:YuanhangMonitor.xcodeproj"}
    ET.SubElement(entry, "BuildableReference", **reference)
    launch = ET.SubElement(scheme, "LaunchAction", buildConfiguration="Debug", selectedDebuggerIdentifier="Xcode.DebuggerFoundation.Debugger.LLDB", selectedLauncherIdentifier="Xcode.IDEFoundation.Launcher.LLDB", launchStyle="0", useCustomWorkingDirectory="NO", ignoresPersistentStateOnLaunch="NO", debugDocumentVersioning="YES", allowLocationSimulation="YES")
    ET.SubElement(ET.SubElement(launch, "BuildableProductRunnable", runnableDebuggingMode="0"), "BuildableReference", **reference)
    ET.SubElement(scheme, "AnalyzeAction", buildConfiguration="Debug")
    ET.SubElement(scheme, "ArchiveAction", buildConfiguration="Release", revealArchiveInOrganizer="YES")
    destination = project / "xcshareddata/xcschemes/YuanhangMonitor.xcscheme"
    destination.parent.mkdir(parents=True, exist_ok=True)
    ET.indent(scheme)
    destination.write_bytes(ET.tostring(scheme, encoding="utf-8", xml_declaration=True))
    print("Generated four-target Xcode project; no signing account or certificate configured.")

if __name__ == "__main__":
    generate()
