/**
 * Tests for plugins/scene-lifecycle-transforms.js, the edits that make a prebuilt iOS project adopt the
 * scene lifecycle (iOS 27 closes the app at launch without it).
 *
 * The sample AppDelegate below is the one `expo prebuild` generated for this project on Expo SDK 57.
 * These tests check the text edits only. That the edited project really launches on iOS 27 was
 * confirmed by building it and running it on a physical iPhone, which Node cannot do.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { applyAppDelegate, applyInfoPlist, SCENE_DELEGATE_CLASS } from '../plugins/scene-lifecycle-transforms.js';

const GENERATED_APP_DELEGATE = `internal import Expo
import React
import ReactAppDependencyProvider

@main
class AppDelegate: ExpoAppDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  // Linking API
  public override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return super.application(app, open: url, options: options) || RCTLinkingManager.application(app, open: url, options: options)
  }

  // Universal Links
  public override func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    let result = RCTLinkingManager.application(application, continue: userActivity, restorationHandler: restorationHandler)
    return super.application(application, continue: userActivity, restorationHandler: restorationHandler) || result
  }
}

class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {
  // Extension point for config-plugins

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    // needed to return the correct URL for expo-dev-client.
    bridge.bundleURL ?? bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
`;

describe('applyInfoPlist', () => {
  it('adds a scene manifest that points at Expo\'s scene delegate', () => {
    const plist = applyInfoPlist({ CFBundleName: 'BattleBuddy' }) as Record<string, any>;
    const configs = plist.UIApplicationSceneManifest.UISceneConfigurations.UIWindowSceneSessionRoleApplication;
    assert.equal(configs.length, 1);
    assert.equal(configs[0].UISceneDelegateClassName, SCENE_DELEGATE_CLASS);
    assert.equal(SCENE_DELEGATE_CLASS, 'EXExpoAppSceneDelegate');
    assert.equal(plist.UIApplicationSceneManifest.UIApplicationSupportsMultipleScenes, false);
  });

  it('keeps the other keys', () => {
    const plist = applyInfoPlist({ CFBundleName: 'BattleBuddy', UILaunchStoryboardName: 'SplashScreen' });
    assert.equal(plist.CFBundleName, 'BattleBuddy');
    assert.equal(plist.UILaunchStoryboardName, 'SplashScreen');
  });

  it('leaves an existing manifest alone, and is safe to run twice', () => {
    const custom = { UIApplicationSceneManifest: { custom: true } };
    assert.deepEqual(applyInfoPlist({ ...custom }), custom);
    const once = applyInfoPlist({});
    assert.deepEqual(applyInfoPlist(structuredClone(once)), once);
  });
});

describe('applyAppDelegate', () => {
  it('conforms to ExpoReactNativeFactoryProvider so the scene delegate can reach the factory', () => {
    const out = applyAppDelegate(GENERATED_APP_DELEGATE);
    assert.match(out, /class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider \{/);
  });

  it('stops creating the window and starting React Native in the app delegate', () => {
    const out = applyAppDelegate(GENERATED_APP_DELEGATE);
    assert.ok(GENERATED_APP_DELEGATE.includes('startReactNative'), 'sample should have had the block');
    assert.ok(!out.includes('startReactNative'));
    assert.ok(!out.includes('UIWindow(frame:'));
  });

  it('keeps the factory, the window property, and the linking handlers', () => {
    const out = applyAppDelegate(GENERATED_APP_DELEGATE);
    for (const keep of [
      'var window: UIWindow?',
      'var reactNativeFactory: RCTReactNativeFactory?',
      'reactNativeFactory = factory',
      'return super.application(application, didFinishLaunchingWithOptions: launchOptions)',
      'RCTLinkingManager.application(app, open: url, options: options)',
      'class ReactNativeDelegate: ExpoReactNativeFactoryDelegate',
    ]) {
      assert.ok(out.includes(keep), `lost: ${keep}`);
    }
  });

  it('is safe to run twice', () => {
    const once = applyAppDelegate(GENERATED_APP_DELEGATE);
    assert.equal(applyAppDelegate(once), once);
  });

  it('fails loudly, instead of producing a crashing app, when the template has changed shape', () => {
    assert.throws(
      () => applyAppDelegate(GENERATED_APP_DELEGATE.replace('class AppDelegate: ExpoAppDelegate', 'class Renamed: ExpoAppDelegate')),
      /could not find "class AppDelegate/
    );
    assert.throws(
      () => applyAppDelegate(GENERATED_APP_DELEGATE.replace('window = UIWindow(frame: UIScreen.main.bounds)', 'window = makeWindow()')),
      /window-creation block/
    );
  });
});
