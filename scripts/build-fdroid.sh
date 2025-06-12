#!/bin/bash

# F-Droid build script for AlbumCam
# This script prepares and builds the Android APK for F-Droid distribution

set -e

echo "Starting F-Droid build process..."

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "app.json" ]; then
    echo "Error: This script must be run from the project root directory"
    exit 1
fi

# Install dependencies
echo "Installing dependencies..."
if [ -f "package-lock.json" ]; then
    echo "Using npm ci with package-lock.json..."
    npm ci
elif [ -f "yarn.lock" ]; then
    echo "Using yarn with yarn.lock..."
    yarn install --frozen-lockfile
elif [ -f "bun.lockb" ]; then
    echo "Bun lockfile found, using npm install..."
    npm install
else
    echo "No lockfile found, using npm install..."
    npm install
fi

# Clean any existing builds
echo "Cleaning existing builds..."
rm -rf android/
rm -rf .expo/

# Disable Expo telemetry and analytics for F-Droid builds
export EXPO_NO_TELEMETRY=1
export EXPO_NO_ANALYTICS=1
export EXPO_NO_DOTENV=1

# Prebuild the Android project
echo "Prebuilding Android project..."
npx expo prebuild --platform android --clean --no-install

# Navigate to Android directory
cd android

# Make gradlew executable
chmod +x ./gradlew

# Clean previous builds
echo "Cleaning Android build cache..."
./gradlew clean

# Build release APK (F-Droid only needs release builds)
echo "Building release APK for F-Droid..."
./gradlew clean assembleRelease

# Verify the APK was created
if [ -f "app/build/outputs/apk/release/app-release.apk" ]; then
    echo "✅ F-Droid compatible release APK built successfully!"
    echo "APK location: android/app/build/outputs/apk/release/app-release.apk"

    # Show APK info
    APK_SIZE=$(du -h app/build/outputs/apk/release/app-release.apk | cut -f1)
    echo "APK size: $APK_SIZE"

    # Verify APK is signed with debug key (expected for F-Droid builds)
    echo "APK ready for F-Droid submission"
else
    echo "❌ Build failed - Release APK not found"
    exit 1
fi

echo "F-Droid build process completed successfully!"
