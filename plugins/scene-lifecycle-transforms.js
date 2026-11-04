// Pure text/object edits behind plugins/with-ios-scene-lifecycle.js. No imports, so Node tests can run them.
//
// Why this exists: iOS 27 closes an app at launch unless it uses the scene lifecycle. Expo SDK 57 ships
// ExpoAppSceneDelegate for that, but its prebuild template does not turn it on. Two edits are needed in
// the generated iOS project: a scene manifest in Info.plist, and an AppDelegate that leaves window
// creation to the scene delegate.

const SCENE_DELEGATE_CLASS = 'EXExpoAppSceneDelegate';

/** Adds the scene manifest to an Info.plist object. Leaves an existing manifest alone. */
function applyInfoPlist(infoPlist) {
  if (infoPlist.UIApplicationSceneManifest) return infoPlist;
  infoPlist.UIApplicationSceneManifest = {
    UIApplicationSupportsMultipleScenes: false,
    UISceneConfigurations: {
      UIWindowSceneSessionRoleApplication: [
        {
          UISceneConfigurationName: 'Default Configuration',
          UISceneDelegateClassName: SCENE_DELEGATE_CLASS,
        },
      ],
    },
  };
  return infoPlist;
}

const CLASS_DECLARATION = /class AppDelegate: ExpoAppDelegate(\s*)\{/;
const WINDOW_BLOCK =
  /#if os\(iOS\) \|\| os\(tvOS\)\s*\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\s*\n\s*factory\.startReactNative\([^)]*\)\s*\n#endif[ \t]*\n/;

/**
 * Edits the Swift AppDelegate source: conform to ExpoReactNativeFactoryProvider (so the scene delegate
 * can reach the React Native factory) and stop creating the window here (the scene delegate does it).
 * Throws if the source is not shaped the way this expects, instead of producing an app that crashes.
 */
function applyAppDelegate(source) {
  if (/ExpoReactNativeFactoryProvider/.test(source)) return source; // already adopted

  if (!CLASS_DECLARATION.test(source)) {
    throw new Error(
      'with-ios-scene-lifecycle: could not find "class AppDelegate: ExpoAppDelegate {" in AppDelegate.swift. ' +
        'The Expo template changed; update plugins/scene-lifecycle-transforms.js.'
    );
  }
  if (!WINDOW_BLOCK.test(source)) {
    throw new Error(
      'with-ios-scene-lifecycle: could not find the window-creation block in AppDelegate.swift. ' +
        'The Expo template changed; update plugins/scene-lifecycle-transforms.js.'
    );
  }

  return source
    .replace(CLASS_DECLARATION, 'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider$1{')
    .replace(
      WINDOW_BLOCK,
      '    // Scene lifecycle (required by iOS 27): ExpoAppSceneDelegate creates the window and starts React Native.\n'
    );
}

module.exports = { applyInfoPlist, applyAppDelegate, SCENE_DELEGATE_CLASS };
