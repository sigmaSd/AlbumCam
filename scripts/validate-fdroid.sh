#!/bin/bash

# F-Droid Validation Script for AlbumCam
# This script validates that the project meets F-Droid requirements

set -e

echo "🔍 F-Droid Validation Script for AlbumCam"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Validation results
PASSED=0
FAILED=0
WARNINGS=0

# Function to print status
print_status() {
    if [ "$1" = "PASS" ]; then
        echo -e "${GREEN}✅ PASS${NC}: $2"
        ((PASSED++))
    elif [ "$1" = "FAIL" ]; then
        echo -e "${RED}❌ FAIL${NC}: $2"
        ((FAILED++))
    elif [ "$1" = "WARN" ]; then
        echo -e "${YELLOW}⚠️  WARN${NC}: $2"
        ((WARNINGS++))
    fi
}

echo ""
echo "1. Repository Structure Validation"
echo "=================================="

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "app.json" ]; then
    print_status "FAIL" "Must be run from project root directory"
    exit 1
fi

# Check for required files
if [ -f "LICENSE" ]; then
    print_status "PASS" "LICENSE file exists"
else
    print_status "FAIL" "LICENSE file missing"
fi

if [ -f "README.md" ]; then
    print_status "PASS" "README.md exists"
else
    print_status "FAIL" "README.md missing"
fi

if [ -f "metadata/com.sigmacool.albumcam.yml" ]; then
    print_status "PASS" "F-Droid metadata file exists"
else
    print_status "FAIL" "F-Droid metadata file missing"
fi

if [ -d "metadata/en-US" ]; then
    print_status "PASS" "F-Droid localized metadata directory exists"
else
    print_status "FAIL" "F-Droid localized metadata directory missing"
fi

if [ -f "build-fdroid.sh" ]; then
    print_status "PASS" "F-Droid build script exists"
    if [ -x "build-fdroid.sh" ]; then
        print_status "PASS" "F-Droid build script is executable"
    else
        print_status "WARN" "F-Droid build script is not executable"
    fi
else
    print_status "FAIL" "F-Droid build script missing"
fi

echo ""
echo "2. Package.json Analysis"
echo "======================="

# Check for problematic dependencies
PROPRIETARY_DEPS=(
    "react-native-google"
    "react-native-firebase"
    "@react-native-firebase"
    "react-native-fabric"
    "react-native-crashlytics"
    "react-native-admob"
    "react-native-facebook"
    "@react-native-community/google"
    "react-native-maps" # Uses Google Maps by default
)

echo "Checking for proprietary dependencies..."
for dep in "${PROPRIETARY_DEPS[@]}"; do
    if grep -q "$dep" package.json; then
        print_status "FAIL" "Proprietary dependency found: $dep"
    fi
done

# Check if all dependencies look FOSS
if ! grep -qE "(react-native-google|react-native-firebase|@react-native-firebase|react-native-fabric|react-native-crashlytics|react-native-admob|react-native-facebook)" package.json; then
    print_status "PASS" "No obvious proprietary dependencies found"
fi

# Check for analytics/telemetry
ANALYTICS_DEPS=(
    "react-native-analytics"
    "mixpanel"
    "amplitude"
    "segment"
    "bugsnag"
    "sentry"
)

echo "Checking for analytics/telemetry dependencies..."
ANALYTICS_FOUND=false
for dep in "${ANALYTICS_DEPS[@]}"; do
    if grep -q "$dep" package.json; then
        print_status "WARN" "Analytics/telemetry dependency found: $dep (ensure it's disabled in F-Droid builds)"
        ANALYTICS_FOUND=true
    fi
done

if [ "$ANALYTICS_FOUND" = false ]; then
    print_status "PASS" "No analytics/telemetry dependencies found"
fi

echo ""
echo "3. Android Configuration"
echo "======================"

if [ -d "android" ]; then
    print_status "PASS" "Android directory exists"

    if [ -f "android/app/src/main/AndroidManifest.xml" ]; then
        print_status "PASS" "AndroidManifest.xml exists"

        # Check for problematic permissions
        if grep -q "android.permission.INTERNET" android/app/src/main/AndroidManifest.xml; then
            print_status "WARN" "INTERNET permission found (acceptable for React Native, but ensure no network requests in production)"
        fi

        # Check application ID
        if grep -q "com.sigmacool.albumcam" android/app/src/main/AndroidManifest.xml; then
            print_status "PASS" "Correct application ID found in manifest"
        else
            print_status "WARN" "Application ID may not match expected value"
        fi
    else
        print_status "FAIL" "AndroidManifest.xml missing"
    fi

    if [ -f "android/app/build.gradle" ]; then
        print_status "PASS" "Android build.gradle exists"
    else
        print_status "FAIL" "Android build.gradle missing"
    fi
