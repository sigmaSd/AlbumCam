# Album Camera

A simple camera app that lets you instantly switch between different photo albums while taking pictures.

## main feature
- 📸 take photos and save them directly to different albums with a single tap
- 🔄 quickly switch between albums via the bottom horizontal menu
- ➕ manage albums easily:
  - tap + to create new album
  - long press + to select from existing albums
- 🗑️ long press album name to remove unwanted albums (files are not deleted)
- 📱 camera controls:
  - switch between front/back cameras
  - toggle flash/torch
  - zoom controls
- 💾 persistent storage of albums and settings

## Download
Binaries are built with [eas](https://expo.dev/eas)

- [apk](https://expo.dev/artifacts/eas/qNxCK2aJnvr9AXNNNkjkJ4.apk)

## quick start
```bash
# install dependencies
npm install

# run the app
npx expo start
```

## how to use
1. grant camera and storage permissions
2. select or create an album location from the bottom menu:
   - tap + to create new album
   - long press + to select from existing albums
3. take pictures - they'll automatically save to the selected album
4. long press any custom album name to delete it
5. use camera controls to adjust flash, zoom, and switch cameras

## requirements
- expo
- expo-camera
- expo-media-library
- @react-native-async-storage/async-storage

## screenshots
<img src="https://github.com/user-attachments/assets/1b0d5d34-92e2-4092-b2cc-8be10d07ebe5" style="width: 20%"/>

---
built with expo and react native
