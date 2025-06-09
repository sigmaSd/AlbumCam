# F-Droid Build Instructions for AlbumCam

This document contains specific instructions for building AlbumCam for F-Droid distribution.

## Prerequisites

- Node.js 18 or higher
- npm
- OpenJDK 17
- Android SDK (API level 24-35)
- Git

## Building for F-Droid

### Automatic Build (Recommended)

Use the provided build script:

```bash
./build-fdroid.sh
```

This script will:
1. Install dependencies
2. Clean previous builds
3. Prebuild the Android project with F-Droid compatible settings
4. Build the release APK

### Manual Build Process

If you need to build manually, follow these steps:

```bash
# 1. Install dependencies
npm ci

# 2. Set F-Droid environment variables
export EXPO_NO_TELEMETRY=1
export EXPO_NO_ANALYTICS=1
export EXPO_NO_DOTENV=1

# 3. Clean and prebuild
rm -rf android/ .expo/
npx expo prebuild --platform android --clean --no-install

# 4. Build the APK
cd android
chmod +x ./gradlew
./gradlew clean
./gradlew assembleRelease
```

The resulting APK will be located at:
`android/app/build/outputs/apk/release/app-release.apk`

## F-Droid Compatibility

This app is designed to be fully compatible with F-Droid's requirements:

### ✅ FOSS Dependencies Only
- All dependencies are open source
- No proprietary Google services
- No analytics or telemetry in production builds

### ✅ Privacy Focused
- No network requests in normal operation
- All data stored locally
- No user tracking or analytics

### ✅ Reproducible Builds
- Deterministic build process
- Source code available on GitHub
- Build scripts included

## Build Environment Variables

For F-Droid builds, the following environment variables are set:

- `EXPO_NO_TELEMETRY=1` - Disables Expo telemetry
- `EXPO_NO_ANALYTICS=1` - Disables Expo analytics
- `EXPO_NO_DOTENV=1` - Prevents loading of .env files

## Permissions Used

The app requests the following Android permissions:

- `CAMERA` - Required for taking photos
- `READ_EXTERNAL_STORAGE` - Required for reading existing media
- `WRITE_EXTERNAL_STORAGE` - Required for saving photos
- `RECORD_AUDIO` - Required for video recording (if supported)

## Metadata Structure

The F-Droid metadata is located in:
- `metadata/com.sigmacool.albumcam.yml` - Main F-Droid configuration
- `metadata/en-US/` - Localized descriptions and changelogs

## GitHub Actions

Automated builds are available via GitHub Actions:
- `.github/workflows/android-build.yml` - Builds APKs for releases
- Triggered on tags and main branch pushes
- Artifacts are uploaded for testing

## EAS Build Profiles

The app includes EAS build profiles for development:
- `production` - Standard production build
- `f-droid` - F-Droid compatible build with telemetry disabled

To build with EAS for testing:
```bash
eas build --profile f-droid --platform android
```

## Troubleshooting

### Build Failures

1. **Node.js version**: Ensure you're using Node.js 18+
2. **Java version**: F-Droid requires OpenJDK 17
3. **Clean builds**: Always clean previous builds before F-Droid submission
4. **Dependencies**: Run `npm ci` instead of `npm install` for reproducible builds

### Testing the Build

Before submitting to F-Droid:

1. Test the APK on a clean Android device
2. Verify all camera functions work
3. Check that no network requests are made
4. Confirm photos save to correct albums

## Contributing

When contributing changes that affect the build process:

1. Test the F-Droid build script locally
2. Update this documentation if needed
3. Ensure GitHub Actions still pass
4. Update F-Droid metadata if app details change

## Support

For F-Droid specific build issues:
- Check the GitHub Actions logs
- Review the build script output
- Open an issue on the GitHub repository

For general app support:
- See the main README.md file
- Check existing GitHub issues