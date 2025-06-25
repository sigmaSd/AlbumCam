import React, { useEffect, useState } from "react";
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
import { CameraView } from "../components/CameraView.tsx";
import CameraModule from "../native/camera/CameraModule.ts";

const { width } = Dimensions.get("window");

export const CameraScreen: React.FC = () => {
  // Camera state
  const [facing, setFacing] = useState<"front" | "back">("back");
  const [flash, setFlash] = useState<"off" | "on" | "auto">("off");
  const [zoom, _setZoom] = useState(CAMERA_CONFIG.DEFAULT_ZOOM);
  const [cameraPermission, setCameraPermission] = useState<{
    granted: boolean;
    canAsk: boolean;
  }>({ granted: false, canAsk: true });

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
  const [_isAlbumSelectionModalVisible, _setIsAlbumSelectionModalVisible] =
    useState(false);

  // Load saved data when component mounts
  useEffect(() => {
    loadSavedData();
    checkPermissions();
    updatePhotoCount();
  }, []);

  // Update photo count when album changes
  useEffect(() => {
    updatePhotoCount();
  }, [selectedLocationId]);

  // Save data whenever locations or selectedLocationId changes
  useEffect(() => {
    saveData();
  }, [locations, selectedLocationId]);

  const checkPermissions = async () => {
    try {
      const permission = await CameraModule.checkCameraPermission();
      setCameraPermission(permission);
    } catch (error) {
      console.error("Error checking camera permission:", error);
    }
  };

  const requestPermissions = async () => {
    try {
      const permission = await CameraModule.requestCameraPermission();
      setCameraPermission(permission);
      return permission.granted;
    } catch (error) {
      console.error("Error requesting camera permission:", error);
      return false;
    }
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
      if (!cameraPermission.granted) {
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
          // Swipe right - previous album
          runOnJS(switchToPreviousAlbum)();
        } else {
          // Swipe left - next album
          runOnJS(switchToNextAlbum)();
        }
      }
    });

  const toggleFlash = () => {
    setFlash((prev) => {
      switch (prev) {
        case "off":
          return "on";
        case "on":
          return "auto";
        case "auto":
          return "off";
        default:
          return "off";
      }
    });
  };

  const toggleCamera = () => {
    setFacing((prev) => (prev === "back" ? "front" : "back"));
  };

  const toggleControlsVisibility = () => {
    const now = Date.now();
    if (now - lastTap < 300) {
      setControlsVisible(!controlsVisible);
    }
    setLastTap(now);
  };

  const takePicture = async () => {
    try {
      if (!cameraPermission.granted) {
        const granted = await requestPermissions();
        if (!granted) {
          Alert.alert(
            "Permission Required",
            "Camera permission is required to take photos.",
          );
          return;
        }
      }

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

      const photo = await CameraService.takePicture({
        facing,
        flash: flash === "auto" ? "auto" : flash,
        quality: 0.8,
      });

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

    const isTaken = CameraService.isAlbumNameTaken(
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
    };

    setLocations([...locations, newLocation]);
    setSelectedLocationId(newLocation.id);
    setNewLocationName("");
    setIsAddLocationModalVisible(false);

    // Create the album
    await CameraService.createAlbum(trimmedName);
  };

  const deleteLocation = (locationId: string) => {
    if (locationId === "1") {
      Alert.alert("Cannot Delete", "Cannot delete the default album.");
      return;
    }

    Alert.alert(
      "Delete Album",
      "Are you sure you want to delete this album?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            const updatedLocations = locations.filter((l) =>
              l.id !== locationId
            );
            setLocations(updatedLocations);
            if (selectedLocationId === locationId) {
              setSelectedLocationId("1");
            }
          },
        },
      ],
    );
  };

  const selectedLocation = locations.find((l) => l.id === selectedLocationId);

  if (!cameraPermission.granted && !cameraPermission.canAsk) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>
            Camera permission is required to use this app.
          </Text>
          <Text style={styles.permissionSubtext}>
            Please enable camera permission in your device settings.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!cameraPermission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>
            Camera permission is required to take photos.
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermissions}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />

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
              <CameraView
                style={styles.camera}
                facing={facing}
                flash={flash}
                zoom={zoom}
                onTouchEnd={toggleControlsVisibility}
              >
                {controlsVisible && (
                  <>
                    {/* Top Controls Bar */}
                    <View style={styles.topControlsBar}>
                      <TouchableOpacity
                        style={[
                          styles.controlButton,
                          flash !== "off" && styles.activeControl,
                        ]}
                        onPress={toggleFlash}
                      >
                        <Text
                          style={[
                            styles.controlButtonText,
                            flash !== "off" && styles.activeControlText,
                          ]}
                        >
                          {flash === "on"
                            ? "⚡"
                            : flash === "auto"
                            ? "🔆"
                            : "⚡"}
                        </Text>
                      </TouchableOpacity>

                      <View style={styles.zoomIndicator}>
                        <Text style={styles.zoomText}>
                          {(zoom * 2 + 1).toFixed(1)}x
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={styles.controlButton}
                        onPress={toggleCamera}
                      >
                        <Text style={styles.controlButtonText}>🔄</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Bottom Controls */}
                    <View style={styles.bottomControlsContainer}>
                      {/* Location Buttons Row */}
                      <View style={styles.locationButtonsContainer}>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles
                            .locationButtonsScrollView}
                        >
                          {locations.map((location) => (
                            <TouchableOpacity
                              key={location.id}
                              style={[
                                styles.locationButton,
                                selectedLocationId === location.id &&
                                styles.selectedLocationButton,
                              ]}
                              onPress={() => setSelectedLocationId(location.id)}
                              onLongPress={() => deleteLocation(location.id)}
                            >
                              <Text
                                style={[
                                  styles.locationButtonText,
                                  selectedLocationId === location.id &&
                                  styles.selectedLocationButtonText,
                                ]}
                              >
                                {location.name}
                              </Text>
                            </TouchableOpacity>
                          ))}
                          <TouchableOpacity
                            style={styles.addLocationButton}
                            onPress={() => setIsAddLocationModalVisible(true)}
                          >
                            <Text style={styles.addLocationButtonText}>+</Text>
                          </TouchableOpacity>
                        </ScrollView>
                      </View>

                      {/* Camera Controls Row */}
                      <View style={styles.cameraControlsRow}>
                        <View style={styles.albumInfo}>
                          <Text style={styles.albumName}>
                            {selectedLocation?.name || "Default"}
                          </Text>
                          <Text style={styles.photoCount}>
                            {photoCount} photos
                          </Text>
                        </View>

                        <TouchableOpacity
                          style={styles.captureButton}
                          onPress={takePicture}
                          activeOpacity={0.8}
                        >
                          <View style={styles.captureButtonInner} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.albumButton}
                          onPress={() => _setIsAlbumSelectionModalVisible(true)}
                        >
                          <Text style={styles.albumButtonText}>📁</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </>
                )}
              </CameraView>
            </Animated.View>
          </View>
        </GestureDetector>

        {/* Add Location Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={isAddLocationModalVisible}
          onRequestClose={() => setIsAddLocationModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <BlurView intensity={20} style={styles.modalBlur}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Add New Album</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Album name"
                  placeholderTextColor="#999"
                  value={newLocationName}
                  onChangeText={setNewLocationName}
                  maxLength={50}
                  autoFocus={true}
                />
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => {
                      setIsAddLocationModalVisible(false);
                      setNewLocationName("");
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.addButton]}
                    onPress={addLocation}
                  >
                    <Text style={styles.addButtonText}>Add</Text>
                  </TouchableOpacity>
                </View>
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
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  permissionText: {
    color: "#fff",
    fontSize: 18,
    textAlign: "center",
    marginBottom: 10,
  },
  permissionSubtext: {
    color: "#ccc",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
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
    top: 50,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    zIndex: 10,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  activeControl: {
    borderColor: "#FFD700",
    backgroundColor: "rgba(255, 215, 0, 0.2)",
  },
  controlButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
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
    fontWeight: "bold",
  },
  bottomControlsContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 40,
    zIndex: 10,
  },
  locationButtonsContainer: {
    marginBottom: 20,
  },
  locationButtonsScrollView: {
    paddingHorizontal: 20,
  },
  locationButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 2,
    borderColor: "transparent",
  },
  selectedLocationButton: {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderColor: "#fff",
  },
  locationButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  selectedLocationButtonText: {
    fontWeight: "bold",
  },
  addLocationButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.5)",
    borderStyle: "dashed",
  },
  addLocationButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  cameraControlsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  albumInfo: {
    flex: 1,
    alignItems: "flex-start",
  },
  albumName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  photoCount: {
    color: "#ccc",
    fontSize: 12,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#fff",
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fff",
  },
  albumButton: {
    flex: 1,
    alignItems: "flex-end",
  },
  albumButtonText: {
    fontSize: 24,
  },
  modalOverlay: {
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
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    borderRadius: 20,
    padding: 20,
    width: width * 0.8,
    alignItems: "center",
  },
  modalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 10,
    padding: 15,
    color: "#fff",
    fontSize: 16,
    width: "100%",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  addButton: {
    backgroundColor: "#007AFF",
  },
  cancelButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
