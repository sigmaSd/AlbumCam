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
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import {
  GestureHandlerRootView,
  PanGestureHandler as RNGHPanGestureHandler,
  type PanGestureHandlerStateChangeEvent,
  State,
} from "react-native-gesture-handler";

import { StorageService } from "../utils/storage";
import { HapticService } from "../utils/haptics";
import { CameraService } from "../utils/camera";
import { CAMERA_CONFIG, DEFAULT_LOCATION } from "../constants";
import type { Location } from "../types";

const { width, height } = Dimensions.get("window");

export const CameraScreen: React.FC = () => {
  // Camera state
  const [facing, setFacing] = useState<CameraType>("back");
  const [flash, setFlash] = useState<"off" | "on">("off");
  const [zoom, setZoom] = useState(CAMERA_CONFIG.DEFAULT_ZOOM);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [camera, setCamera] = useState<CameraView | null>(null);

  // Animation states
  const [shutterAnimation] = useState(new Animated.Value(1));
  const [controlsVisible, setControlsVisible] = useState(true);
  const [lastTap, setLastTap] = useState(0);
  const [photoCount, setPhotoCount] = useState(0);

  // Gesture refs
  const panRef = useRef<RNGHPanGestureHandler>(null);

  // Location buttons state
  const [locations, setLocations] = useState<Location[]>([DEFAULT_LOCATION]);
  const [selectedLocationId, setSelectedLocationId] = useState("1");
  const [isAddLocationModalVisible, setIsAddLocationModalVisible] = useState(
    false,
  );
  const [newLocationName, setNewLocationName] = useState("");
  const [isAlbumSelectionModalVisible, setIsAlbumSelectionModalVisible] =
    useState(false);
  const [availableAlbums, setAvailableAlbums] = useState<any[]>([]);
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

  // Save data whenever locations or selectedLocationId changes
  useEffect(() => {
    saveData();
  }, [locations, selectedLocationId, isHapticEnabled]);

  // Initialize haptic service
  useEffect(() => {
    HapticService.setEnabled(isHapticEnabled);
  }, [isHapticEnabled]);

  const loadSavedData = async () => {
    try {
      const data = await StorageService.loadAllData();
      setLocations(data.locations);
      setSelectedLocationId(data.selectedLocationId);
      setIsHapticEnabled(data.isHapticEnabled);
    } catch (error) {
      console.error("Error loading saved data:", error);
    }
  };

  const saveData = async () => {
    try {
      await StorageService.saveAllData(
        locations,
        selectedLocationId,
        isHapticEnabled,
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
        const count = await CameraService.getAlbumPhotoCount(
          selectedLocation.name,
        );
        setPhotoCount(count);
      }
    } catch (error) {
      console.error("Error updating photo count:", error);
    }
  };

  const switchToNextAlbum = () => {
    const currentIndex = locations.findIndex((l) =>
      l.id === selectedLocationId
    );
    const nextIndex = (currentIndex + 1) % locations.length;
    setSelectedLocationId(locations[nextIndex].id);
    HapticService.albumSwitch();
  };

  const switchToPreviousAlbum = () => {
    const currentIndex = locations.findIndex((l) =>
      l.id === selectedLocationId
    );
    const prevIndex = currentIndex === 0
      ? locations.length - 1
      : currentIndex - 1;
    setSelectedLocationId(locations[prevIndex].id);
    HapticService.albumSwitch();
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
      const albums = await CameraService.getAllAvailableAlbums();
      setAvailableAlbums(albums);
    } catch (error) {
      console.error("Error fetching albums:", error);
    }
  };

  // Handle missing permissions
  if (!cameraPermission) {
    return <View style={styles.container} />;
  }

  if (!cameraPermission.granted) {
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
    HapticService.tap();
  };

  const toggleFlash = () => {
    setFlash((current) => (current === "off" ? "on" : "off"));
    HapticService.tap();
  };

  const zoomIn = () => {
    setZoom((current) =>
      Math.min(current + CAMERA_CONFIG.ZOOM_STEP, CAMERA_CONFIG.MAX_ZOOM)
    );
    HapticService.tap();
  };

  const zoomOut = () => {
    setZoom((current) =>
      Math.max(current - CAMERA_CONFIG.ZOOM_STEP, CAMERA_CONFIG.MIN_ZOOM)
    );
    HapticService.tap();
  };

  const toggleControlsVisibility = () => {
    const now = Date.now();
    if (now - lastTap < 300) {
      setControlsVisible(!controlsVisible);
      HapticService.tap();
    }
    setLastTap(now);
  };

  const takePicture = async () => {
    if (!camera) return;

    try {
      HapticService.photoCapture();

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

      const photo = await camera.takePictureAsync();

      if (photo) {
        const selectedLocation = locations.find((l) =>
          l.id === selectedLocationId
        );
        if (selectedLocation) {
          await CameraService.savePhotoToAlbum(photo.uri, selectedLocation);
          await updatePhotoCount();
          HapticService.saveSuccess();
        }
      }
    } catch (error) {
      console.error("Error taking picture:", error);
      HapticService.saveError();
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
    HapticService.success();
  };

  const removeLocation = (locationId: string) => {
    if (locationId === "1") return; // Cannot remove default

    const updatedLocations = locations.filter((l) => l.id !== locationId);
    setLocations(updatedLocations);

    if (selectedLocationId === locationId) {
      setSelectedLocationId("1");
    }

    HapticService.albumDelete();
  };

  const addLocationFromAlbum = (album: any) => {
    const newLocation: Location = {
      id: Date.now().toString(),
      name: album.title,
      path: `DCIM/${album.title}`,
    };

    setLocations([...locations, newLocation]);
    setSelectedLocationId(newLocation.id);
    setIsAlbumSelectionModalVisible(false);
    HapticService.success();
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
              style={[
                styles.cameraContainer,
                {
                  transform: [{ scale: shutterAnimation }],
                },
              ]}
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
                        HapticService.buttonPress();
                        setSelectedLocationId(location.id);
                      }}
                      onLongPress={() => {
                        if (location.id !== "1") {
                          HapticService.albumDelete();
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
                    HapticService.buttonPress();
                    setIsAddLocationModalVisible(true);
                  }}
                  onLongPress={async () => {
                    HapticService.medium();
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
    lineHeight: 24,
    marginBottom: 32,
  },
  permissionButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
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
  cameraControlsContainer: {
    position: "absolute",
    top: 50,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  topControls: {
    flexDirection: "row",
    alignItems: "center",
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 5,
  },
  activeControl: {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  controlButtonText: {
    fontSize: 20,
    color: "#fff",
  },
  activeControlText: {
    color: "#FFD60A",
  },
  zoomIndicator: {
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginHorizontal: 10,
  },
  zoomText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  sideControls: {
    alignItems: "center",
  },
  zoomButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 5,
  },
  zoomButtonText: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "600",
  },
  disabledText: {
    color: "#666",
  },
  bottomContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  currentAlbumContainer: {
    alignItems: "center",
    marginBottom: 15,
  },
  currentAlbumLabel: {
    color: "#ccc",
    fontSize: 12,
    marginBottom: 5,
  },
  currentAlbumName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 5,
  },
  photoCountText: {
    color: "#ccc",
    fontSize: 12,
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
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    minWidth: 80,
  },
  selectedLocationButton: {
    backgroundColor: "rgba(0, 122, 255, 0.8)",
  },
  locationButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  selectedLocationButtonText: {
    fontWeight: "600",
  },
  addLocationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  addLocationButtonText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "300",
  },
  captureSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fff",
  },
  captureHint: {
    color: "#aaa",
    fontSize: 12,
    fontWeight: "400",
    textAlign: "center",
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
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalBlur: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  modalContent: {
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    padding: 30,
    borderRadius: 20,
    width: width * 0.85,
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#fff",
    textAlign: "center",
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 10,
    padding: 15,
    color: "#fff",
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  modalCancelButton: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginRight: 10,
  },
  modalAddButton: {
    backgroundColor: "#007AFF",
    marginLeft: 10,
  },
  modalCancelButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  modalAddButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  albumListModal: {
    maxHeight: 200,
    marginBottom: 20,
  },
  albumItemModal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 8,
    marginBottom: 8,
  },
  albumNameModal: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  albumCountModal: {
    color: "#ccc",
    fontSize: 14,
  },
});
