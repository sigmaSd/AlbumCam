import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { type CameraType, CameraView, useCameraPermissions } from "expo-camera";
import * as MediaLibrary from "expo-media-library";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorageModule from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import { useShareIntent } from "expo-share-intent";

import {
  GestureHandlerRootView,
  PanGestureHandler as RNGHPanGestureHandler,
  type PanGestureHandlerStateChangeEvent,
  State,
} from "react-native-gesture-handler";
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

type Locaton = {
  id: string;
  name: string;
  path: string;
};

const { width, height } = Dimensions.get("window");

const CameraApp = () => {
  const router = useRouter();
  const { hasShareIntent, shareIntent } = useShareIntent();

  // Camera state
  const [facing, setFacing] = useState<CameraType>("back");
  const [flash, setFlash] = useState<"off" | "on">("off");
  const [zoom, setZoom] = useState(0);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [mediaLibraryPermission, requestMediaLibraryPermission] = MediaLibrary
    .usePermissions();
  const [camera, setCamera] = useState<CameraView | null>(null);

  // Animation states
  const [shutterAnimation] = useState(new Animated.Value(1));
  const [controlsVisible, setControlsVisible] = useState(true);
  const [lastTap, setLastTap] = useState(0);
  const [photoCount, setPhotoCount] = useState(0);

  // Gesture refs
  const panRef = useRef<RNGHPanGestureHandler>(null);

  // Location buttons state
  const [locations, setLocations] = useState<Locaton[]>([
    { id: "1", name: "Default", path: "DCIM/CameraApp" },
  ]);
  const [selectedLocationId, setSelectedLocationId] = useState("1");
  const [isAddLocationModalVisible, setIsAddLocationModalVisible] = useState(
    false,
  );
  const [newLocationName, setNewLocationName] = useState("");
  const [isAlbumSelectionModalVisible, setIsAlbumSelectionModalVisible] =
    useState(false);
  const [availableAlbums, setAvailableAlbums] = useState<MediaLibrary.Album[]>(
    [],
  );
  const [isHapticEnabled, setIsHapticEnabled] = useState(true);

  // Load saved data when component mounts
  useEffect(() => {
    loadSavedData();
    updatePhotoCount();
  }, []);

  // Update photo count when album changes
  useEffect(() => {
    updatePhotoCount();
  }, [selectedLocationId]);

  // Handle share intent
  useEffect(() => {
    if (hasShareIntent && shareIntent?.files && shareIntent.files.length > 0) {
      // Navigate to share screen when share intent is detected
      router.push("/share");
    }
  }, [hasShareIntent, shareIntent, router]);

  // Note: Volume button handling would require a native module
  // This is a placeholder for future implementation

  // Save data whenever locations or selectedLocationId changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    saveData();
  }, [locations, selectedLocationId, isHapticEnabled]);

  const loadSavedData = async () => {
    try {
      const savedLocations = await AsyncStorage.getItem(
        STORAGE_KEYS.LOCATIONS,
      );
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

  const saveData = async () => {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.LOCATIONS,
        JSON.stringify(locations),
      );
      await AsyncStorage.setItem(
        STORAGE_KEYS.SELECTED_LOCATION,
        selectedLocationId,
      );
      await AsyncStorage.setItem(
        STORAGE_KEYS.HAPTIC_ENABLED,
        JSON.stringify(isHapticEnabled),
      );
    } catch (error) {
      console.error("Error saving data:", error);
    }
  };

  const updatePhotoCount = async () => {
    try {
      const selectedLocation = locations.find((l) =>
        l.id === selectedLocationId
      );
      if (selectedLocation) {
        const albums = await MediaLibrary.getAlbumsAsync();
        const album = albums.find((a) => a.title === selectedLocation.name);
        setPhotoCount(album ? album.assetCount : 0);
      }
    } catch (error) {
      console.error("Error updating photo count:", error);
      setPhotoCount(0);
    }
  };

  const switchToNextAlbum = () => {
    const currentIndex = locations.findIndex((l) =>
      l.id === selectedLocationId
    );
    const nextIndex = (currentIndex + 1) % locations.length;
    setSelectedLocationId(locations[nextIndex].id);
    if (isHapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const switchToPreviousAlbum = () => {
    const currentIndex = locations.findIndex((l) =>
      l.id === selectedLocationId
    );
    const prevIndex = currentIndex === 0
      ? locations.length - 1
      : currentIndex - 1;
    setSelectedLocationId(locations[prevIndex].id);
    if (isHapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const onSwipeGesture = (event: PanGestureHandlerStateChangeEvent) => {
    if (event.nativeEvent.state === State.END) {
      const { translationX, velocityX } = event.nativeEvent;

      // Check for swipe with either sufficient translation or velocity
      if (Math.abs(translationX) > 50 || Math.abs(velocityX) > 300) {
        if (translationX > 0 || velocityX > 0) {
          switchToPreviousAlbum();
        } else if (translationX < 0 || velocityX < 0) {
          switchToNextAlbum();
        }
      }
    }
  };

  const fetchAvailableAlbums = async () => {
    try {
      const albums = await MediaLibrary.getAlbumsAsync();
      setAvailableAlbums(albums);
    } catch (error) {
      console.error("Error fetching albums:", error);
    }
  };

  // Handle missing permissions
  if (!cameraPermission || !mediaLibraryPermission) {
    return <View style={styles.container} />;
  }

  if (!cameraPermission.granted || !mediaLibraryPermission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={styles.permissionContent}>
          <Text style={styles.permissionTitle}>📸 Camera Access Required</Text>
          <Text style={styles.permissionMessage}>
            AlbumCam needs camera and storage permissions to organize your
            photos into albums
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              await requestCameraPermission();
              await requestMediaLibraryPermission();
            }}
          >
            <Text style={styles.permissionButtonText}>Grant Permissions</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Toggle camera facing
  const toggleCameraFacing = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFacing((current) => current === "back" ? "front" : "back");
  };

  const zoomIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setZoom(Math.min(1, zoom + 0.1));
  };

  const zoomOut = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setZoom(Math.max(0, zoom - 0.1));
  };

  const toggleFlash = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFlash(flash === "on" ? "off" : "on");
  };

  const toggleControlsVisibility = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (lastTap && (now - lastTap) < DOUBLE_TAP_DELAY) {
      setControlsVisible(!controlsVisible);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setLastTap(now);
  };

  // Take photo functionality
  const takePicture = async () => {
    if (camera) {
      try {
        // Haptic feedback and shutter animation
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        // Animate shutter effect
        Animated.sequence([
          Animated.timing(shutterAnimation, {
            toValue: 0.7,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(shutterAnimation, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
        ]).start();

        const photo = await camera.takePictureAsync({
          quality: 0.9,
          exif: false,
        });

        // Find the selected location
        const selectedLocation = locations.find(
          (loc) => loc.id === selectedLocationId,
        );

        // Save to media library
        if (!photo) return;
        const asset = await MediaLibrary.createAssetAsync(photo.uri);

        if (!selectedLocation) return;
        // Create/add to album
        await MediaLibrary.createAlbumAsync(
          selectedLocation.name,
          asset,
          true,
        );

        // Success haptic and update count
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
        updatePhotoCount();
      } catch (error) {
        console.error("Error taking picture:", error);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Error", "Failed to take picture");
      }
    }
  };

  // Add new location button
  const addLocation = () => {
    if (newLocationName.trim() === "") {
      Alert.alert("Error", "Album name cannot be empty");
      return;
    }

    const newLocation = {
      id: String(Date.now()),
      name: newLocationName.trim(),
      path: `DCIM/CameraApp/${newLocationName.trim()}`,
    };

    const updatedLocations = [...locations, newLocation];
    setLocations(updatedLocations);
    setNewLocationName("");
    setIsAddLocationModalVisible(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // Remove location button
  const removeLocation = (id: string) => {
    if (id === "1") {
      Alert.alert("Error", "Cannot remove default location");
      return;
    }

    const updatedLocations = locations.filter((loc) => loc.id !== id);
    setLocations(updatedLocations);
    if (selectedLocationId === id) {
      setSelectedLocationId("1");
    }
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaView style={styles.container}>
        <StatusBar
          barStyle="light-content"
          backgroundColor="transparent"
          translucent
        />

        {/* Camera View */}
        <RNGHPanGestureHandler
          ref={panRef}
          onHandlerStateChange={onSwipeGesture}
          activeOffsetX={[-30, 30]}
          failOffsetY={[-50, 50]}
        >
          <View style={{ flex: 1 }}>
            <Animated.View
              style={[styles.cameraContainer, {
                transform: [{ scale: shutterAnimation }],
              }]}
            >
              <CameraView
                style={styles.camera}
                facing={facing}
                ref={(ref) => setCamera(ref)}
                enableTorch={flash === "on"}
                zoom={zoom}
                onTouchEnd={toggleControlsVisibility}
              >
                {controlsVisible && (
                  <BlurView
                    intensity={20}
                    style={styles.cameraControlsContainer}
                  >
                    <View style={styles.topControls}>
                      <TouchableOpacity
                        style={[
                          styles.controlButton,
                          flash === "on" && styles.activeControl,
                        ]}
                        onPress={toggleFlash}
                      >
                        <Text
                          style={[
                            styles.controlButtonText,
                            flash === "on" && styles.activeControlText,
                          ]}
                        >
                          {flash === "on" ? "⚡" : "⚡"}
                        </Text>
                      </TouchableOpacity>

                      <View style={styles.zoomIndicator}>
                        <Text style={styles.zoomText}>
                          {(zoom * 10 + 1).toFixed(1)}x
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={styles.controlButton}
                        onPress={toggleCameraFacing}
                      >
                        <Text style={styles.controlButtonText}>🔄</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.sideControls}>
                      <TouchableOpacity
                        style={styles.zoomButton}
                        onPress={zoomIn}
                        disabled={zoom >= 1}
                      >
                        <Text
                          style={[
                            styles.zoomButtonText,
                            zoom >= 1 && styles.disabledText,
                          ]}
                        >
                          +
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.zoomButton}
                        onPress={zoomOut}
                        disabled={zoom <= 0}
                      >
                        <Text
                          style={[
                            styles.zoomButtonText,
                            zoom <= 0 && styles.disabledText,
                          ]}
                        >
                          −
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </BlurView>
                )}
              </CameraView>
            </Animated.View>

            <BlurView intensity={50} style={styles.bottomContainer}>
              {/* Current Album Display */}
              <View style={styles.currentAlbumContainer}>
                <Text style={styles.currentAlbumLabel}>Current Album</Text>
                <Text style={styles.currentAlbumName}>
                  📁{" "}
                  {locations.find((l) => l.id === selectedLocationId)?.name ||
                    "Default"}
                </Text>
                <Text style={styles.photoCountText}>
                  {photoCount} photo{photoCount !== 1 ? "s" : ""}
                </Text>
              </View>

              {/* Location Buttons Container */}
              <View style={styles.locationButtonsContainer}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.locationScrollView}
                  contentContainerStyle={styles.locationButtonsScroll}
                >
                  {locations.map((location) => (
                    <TouchableOpacity
                      key={location.id}
                      style={[
                        styles.locationButton,
                        selectedLocationId === location.id &&
                        styles.selectedLocationButton,
                      ]}
                      onPress={() => {
                        if (isHapticEnabled) {
                          Haptics.impactAsync(
                            Haptics.ImpactFeedbackStyle.Light,
                          );
                        }
                        setSelectedLocationId(location.id);
                      }}
                      onLongPress={() => {
                        if (location.id !== "1") {
                          if (isHapticEnabled) {
                            Haptics.impactAsync(
                              Haptics.ImpactFeedbackStyle.Medium,
                            );
                          }
                          Alert.alert(
                            "Remove Album",
                            `Remove "${location.name}" album?`,
                            [
                              { text: "Cancel", style: "cancel" },
                              {
                                text: "Remove",
                                onPress: () => removeLocation(location.id),
                                style: "destructive",
                              },
                            ],
                          );
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.locationButtonText,
                          selectedLocationId === location.id &&
                          styles.selectedLocationButtonText,
                        ]}
                        numberOfLines={1}
                      >
                        {location.id === "1" ? "📱" : "📁"} {location.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Fixed Add Button */}
                <TouchableOpacity
                  style={styles.addLocationButton}
                  onPress={() => {
                    if (isHapticEnabled) {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                    setIsAddLocationModalVisible(true);
                  }}
                  onLongPress={async () => {
                    if (isHapticEnabled) {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    }
                    await fetchAvailableAlbums();
                    setIsAlbumSelectionModalVisible(true);
                  }}
                >
                  <Text style={styles.addLocationButtonText}>+</Text>
                </TouchableOpacity>
              </View>

              {/* Capture Button */}
              <View style={styles.captureSection}>
                <TouchableOpacity
                  style={styles.captureButton}
                  onPress={takePicture}
                  activeOpacity={0.8}
                >
                  <View style={styles.captureButtonInner} />
                </TouchableOpacity>
                <Text style={styles.captureHint}>
                  Tap to capture • Swipe left/right to switch albums • Double
                  tap screen to hide controls
                </Text>
              </View>

              {/* Settings */}
              <View style={styles.settingsContainer}>
                <TouchableOpacity
                  style={styles.settingsButton}
                  onPress={() => setIsHapticEnabled(!isHapticEnabled)}
                >
                  <Text style={styles.settingsButtonText}>
                    {isHapticEnabled ? "🔊" : "🔇"} Haptic
                  </Text>
                </TouchableOpacity>
              </View>
            </BlurView>
          </View>
        </RNGHPanGestureHandler>

        {/* Add Location Modal */}
        <Modal
          animationType="slide"
          transparent
          visible={isAddLocationModalVisible}
          onRequestClose={() => setIsAddLocationModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Add New Location</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Location Name"
                placeholderTextColor="#666"
                value={newLocationName}
                onChangeText={setNewLocationName}
              />
              <View style={styles.modalButtonContainer}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setIsAddLocationModalVisible(false)}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalAddButton}
                  onPress={addLocation}
                >
                  <Text style={styles.modalButtonText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Album Selection Modal */}
        <Modal
          animationType="slide"
          transparent
          visible={isAlbumSelectionModalVisible}
          onRequestClose={() => setIsAlbumSelectionModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <BlurView intensity={50} style={styles.modalContainer}>
              <Text style={styles.modalTitle}>📂 Import Existing Album</Text>
              <Text style={styles.modalSubtitle}>
                Choose from your existing photo albums
              </Text>
              <ScrollView
                style={styles.albumList}
                showsVerticalScrollIndicator={false}
              >
                {availableAlbums.map((album) => (
                  <TouchableOpacity
                    key={album.id}
                    style={styles.albumItem}
                    onPress={() => {
                      const newLocation = {
                        id: String(Date.now()),
                        name: album.title,
                        path: album.title,
                      };
                      setLocations([...locations, newLocation]);
                      setIsAlbumSelectionModalVisible(false);
                      Haptics.notificationAsync(
                        Haptics.NotificationFeedbackType.Success,
                      );
                    }}
                  >
                    <View style={styles.albumItemContent}>
                      <Text style={styles.albumItemText}>📷 {album.title}</Text>
                      <Text style={styles.albumItemCount}>
                        {album.assetCount}{" "}
                        photo{album.assetCount !== 1 ? "s" : ""}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setIsAlbumSelectionModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Close</Text>
              </TouchableOpacity>
            </BlurView>
          </View>
        </Modal>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  // Permission Screen
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  permissionContent: {
    alignItems: "center",
    paddingHorizontal: 40,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 16,
    textAlign: "center",
  },
  permissionMessage: {
    fontSize: 16,
    color: "#aaa",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 22,
  },
  permissionButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    elevation: 4,
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  permissionButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },

  // Camera
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
    width: "100%",
  },
  cameraControlsContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 20,
  },
  topControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: 40,
  },
  controlButton: {
    backgroundColor: "rgba(0,0,0,0.4)",
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  activeControl: {
    backgroundColor: "rgba(255,193,7,0.8)",
  },
  controlButtonText: {
    fontSize: 24,
    color: "#fff",
  },
  activeControlText: {
    color: "#000",
  },
  zoomIndicator: {
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  zoomText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  sideControls: {
    position: "absolute",
    right: 20,
    top: "50%",
    transform: [{ translateY: -50 }],
  },
  zoomButton: {
    backgroundColor: "rgba(0,0,0,0.4)",
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  zoomButtonText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#fff",
  },
  disabledText: {
    color: "#666",
  },

  // Bottom Section
  bottomContainer: {
    paddingBottom: 20,
    paddingTop: 16,
  },
  currentAlbumContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  currentAlbumLabel: {
    fontSize: 12,
    color: "#aaa",
    marginBottom: 4,
  },
  currentAlbumName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  photoCountText: {
    fontSize: 12,
    color: "#aaa",
    marginTop: 2,
  },

  // Location Buttons
  locationButtonsContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  locationScrollView: {
    flex: 1,
  },
  locationButtonsScroll: {
    paddingRight: 10,
  },
  locationButton: {
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    marginRight: 12,
    borderWidth: 2,
    borderColor: "transparent",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  selectedLocationButton: {
    backgroundColor: "#007AFF",
    borderColor: "#66B2FF",
    elevation: 4,
    shadowOpacity: 0.3,
  },
  locationButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  selectedLocationButtonText: {
    fontWeight: "700",
    color: "#fff",
  },
  addLocationButton: {
    backgroundColor: "#007AFF",
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
    elevation: 4,
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  addLocationButtonText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "300",
    lineHeight: 24,
  },

  // Capture Section
  captureSection: {
    alignItems: "center",
    paddingHorizontal: 16,
  },
  captureButton: {
    width: 80,
    height: 80,
    backgroundColor: "#fff",
    borderRadius: 40,
    padding: 6,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    marginBottom: 8,
  },
  captureButtonInner: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 34,
    borderWidth: 3,
    borderColor: "#ddd",
  },
  captureHint: {
    fontSize: 12,
    color: "#aaa",
    textAlign: "center",
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: width - 40,
    maxHeight: height * 0.8,
    borderRadius: 20,
    overflow: "hidden",
  },
  modalContent: {
    backgroundColor: "#1a1a1a",
    padding: 24,
    borderRadius: 20,
    width: "85%",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
    color: "#fff",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#aaa",
    textAlign: "center",
    marginBottom: 20,
  },
  modalInput: {
    borderWidth: 2,
    borderColor: "#333",
    padding: 16,
    marginBottom: 20,
    borderRadius: 12,
    color: "#fff",
    backgroundColor: "#2a2a2a",
    fontSize: 16,
  },
  modalButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  modalCancelButton: {
    backgroundColor: "#333",
    padding: 16,
    borderRadius: 12,
    flex: 1,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  modalAddButton: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 12,
    flex: 1,
    elevation: 2,
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  modalButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
  },
  cancelButton: {
    backgroundColor: "#333",
  },
  modalButtonText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "600",
    fontSize: 16,
  },
  cancelButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  // Album List
  albumList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  albumItem: {
    backgroundColor: "rgba(255,255,255,0.05)",
    marginBottom: 8,
    borderRadius: 12,
    padding: 16,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  albumItemContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  albumItemText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
  },
  albumItemCount: {
    color: "#aaa",
    fontSize: 12,
    fontWeight: "400",
  },
  settingsContainer: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
  },
  settingsButton: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backdropFilter: "blur(10px)",
  },
  settingsButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
});

export default CameraApp;