else
    print_status "FAIL" "Android directory missing (run 'npx expo prebuild --platform android')"
fi

echo ""
echo "4. F-Droid Metadata Validation"
echo "============================="

if [ -f "metadata/com.sigmacool.albumcam.yml" ]; then
    # Check for required fields
    if grep -q "Categories:" metadata/com.sigmacool.albumcam.yml; then
        print_status "PASS" "Categories field present"
    else
        print_status "FAIL" "Categories field missing"
    fi

    if grep -q "License:" metadata/com.sigmacool.albumcam.yml; then
        print_status "PASS" "License field present"
    else
        print_status "FAIL" "License field missing"
    fi

    if grep -q "SourceCode:" metadata/com.sigmacool.albumcam.yml; then
        print_status "PASS" "SourceCode field present"
    else
        print_status "FAIL" "SourceCode field missing"
    fi

    if grep -q "Builds:" metadata/com.sigmacool.albumcam.yml; then
        print_status "PASS" "Builds section present"
    else
        print_status "FAIL" "Builds section missing"
    fi
fi

echo ""
echo "5. Build System Validation"
echo "========================="

# Check if Node.js is available
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_status "PASS" "Node.js is available: $NODE_VERSION"

    # Check Node.js version (should be 18+)
    NODE_MAJOR=$(node --version | cut -d'.' -f1 | sed 's/v//')
    if [ "$NODE_MAJOR" -ge 18 ]; then
        print_status "PASS" "Node.js version is compatible (>=18)"
    else
        print_status "WARN" "Node.js version may be too old for optimal compatibility"
    fi
else
    print_status "WARN" "Node.js not found (required for building)"
fi

# Check if npm is available
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    print_status "PASS" "npm is available: $NPM_VERSION"
else
    print_status "WARN" "npm not found (required for building)"
fi

# Check if Expo CLI can be found
if npm list -g @expo/cli &> /dev/null || command -v expo &> /dev/null; then
    print_status "PASS" "Expo CLI is available"
else
    print_status "WARN" "Expo CLI not found globally (will be installed during build)"
fi

echo ""
echo "6. Environment Variables Check"
echo "============================"

# Check if F-Droid environment variables would be set correctly
if [ -f "build-fdroid.sh" ]; then
    if grep -q "EXPO_NO_TELEMETRY=1" build-fdroid.sh; then
        print_status "PASS" "EXPO_NO_TELEMETRY disabled in build script"
    else
        print_status "WARN" "EXPO_NO_TELEMETRY not explicitly disabled"
    fi

    if grep -q "EXPO_NO_ANALYTICS=1" build-fdroid.sh; then
        print_status "PASS" "EXPO_NO_ANALYTICS disabled in build script"
    else
        print_status "WARN" "EXPO_NO_ANALYTICS not explicitly disabled"
    fi
fi

echo ""
echo "7. GitHub Actions Integration"
echo "============================"

if [ -f ".github/workflows/android-build.yml" ]; then
    print_status "PASS" "GitHub Actions workflow exists"

    if grep -q "fdroid-publish" .github/workflows/android-build.yml; then
        print_status "PASS" "Workflow includes fdroid-publish branch"
    else
        print_status "WARN" "Workflow may not include fdroid-publish branch"
    fi
else
    print_status "WARN" "GitHub Actions workflow missing (optional but recommended)"
fi

echo ""
echo "============================================"
echo "🏁 F-Droid Validation Summary"
echo "============================================"
echo -e "${GREEN}✅ Passed: $PASSED${NC}"
echo -e "${YELLOW}⚠️  Warnings: $WARNINGS${NC}"
echo -e "${RED}❌ Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 Congratulations! Your app appears ready for F-Droid submission.${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}📝 Please review the warnings above before submitting.${NC}"
    fi
    echo ""
    echo "Next steps:"
    echo "1. Test the release build: ./build-fdroid.sh"
    echo "2. Create a release tag: git tag -a v1.3.0 -m 'Release v1.3.0'"
    echo "3. Push to GitHub: git push origin fdroid-publish --tags"
    echo "4. Submit to F-Droid using FDROID-SUBMISSION.md guide"
else
    echo -e "${RED}🔧 Please fix the failed checks before submitting to F-Droid.${NC}"
    echo ""
    echo "Common fixes:"
    echo "- Add missing files (LICENSE, README.md, metadata files)"
    echo "- Remove proprietary dependencies"
    echo "- Run 'npx expo prebuild --platform android' to generate Android files"
    echo "- Review F-Droid metadata configuration"
    echo "- Ensure release build works: cd android && ./gradlew assembleRelease"
fi

echo ""
echo "For detailed submission instructions, see: FDROID-SUBMISSION.md"

exit $FAILED
