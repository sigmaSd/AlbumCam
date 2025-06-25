const { withAndroidManifest, withInfoPlist, withAppBuildGradle } = require(
  "@expo/config-plugins",
);

const withReactNativeCamera = (config) => {
  // Add Android permissions
  config = withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;

    // Ensure permissions array exists
    if (!androidManifest.manifest["uses-permission"]) {
      androidManifest.manifest["uses-permission"] = [];
    }

    const permissions = [
      "android.permission.CAMERA",
      "android.permission.RECORD_AUDIO",
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.WRITE_EXTERNAL_STORAGE",
    ];

    permissions.forEach((permission) => {
      const exists = androidManifest.manifest["uses-permission"].some(
        (perm) => perm.$["android:name"] === permission,
      );

      if (!exists) {
        androidManifest.manifest["uses-permission"].push({
          $: { "android:name": permission },
        });
      }
    });

    // Add camera features
    if (!androidManifest.manifest["uses-feature"]) {
      androidManifest.manifest["uses-feature"] = [];
    }

    const features = [
      "android.hardware.camera",
      "android.hardware.camera.autofocus",
    ];

    features.forEach((feature) => {
      const exists = androidManifest.manifest["uses-feature"].some(
        (feat) => feat.$["android:name"] === feature,
      );

      if (!exists) {
        androidManifest.manifest["uses-feature"].push({
          $: {
            "android:name": feature,
            "android:required": "false",
          },
        });
      }
    });

    return config;
  });

  // Add iOS permissions
  config = withInfoPlist(config, async (config) => {
    const plist = config.modResults;

    // Camera usage description
    plist.NSCameraUsageDescription =
      "AlbumCam needs access to your camera to take photos and organize them into albums.";

    // Microphone usage description (required by react-native-camera even if not using audio)
    plist.NSMicrophoneUsageDescription =
      "AlbumCam needs microphone access for video recording features.";

    // Photo library usage description
    plist.NSPhotoLibraryUsageDescription =
      "AlbumCam needs access to your photo library to save photos to specific albums.";

    // Photo library add usage description
    plist.NSPhotoLibraryAddUsageDescription =
      "AlbumCam needs permission to save photos to your photo library.";

    return config;
  });

  // Add app-level Gradle configuration to force general flavor
  config = withAppBuildGradle(config, async (config) => {
    const buildGradle = config.modResults.contents;

    // Check if the configuration is already present
    if (
      !buildGradle.includes("missingDimensionStrategy 'react-native-camera'")
    ) {
      // Find the android block and add the dimension strategy inside defaultConfig
      const androidBlockRegex = /android\s*\{[\s\S]*?defaultConfig\s*\{/;
      const match = buildGradle.match(androidBlockRegex);

      if (match) {
        // Insert the dimension strategy right after defaultConfig {
        const insertPoint = match.index + match[0].length;
        const beforeInsert = buildGradle.substring(0, insertPoint);
        const afterInsert = buildGradle.substring(insertPoint);

        const dimensionStrategy = `
        missingDimensionStrategy 'react-native-camera', 'general'`;

        config.modResults.contents = beforeInsert + dimensionStrategy +
          afterInsert;
      } else {
        // Fallback: add at the end of the file
        const fallbackConfig = `
android {
    defaultConfig {
        missingDimensionStrategy 'react-native-camera', 'general'
    }
}`;
        config.modResults.contents = buildGradle + fallbackConfig;
      }
    }

    return config;
  });

  return config;
};

module.exports = withReactNativeCamera;
