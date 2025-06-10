import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
// @ts-ignore: AsyncStorage types are not properly exported from the module
import AsyncStorageModule from "@react-native-async-storage/async-storage";

// hack just to make it type check, but it does already work at runtime
const AsyncStorage = AsyncStorageModule as unknown as {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

const STORAGE_KEYS = {
  LOCATIONS: "@camera_locations",
  SELECTED_LOCATION: "@selected_location",
  HAPTIC_ENABLED: "@haptic_enabled",
};

type Location = {
  id: string;
  name: string;
  path: string;
};

type SharedImage = {
  uri: string;
  name: string;
  type: string;
};

const ShareScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();

  // State
  const [locations, setLocations] = useState<Location[]>([
    { id: "1", name: "Default", path: "DCIM/CameraApp" },
  ]);
  const [selectedLocationId, setSelectedLocationId] = useState("1");
  const [sharedImages, setSharedImages] = useState<SharedImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isHapticEnabled, setIsHapticEnabled] = useState(true);
  const [mediaLibraryPermission, requestMediaLibraryPermission] = MediaLibrary
    .usePermissions();

  useEffect(() => {
    loadSavedData();
    processSharedContent();
  }, []);

  const loadSavedData = async () => {
    try {
      const savedLocations = await AsyncStorage.getItem(STORAGE_KEYS.LOCATIONS);
      const savedSelectedLocation = await AsyncStorage.getItem(
        STORAGE_KEYS.SELECTED_LOCATION,
      );
      const savedHapticEnabled = await AsyncStorage.getItem(
        STORAGE_KEYS.HAPTIC_ENABLED,
      );

      if (savedLocations) {
        setLocations(JSON.parse(savedLocations));
      }

      if (savedSelectedLocation) {
        setSelectedLocationId(savedSelectedLocation);
      }

      if (savedHapticEnabled !== null) {
        setIsHapticEnabled(JSON.parse(savedHapticEnabled));
      }
    } catch (error) {
      console.error("Error loading saved data:", error);
    }
  };

  const processSharedContent = async () => {
    try {
      setIsLoading(true);

      // Check if we have shared URIs in the route params
      const sharedUris = params.sharedUris as string[] | undefined;

      if (sharedUris && sharedUris.length > 0) {
        const processedImages: SharedImage[] = [];

        for (const uri of sharedUris) {
          try {
            // Get file info
            const fileInfo = await FileSystem.getInfoAsync(uri);
            if (fileInfo.exists) {
              const fileName = uri.split("/").pop() || "shared_image.jpg";
              processedImages.push({
                uri,
                name: fileName,
                type: "image/*",
              });
            }
          } catch (error) {
            console.error("Error processing shared image:", error);
          }
        }

        setSharedImages(processedImages);
      } else {
        // Handle URL scheme sharing
        const url = await Linking.getInitialURL();
        if (url && url.includes("share")) {
          // Parse the URL for image data
          console.log("Received share URL:", url);
          // For demo purposes, we'll show a placeholder
          setSharedImages([]);
        } else {
          setSharedImages([]);
        }
      }
    } catch (error) {
      console.error("Error processing shared content:", error);
      Alert.alert("Error", "Failed to process shared images");
    } finally {
      setIsLoading(false);
    }
  };

  const saveImagesToAlbum = async () => {
    if (!mediaLibraryPermission?.granted) {
      const permission = await requestMediaLibraryPermission();
      if (!permission?.granted) {
        Alert.alert(
          "Permission Required",
          "Media library access is required to save images",
        );
        return;
      }
    }

    if (sharedImages.length === 0) {
      Alert.alert("No Images", "No images to save");
      return;
    }

    try {
      setIsSaving(true);

      const selectedLocation = locations.find((l) =>
        l.id === selectedLocationId
      );
      if (!selectedLocation) {
        throw new Error("Selected location not found");
      }

      // Create or get the album
      let album: MediaLibrary.Album | null = null;

      if (selectedLocation.id === "1") {
        // Use default album (Camera Roll)
        album = await MediaLibrary.getAlbumAsync("Camera");
        if (!album) {
          // Create the first asset to use for album creation
          const firstAsset = await MediaLibrary.createAssetAsync(
            sharedImages[0].uri,
          );
          album = await MediaLibrary.createAlbumAsync(
            "Camera",
            firstAsset,
            false,
          );
        }
      } else {
        // Create or get custom album
        album = await MediaLibrary.getAlbumAsync(selectedLocation.name);
        if (!album) {
          // Create album with a placeholder asset first
          const asset = await MediaLibrary.createAssetAsync(
            sharedImages[0].uri,
          );
          album = await MediaLibrary.createAlbumAsync(
            selectedLocation.name,
            asset,
            false,
          );
        }
      }

      // Copy and save all images to the selected album
      const savedAssets = [];
      for (const image of sharedImages) {
        try {
          // Copy the shared image to a permanent location
          const fileName = `shared_${Date.now()}_${image.name}`;
          const destinationUri = `${FileSystem.documentDirectory}${fileName}`;

          await FileSystem.copyAsync({
            from: image.uri,
            to: destinationUri,
          });
          const finalUri = destinationUri;

          // Create asset from the copied file
          const asset = await MediaLibrary.createAssetAsync(finalUri);
          savedAssets.push(asset);

          if (album && selectedLocation.id !== "1") {
            await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
          }
        } catch (error) {
          console.error(`Error saving image ${image.name}:`, error);
        }
      }

      if (isHapticEnabled) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      Alert.alert(
        "Success",
        `${savedAssets.length} image${
          savedAssets.length > 1 ? "s" : ""
        } saved to ${selectedLocation.name}`,
        [
          {
            text: "OK",
            onPress: () => {
              // Close the share screen and return to home
              router.replace("/");
            },
          },
        ],
      );
    } catch (error) {
      console.error("Error saving images:", error);
      Alert.alert("Error", "Failed to save images to album");
    } finally {
      setIsSaving(false);
    }
  };

  const hapticFeedback = () => {
    if (isHapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Processing shared images...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <BlurView intensity={20} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              hapticFeedback();
              router.replace("/");
            }}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Save to Album</Text>

          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={saveImagesToAlbum}
            disabled={isSaving || sharedImages.length === 0}
          >
            {isSaving
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.saveButtonText}>Save</Text>}
          </TouchableOpacity>
        </View>
      </BlurView>

      <View style={styles.content}>
        {/* Shared Images Preview */}
        {sharedImages.length > 0 && (
          <View style={styles.imagesSection}>
            <Text style={styles.sectionTitle}>
              {sharedImages.length} Image{sharedImages.length > 1 ? "s" : ""}
              {" "}
              to Save
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.imagesScroll}
              contentContainerStyle={styles.imagesScrollContent}
            >
              {sharedImages.map((image, index) => (
                <View key={index} style={styles.imageContainer}>
                  <Image
                    source={{ uri: image.uri }}
                    style={styles.imagePreview}
                  />
                  <Text style={styles.imageName} numberOfLines={1}>
                    {image.name}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Album Selection */}
        <View style={styles.albumSection}>
          <Text style={styles.sectionTitle}>Select Album</Text>
          <ScrollView style={styles.albumList}>
            {locations.map((location) => (
              <TouchableOpacity
                key={location.id}
                style={[
                  styles.albumItem,
                  selectedLocationId === location.id &&
                  styles.albumItemSelected,
                ]}
                onPress={() => {
                  hapticFeedback();
                  setSelectedLocationId(location.id);
                }}
              >
                <View style={styles.albumItemContent}>
                  <Text style={styles.albumIcon}>
                    {location.id === "1" ? "📱" : "📁"}
                  </Text>
                  <View style={styles.albumItemText}>
                    <Text style={styles.albumName}>{location.name}</Text>
                    <Text style={styles.albumPath}>{location.path}</Text>
                  </View>
                  {selectedLocationId === location.id && (
                    <Text style={styles.albumSelectedIcon}>✓</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* No Images Message */}
        {sharedImages.length === 0 && (
          <View style={styles.noImagesContainer}>
            <Text style={styles.noImagesIcon}>📷</Text>
            <Text style={styles.noImagesTitle}>Share Images to AlbumCam</Text>
            <Text style={styles.noImagesText}>
              To use this feature:{"\n"}
              1. Open your Gallery or Photos app{"\n"}
              2. Select one or more images{"\n"}
              3. Tap Share and choose AlbumCam{"\n"}
              4. Select an album to save them to
            </Text>
            <TouchableOpacity
              style={styles.openCameraButton}
              onPress={() => {
                hapticFeedback();
                router.replace("/");
              }}
            >
              <Text style={styles.openCameraButtonText}>Open Camera</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#fff",
    fontSize: 16,
    marginTop: 10,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cancelButton: {
    padding: 5,
  },
  cancelButtonText: {
    color: "#fff",
    fontSize: 16,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 60,
    alignItems: "center",
  },
  saveButtonDisabled: {
    backgroundColor: "#555",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  imagesSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 15,
  },
  imagesScroll: {
    maxHeight: 120,
  },
  imagesScrollContent: {
    paddingRight: 20,
  },
  imageContainer: {
    marginRight: 15,
    alignItems: "center",
  },
  imagePreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#333",
  },
  imageName: {
    color: "#ccc",
    fontSize: 12,
    marginTop: 5,
    maxWidth: 80,
    textAlign: "center",
  },
  albumSection: {
    flex: 1,
  },
  albumList: {
    flex: 1,
  },
  albumItem: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    marginBottom: 10,
    overflow: "hidden",
  },
  albumItemSelected: {
    backgroundColor: "rgba(0, 122, 255, 0.3)",
    borderWidth: 2,
    borderColor: "#007AFF",
  },
  albumItemContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
  },
  albumIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  albumItemText: {
    flex: 1,
  },
  albumName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  albumPath: {
    color: "#ccc",
    fontSize: 12,
    marginTop: 2,
  },
  albumSelectedIcon: {
    color: "#007AFF",
    fontSize: 20,
    fontWeight: "bold",
  },
  noImagesContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  noImagesIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  noImagesTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 10,
    textAlign: "center",
  },
  noImagesText: {
    color: "#ccc",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 30,
  },
  openCameraButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  openCameraButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default ShareScreen;
