# F-Droid Submission Guide for AlbumCam

This guide walks you through the complete process of submitting AlbumCam to F-Droid.

## Prerequisites Checklist

Before submitting to F-Droid, ensure all the following are complete:

- [x] App is fully open source (MIT License)
- [x] No proprietary dependencies or services
- [x] F-Droid metadata files created
- [x] Android build configuration ready
- [x] GitHub repository is public
- [x] App builds successfully with F-Droid compatible settings
- [x] All telemetry and analytics disabled

## Submission Process

### 1. Final Repository Setup

Ensure your repository meets F-Droid requirements:

```bash
# Make sure you're on the master branch
git checkout master

# Create a release tag
git tag -a v1.3.1 -m "Release v1.3.1 for F-Droid submission"
git push origin v1.3.1

# Verify GitHub Actions build passes
# Check: https://github.com/sigmaSd/AlbumCam/actions
```

### 2. Submit to F-Droid

There are two ways to submit to F-Droid:

#### Option A: Request for Packaging (RFP) - Recommended for new contributors

1. Go to https://gitlab.com/fdroid/rfp/-/issues
2. Click "New Issue"
3. Use this template:

```
**App Name:** AlbumCam
**Package ID:** com.sigmasd.albumcam
**Homepage:** https://github.com/sigmaSd/AlbumCam
**Source Code:** https://github.com/sigmaSd/AlbumCam
**Issue Tracker:** https://github.com/sigmaSd/AlbumCam/issues
**License:** MIT

**Description:**
A simple camera app that lets you instantly switch between different photo albums while taking pictures. Built with React Native and Expo, focusing on privacy and local storage.

**Key Features:**
- Take photos and save directly to different albums
- Quick album switching via swipe gestures and bottom menu
- Full camera controls (flash, improved zoom, front/back camera)
- Enhanced device compatibility (haptic-free for universal support)
- Privacy-focused - no data collection or network requests
- Persistent local storage

**F-Droid Readiness:**
- ✅ All dependencies are FOSS
- ✅ No proprietary services (Google Play Services, Firebase, etc.)
- ✅ No telemetry or analytics
- ✅ Builds successfully with provided build scripts
- ✅ F-Droid metadata included in repository
- ✅ GitHub Actions build automation with APK releases

**Additional Info:**
- Latest version: v1.3.1 with critical core functionality fixes
- The app is in the `master` branch
- F-Droid metadata is in `metadata/` directory
- Build tested with EAS and GitHub Actions
- All source code available under MIT license
- Automatic APK releases via GitHub Actions
```

#### Option B: Direct Merge Request (for experienced contributors)

1. Fork https://gitlab.com/fdroid/fdroiddata
2. Copy your metadata to the forked repository:
   ```bash
   cp -r metadata/com.sigmasd.albumcam.yml /path/to/fdroiddata/metadata/
   cp -r metadata/en-US/ /path/to/fdroiddata/metadata/com.sigmasd.albumcam/
   ```
3. Create a merge request

### 3. F-Droid Build Verification

F-Droid maintainers will test your app using this process:

```bash
# They will clone your repo
git clone https://github.com/sigmaSd/AlbumCam.git
cd AlbumCam
git checkout master

# Install dependencies
sudo apt-get update
sudo apt-get install -y nodejs npm openjdk-17-jdk-headless

# Build using your metadata configuration
cd android
export EXPO_NO_TELEMETRY=1
export EXPO_NO_ANALYTICS=1
npm ci
npx expo prebuild --platform android --clean --no-install
./gradlew assembleRelease
```

### 4. Common Issues and Solutions

#### Build Failures

**Issue: Node.js version mismatch**
```bash
# Solution: Ensure package.json specifies Node.js requirements
"engines": {
  "node": ">=18.0.0"
}
```

**Issue: Gradle build fails**
```bash
# Solution: Clean build before retry
./gradlew clean
./gradlew assembleRelease
```

**Issue: Expo dependencies not found**
```bash
# Solution: Ensure prebuild runs correctly
npx expo install --fix
npx expo prebuild --platform android --clean
```

#### Metadata Issues

**Issue: License not recognized**
- Ensure `LICENSE` file exists in repository root
- Update metadata to match exact license name

**Issue: Build configuration errors**
- Verify `metadata/com.sigmasd.albumcam.yml` syntax
- Test build process locally with F-Droid tools

### 5. Post-Submission

After submitting:

1. **Monitor the issue/MR** - Respond to maintainer feedback promptly
2. **Be patient** - F-Droid reviews can take weeks or months
3. **Address feedback** - Be prepared to make changes based on maintainer requests
4. **Update documentation** - Keep README and metadata current

### 6. Maintenance

Once accepted:

1. **Version updates** - Tag new releases for automatic updates
2. **Security fixes** - Respond quickly to security issues
3. **Dependency updates** - Keep dependencies current and FOSS-compatible
4. **F-Droid communication** - Stay responsive to F-Droid maintainer requests

## Helpful Resources

- [F-Droid Inclusion Policy](https://f-droid.org/docs/Inclusion_Policy/)
- [F-Droid Build Metadata Reference](https://f-droid.org/docs/Build_Metadata_Reference/)
- [F-Droid Submitting Apps](https://f-droid.org/docs/Submitting_to_F-Droid_Quick_Start_Guide/)
- [React Native F-Droid Examples](https://gitlab.com/fdroid/fdroiddata/-/tree/master/metadata?search=react)

## Contact

For questions about this submission:
- GitHub Issues: https://github.com/sigmaSd/AlbumCam/issues
- F-Droid Matrix Room: #fdroid:f-droid.org

## Repository URLs

- **Main Repository:** https://github.com/sigmaSd/AlbumCam
- **F-Droid Branch:** https://github.com/sigmaSd/AlbumCam/tree/master
- **F-Droid Metadata:** https://github.com/sigmaSd/AlbumCam/tree/master/metadata
