// Expo config plugin: adopt the iOS scene lifecycle, which iOS 27 requires (the app is closed at launch
// without it). Runs on every `expo prebuild`, so the generated, gitignored ios/ folder stays correct.
// The edits themselves live in scene-lifecycle-transforms.js so they can be tested without Expo.
const { withAppDelegate, withInfoPlist } = require('expo/config-plugins');

const { applyAppDelegate, applyInfoPlist } = require('./scene-lifecycle-transforms.js');

module.exports = function withIosSceneLifecycle(config) {
  config = withInfoPlist(config, (mod) => {
    mod.modResults = applyInfoPlist(mod.modResults);
    return mod;
  });

  config = withAppDelegate(config, (mod) => {
    if (mod.modResults.language !== 'swift') {
      throw new Error(
        `with-ios-scene-lifecycle: expected a Swift AppDelegate but found ${mod.modResults.language}.`
      );
    }
    mod.modResults.contents = applyAppDelegate(mod.modResults.contents);
    return mod;
  });

  return config;
};
