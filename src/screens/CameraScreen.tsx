import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Modal,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { RNCamera } from "react-native-camera";
import * as MediaLibrary from "expo-media-library";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";

import { StorageService } from "../utils/storage.ts";
import { CameraService } from "../utils/camera.ts";
import { CAMERA_CONFIG, DEFAULT_LOCATION } from "../constants";
import type { Location } from "../types/index.ts";

const { width } = Dimensions.get("window");

export const CameraScreen: React.FC = () => {
  // Camera state
  const [facing, setFacing] = useState<"back" | "front">("back");
  const [flash, setFlash] = useState<"off" | "on">("off");
  const [zoom, setZoom] = useState(CAMERA_CONFIG.DEFAULT_ZOOM);
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(
    null,
  );
  const [mediaLibraryPermission, requestMediaLibraryPermission] = MediaLibrary
    .usePermissions();
  const cameraRef = useRef<RNCamera | null>(null);

  // Animation states
  const [shutterAnimation] = useState(new Animated.Value(1));
  const [controlsVisible, setControlsVisible] = useState(true);
  const [lastTap, setLastTap] = useState(0);
  const [photoCount, setPhotoCount] = useState(0);

  // Location buttons state
  const [locations, setLocations] = useState<Location[]>([DEFAULT_LOCATION]);
  const [selectedLocationId, setSelectedLocationId] = useState("1");
  const [isAddLocationModalVisible, setIsAddLocationModalVisible] = useState(
    false,
  );
  const [newLocationName, setNewLocationName] = useState("");
  const [isAlbumSelectionModalVisible, setIsAlbumSelectionModalVisible] =
    useState(false);
  // deno-lint-ignore no-explicit-any
  const [availableAlbums, setAvailableAlbums] = useState<any[]>([]);

  // Load saved data when component mounts
  useEffect(() => {
    loadSavedData();
    updatePhotoCount();
    checkCameraPermission();
  }, []);

  // Update photo count when album changes
  useEffect(() => {
    updatePhotoCount();
  }, [selectedLocationId]);

  // Save data whenever locations or selectedLocationId changes
  useEffect(() => {
    saveData();
  }, [locations, selectedLocationId]);

  const checkCameraPermission = async () => {
    if (Platform.OS === "android") {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: "Camera Permission",
            message: "AlbumCam needs access to your camera to take photos.",
            buttonNeutral: "Ask Me Later",
            buttonNegative: "Cancel",
            buttonPositive: "OK",
          },
        );
        setCameraPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
      } catch (err) {
        console.warn(err);
        setCameraPermission(false);
      }
    } else {
      // iOS permissions are handled by react-native-camera automatically
      setCameraPermission(true);
    }
  };

  const requestCameraPermission = async () => {
    await checkCameraPermission();
  };

  const loadSavedData = async () => {
    try {
      const data = await StorageService.loadAllData();
      setLocations(data.locations);
      setSelectedLocationId(data.selectedLocationId);
    } catch (error) {
      console.error("Error loading saved data:", error);
    }
  };

  const saveData = async () => {
    try {
      await StorageService.saveAllData(
        locations,
        selectedLocationId,
      );
    } catch (error) {
      console.error("Error saving data:", error);
    }
  };

  const updatePhotoCount = async () => {
    try {
      // Only try to get photo count if we have media library permissions
      if (!mediaLibraryPermission?.granted) {
        setPhotoCount(0);
        return;
      }

      const selectedLocation = locations.find((l) =>
        l.id === selectedLocationId
      );
      if (selectedLocation) {
        const count = await CameraService.getAlbumPhotoCount(
          selectedLocation.name,
        );
        setPhotoCount(count);
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
  };

  const switchToPreviousAlbum = () => {
    const currentIndex = locations.findIndex((l) =>
      l.id === selectedLocationId
    );
    const prevIndex = currentIndex === 0
      ? locations.length - 1
      : currentIndex - 1;
    setSelectedLocationId(locations[prevIndex].id);
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-30, 30])
    .failOffsetY([-50, 50])
    .onEnd((event) => {
      "worklet";
      const { translationX, velocityX } = event;

      // Check for swipe with either sufficient translation or velocity
      if (Math.abs(translationX) > 50 || Math.abs(velocityX) > 300) {
        if (translationX > 0 || velocityX > 0) {
          runOnJS(switchToPreviousAlbum)();
        } else if (translationX < 0 || velocityX < 0) {
          runOnJS(switchToNextAlbum)();
        }
      }
    });

  const fetchAvailableAlbums = async () => {
    try {
      // Request media library permission if not granted
      if (!mediaLibraryPermission?.granted) {
        await requestMediaLibraryPermission();
      }

      const albums = await CameraService.getAllAvailableAlbums();
      setAvailableAlbums(albums);
    } catch (error) {
      console.error("Error fetching albums:", error);
      setAvailableAlbums([]);
    }
  };

  // Handle missing permissions
  if (cameraPermission === null) {
    return <View style={styles.container} />;
  }

  if (!cameraPermission) {
    return (
      <View style={styles.permissionContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={styles.permissionContent}>
          <Text style={styles.permissionTitle}>📸 Camera Access Required</Text>
          <Text style={styles.permissionMessage}>
            AlbumCam needs camera access to take photos and organize them into
            albums.
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestCameraPermission}
          >
            <Text style={styles.permissionButtonText}>Grant Camera Access</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const toggleCameraFacing = () => {
    setFacing((current) => (current === "back" ? "front" : "back"));
  };

  const toggleFlash = () => {
    setFlash((current) => (current === "off" ? "on" : "off"));
  };

  const zoomIn = () => {
    // deno-lint-ignore no-explicit-any
    setZoom((current: any) =>
      Math.min(current + CAMERA_CONFIG.ZOOM_STEP, CAMERA_CONFIG.MAX_ZOOM)
    );
  };

  const zoomOut = () => {
    setZoom((current: number) =>
      Math.max(current - CAMERA_CONFIG.ZOOM_STEP, CAMERA_CONFIG.MIN_ZOOM)
    );
  };

  const toggleControlsVisibility = () => {
    const now = Date.now();
    if (now - lastTap < 300) {
      setControlsVisible(!controlsVisible);
    }
    setLastTap(now);
  };

  const takePicture = async () => {
    if (!cameraRef.current) return;

    try {
      // Shutter animation
      Animated.sequence([
        Animated.timing(shutterAnimation, {
          toValue: 0.8,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(shutterAnimation, {
          toValue: 1,
          duration: 50,
          useNativeDriver: true,
        }),
      ]).start();

      const options = {
        quality: 0.8,
        base64: false,
        skipProcessing: false,
      };

      const photo = await cameraRef.current.takePictureAsync(options);

      if (photo) {
        const selectedLocation = locations.find((l) =>
          l.id === selectedLocationId
        );
        if (selectedLocation) {
          await CameraService.savePhotoToAlbum(photo.uri, selectedLocation);
          await updatePhotoCount();
        }
      }
    } catch (error) {
      console.error("Error taking picture:", error);
      Alert.alert("Error", "Failed to take picture. Please try again.");
    }
  };

  const addLocation = async () => {
    const trimmedName = newLocationName.trim();
    const validation = CameraService.validateAlbumName(trimmedName);

    if (!validation.isValid) {
      Alert.alert("Invalid Name", validation.error);
      return;
    }

    const isTaken = await CameraService.isAlbumNameTaken(
      trimmedName,
      locations,
    );
    if (isTaken) {
      Alert.alert("Album Exists", "An album with this name already exists.");
      return;
    }

    const newLocation: Location = {
      id: Date.now().toString(),
      name: trimmedName,
      path: `DCIM/${trimmedName}`,
    };

    setLocations([...locations, newLocation]);
    setSelectedLocationId(newLocation.id);
    setNewLocationName("");
    setIsAddLocationModalVisible(false);
  };

  const removeLocation = (locationId: string) => {
    if (locationId === "1") return; // Cannot remove default

    const updatedLocations = locations.filter((l) => l.id !== locationId);
    setLocations(updatedLocations);

    if (selectedLocationId === locationId) {
      setSelectedLocationId("1");
    }
  };

  // deno-lint-ignore no-explicit-any
  const addLocationFromAlbum = (album: any) => {
    const newLocation: Location = {
      id: Date.now().toString(),
      name: album.title,
      path: `DCIM/${album.title}`,
    };

    setLocations([...locations, newLocation]);
    setSelectedLocationId(newLocation.id);
    setIsAlbumSelectionModalVisible(false);
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
        <GestureDetector gesture={panGesture}>
          <View style={{ flex: 1 }}>
            <Animated.View
              style={[
                styles.cameraContainer,
                {
                  transform: [{ scale: shutterAnimation }],
                },
              ]}
            >
              <RNCamera
                ref={cameraRef}
                style={styles.camera}
                type={facing === "back"
                  ? RNCamera.Constants.Type.back
                  : RNCamera.Constants.Type.front}
                flashMode={flash === "on"
                  ? RNCamera.Constants.FlashMode.on
                  : RNCamera.Constants.FlashMode.off}
                zoom={zoom}
                captureAudio={false}
                onTouchEnd={toggleControlsVisibility}
              />

              {controlsVisible && (
                <>
                  {/* Top Controls Bar */}
                  <View style={styles.topControlsBar}>
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
                        {(zoom * 2 + 1).toFixed(1)}x
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.controlButton}
                      onPress={toggleCameraFacing}
                    >
                      <Text style={styles.controlButtonText}>🔄</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Side Zoom Controls */}
                  <View style={styles.sideControls}>
                    <TouchableOpacity
                      style={styles.zoomButton}
                      onPress={zoomIn}
                      disabled={zoom >= CAMERA_CONFIG.MAX_ZOOM}
                    >
                      <Text
                        style={[
                          styles.zoomButtonText,
                          zoom >= CAMERA_CONFIG.MAX_ZOOM &&
                          styles.disabledText,
                        ]}
                      >
                        +
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.zoomButton}
                      onPress={zoomOut}
                      disabled={zoom <= CAMERA_CONFIG.MIN_ZOOM}
                    >
                      <Text
                        style={[
                          styles.zoomButtonText,
                          zoom <= CAMERA_CONFIG.MIN_ZOOM &&
                          styles.disabledText,
                        ]}
                      >
                        −
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
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
                        setSelectedLocationId(location.id);
                      }}
                      onLongPress={() => {
                        if (location.id !== "1") {
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
                    setIsAddLocationModalVisible(true);
                  }}
                  onLongPress={async () => {
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
                  Tap to capture • Photos saved to camera roll • Swipe
                  left/right to switch albums • Double tap to hide controls
                </Text>
              </View>
            </BlurView>
          </View>
        </GestureDetector>

        {/* Add Location Modal */}
        <Modal
          animationType="slide"
          transparent
          visible={isAddLocationModalVisible}
          onRequestClose={() => setIsAddLocationModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <BlurView intensity={80} style={styles.modalBlur}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Add New Album</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Album name"
                  placeholderTextColor="#666"
                  value={newLocationName}
                  onChangeText={setNewLocationName}
                  autoFocus
                />
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalCancelButton]}
                    onPress={() => {
                      setIsAddLocationModalVisible(false);
                      setNewLocationName("");
                    }}
                  >
                    <Text style={styles.modalCancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalAddButton]}
                    onPress={addLocation}
                  >
                    <Text style={styles.modalAddButtonText}>Add Album</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </BlurView>
          </View>
        </Modal>

        {/* Album Selection Modal */}
        <Modal
          animationType="slide"
          transparent
          visible={isAlbumSelectionModalVisible}
          onRequestClose={() => setIsAlbumSelectionModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <BlurView intensity={80} style={styles.modalBlur}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Select Existing Album</Text>
                <ScrollView style={styles.albumListModal}>
                  {availableAlbums.map((album) => (
                    <TouchableOpacity
                      key={album.id}
                      style={styles.albumItemModal}
                      onPress={() => addLocationFromAlbum(album)}
                    >
                      <Text style={styles.albumNameModal}>{album.title}</Text>
                      <Text style={styles.albumCountModal}>
                        {album.assetCount} photos
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalCancelButton]}
                  onPress={() => setIsAlbumSelectionModalVisible(false)}
                >
                  <Text style={styles.modalCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </BlurView>
          </View>
        </Modal>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
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
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 16,
    textAlign: "center",
  },
  permissionMessage: {
    fontSize: 16,
    color: "#ccc",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  topControlsBar: {
    position: "absolute",
    top: 60,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    zIndex: 1,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  activeControl: {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  controlButtonText: {
    fontSize: 20,
    color: "#fff",
  },
  activeControlText: {
    color: "#FFD700",
  },
  zoomIndicator: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
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
    zIndex: 1,
  },
  zoomButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 8,
  },
  zoomButtonText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  disabledText: {
    color: "#666",
  },
  bottomContainer: {
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  currentAlbumContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  currentAlbumLabel: {
    fontSize: 14,
    color: "#ccc",
    marginBottom: 4,
  },
  currentAlbumName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  photoCountText: {
    fontSize: 14,
    color: "#999",
  },
  locationButtonsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  locationScrollView: {
    flex: 1,
  },
  locationButtonsScroll: {
    paddingRight: 10,
  },
  locationButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 20,
    minWidth: 80,
  },
  selectedLocationButton: {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  locationButtonText: {
    color: "#fff",
    fontSize: 14,
    textAlign: "center",
  },
  selectedLocationButtonText: {
    fontWeight: "bold",
  },
  addLocationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  addLocationButtonText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  captureSection: {
    alignItems: "center",
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fff",
  },
  captureHint: {
    fontSize: 12,
    color: "#ccc",
    textAlign: "center",
    lineHeight: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalBlur: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 20,
    padding: 24,
    width: width * 0.8,
    maxWidth: 320,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginBottom: 20,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: "#fff",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  modalCancelButton: {
    backgroundColor: "#f0f0f0",
  },
  modalAddButton: {
    backgroundColor: "#007AFF",
  },
  modalCancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  modalAddButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  albumListModal: {
    maxHeight: 200,
    marginBottom: 20,
  },
  albumItemModal: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  albumNameModal: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  albumCountModal: {
    fontSize: 14,
    color: "#666",
  },
});
