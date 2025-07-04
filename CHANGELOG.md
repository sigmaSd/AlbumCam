# Changelog

All notable changes to AlbumCam will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.1]

### Fixed
- **Build System**: Fixed missing expo-linking dependency causing CI build failures
- **Deep Linking**: Resolved module resolution error for expo-linking in Android builds
- **Dependencies**: Added expo-linking ~7.1.0 to package dependencies for proper URL handling

### Technical
- Fixed "Unable to resolve module expo-linking" error in Metro bundler
- Ensured proper deep linking functionality for app URL handling
- Improved CI/CD pipeline stability with complete dependency declarations

## [1.4.0]

### Added
- **Photo Organization**: Photos now save with timestamped filenames for better organization
- **F-Droid Support**: Added metadata and screenshots for F-Droid store listing
- **File System Integration**: Added expo-file-system for enhanced photo management

### Improved
- **Dependencies**: Upgraded Expo SDK and related packages to latest versions
- **React Native**: Updated to React Native 0.79.5 for improved performance
- **Build System**: Enhanced CI/CD pipeline with streamlined build process
- **Photo Naming**: Implemented standardized timestamp-based photo naming convention

### Technical
- Upgraded Expo from ~53.0.0 to 53.0.16
- Updated expo-camera, expo-router, and other core dependencies
- Added expo-file-system for advanced file operations
- Improved photo file management with proper cleanup
- Enhanced build compatibility and CI optimizations

### Infrastructure
- Added F-Droid metadata and store assets
- Streamlined GitHub Actions workflow
- Removed unnecessary build dependencies
- Optimized build process for multiple distribution channels

## [1.3.1]

### Fixed
- **CRITICAL**: Fixed core photo saving functionality - photos now actually save to selected albums instead of only camera roll
- **User Experience**: Set copyAsset parameter to true in all MediaLibrary operations to prevent confirmation popups
- **Album Functionality**: Photos taken in different albums now properly save to those specific albums
- **Photo Counts**: Album photo counts now show actual album-specific counts instead of total photo count

### Technical
- Fixed savePhotoToAlbum function to properly use the location parameter
- Updated all MediaLibrary.addAssetsToAlbumAsync calls to use copy instead of move
- Improved error handling for album operations
- Enhanced album creation and management functionality

## [1.3.0]

### Improved
- **Device Compatibility**: Removed haptic feedback for better compatibility across all Android devices
- **Zoom Functionality**: Fixed zoom controls to work smoothly from the first step (1.5x)
- **Zoom Increments**: Increased zoom step size to 0.25 for more noticeable changes
- **Error Handling**: Enhanced media library permission handling to prevent errors
- **Camera Controls**: Improved responsiveness of all camera controls

### Fixed
- Zoom only working at high levels (previously required 2.2x+ to be noticeable)
- Media library permission errors on devices without proper permissions
- Potential crashes on devices without haptic support capabilities
- Camera permission handling edge cases

### Removed
- Haptic feedback functionality (for better device compatibility)
- Haptic settings toggle from UI
- All haptic-related dependencies and storage

### Technical
- Cleaner codebase with removed haptic service dependencies
- Better error logging and user feedback mechanisms
- Updated build process for improved F-Droid compatibility
- Enhanced GitHub Actions workflow with automatic APK releases

## [1.2.0]

### Added
- Swipe gesture support for quick album switching (left/right swipes)
- Long press support on the + button to select from existing albums
- Improved album management with better user feedback
- Enhanced camera zoom controls with better step increments
- Haptic feedback for enhanced user experience
- Settings panel with haptic toggle option

### Improved
- Modular code architecture with separate utility services
- Better error handling throughout the application
- Enhanced storage service with consolidated data management
- Updated to React Native with React 19 optimizations
- Improved TypeScript support and type safety

### Fixed
- Album switching responsiveness issues
- Storage persistence across app restarts
- Camera permission handling improvements
- Media library integration reliability

## [1.1.0]

### Added
- Album photo count display for each album
- Improved album selection interface
- Better visual feedback for selected albums
- Enhanced camera controls layout

### Improved
- Performance optimizations for album switching
- Better memory management for camera operations
- Improved UI/UX consistency across the app

### Fixed
- Album creation validation issues
- Photo saving reliability improvements
- UI rendering issues on some device sizes

## [1.0.0]

### Added
- Initial release of AlbumCam
- Core camera functionality with album organization
- Take photos and save directly to different albums
- Quick album switching via bottom horizontal menu
- Album management (create, select, remove)
- Full camera controls (front/back, flash, zoom)
- Persistent storage of albums and settings
- Privacy-focused design with local-only storage
- Clean, intuitive user interface
- Support for custom album names and organization
- Long press to remove albums (files remain safe)
- Automatic photo counting per album
- React Native + Expo implementation
- F-Droid compatible build configuration

### Technical Features
- Built with React Native and Expo SDK 53
- TypeScript support for type safety
- Modular architecture with utility services
- Local storage using AsyncStorage
- Camera integration with expo-camera
- Media library integration with expo-media-library
- Gesture handling with react-native-gesture-handler
- Blur effects with expo-blur
- Safe area handling with react-native-safe-area-context

### Privacy & Security
- No data collection or transmission
- All processing happens locally on device
- No analytics or telemetry
- No network requests in normal operation
- Photos saved to standard device directories
- Full user control over data and albums

---

## Release Notes

### Version 1.3.0 Focus
This release prioritizes **device compatibility** and **user experience consistency**. The main goal was to ensure AlbumCam works reliably across all Android devices, regardless of hardware capabilities.

### F-Droid Compatibility
All versions from 1.0.0 onwards are designed to be fully F-Droid compatible with:
- 100% FOSS dependencies
- No proprietary services
- No telemetry or analytics
- Reproducible builds
- Privacy-first design

### Future Roadmap
- [ ] Additional camera modes (video recording)
- [ ] Batch photo operations
- [ ] Album export/import functionality
- [ ] Custom album organization features
- [ ] Performance optimizations for large photo collections

---

For detailed technical information and build instructions, see:
- [F-Droid Submission Guide](docs/FDROID-SUBMISSION.md)
- [F-Droid Build Instructions](docs/README-FDROID.md)
- [Main README](README.md)
