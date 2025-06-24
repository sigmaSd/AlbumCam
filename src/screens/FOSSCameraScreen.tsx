import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  GestureResponderEvent,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as MediaLibrary from "expo-media-library";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

import FOSSCameraService, { FOSSCaptureResult } from "../utils/fossCamera";
import { StorageService } from "../utils/storage";
import { CameraService } from "../utils/camera";
import { DEFAULT_LOCATION } from "../constants";
import type { Location } from "../types/index";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

export const FOSSCameraScreen: React.FC = () => {
  // Camera state
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  // Location and album state
  const [selectedLocation, setSelectedLocation] = useState<Location>(
    DEFAULT_LOCATION,
  );
  const [availableAlbums, setAvailableAlbums] = useState<MediaLibrary.Album[]>(
    [],
  );
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [newLocationName, setNewLocationName] = useState("");
  const [showNewLocationInput, setShowNewLocationInput] = useState(false);
  const [photoCount, setPhotoCount] = useState<number>(0);

  // UI state
  const [controlsVisible, setControlsVisible] = useState(true);
  const [availableLocations, setAvailableLocations] = useState<Location[]>([
    DEFAULT_LOCATION,
  ]);

  // Animation
  const shutterAnimation = useRef(new Animated.Value(1)).current;
  const controlsOpacity = useRef(new Animated.Value(1)).current;

  const fossCamera = FOSSCameraService;

  // Initialize camera and permissions
  useEffect(() => {
    initializeCamera();
    loadStoredLocations();
    fetchAvailableAlbums();

    return () => {
      fossCamera.cleanup();
    };
  }, []);

  // Update photo count when location changes
  useEffect(() => {
    updatePhotoCount();
  }, [selectedLocation]);

  // Handle screen focus
  useFocusEffect(
    React.useCallback(() => {
      if (hasPermission && !isInitialized) {
        initializeCamera();
      }
      return () => {
        // Cleanup if needed
      };
    }, [hasPermission, isInitialized]),
  );

  const initializeCamera = async () => {
    try {
      const permission = await fossCamera.checkPermission();
      setHasPermission(permission);

      if (permission) {
        await fossCamera.initialize();
        setIsInitialized(true);
      }
    } catch (error) {
      console.error("Error initializing camera:", error);
      Alert.alert("Camera Error", "Failed to initialize camera");
    }
  };

  const loadStoredLocations = async () => {
    try {
      const locations = await StorageService.getLocations();
      setAvailableLocations(locations);

      const selected = await StorageService.getSelectedLocation();
      if (selected) {
        setSelectedLocation(selected);
      }
    } catch (error) {
      console.error("Error loading locations:", error);
    }
  };

  const updatePhotoCount = async () => {
    if (selectedLocation) {
      const count = await CameraService.getAlbumPhotoCount(
        selectedLocation.name,
      );
      setPhotoCount(count);
    }
  };

  const fetchAvailableAlbums = async () => {
    try {
      const mediaLibraryPermission = await MediaLibrary
        .requestPermissionsAsync();
      if (!mediaLibraryPermission.granted) {
        return;
      }

      const albums = await CameraService.getAllAvailableAlbums();
      setAvailableAlbums(albums);
    } catch (error) {
      console.error("Error fetching albums:", error);
    }
  };

  const toggleFlash = async () => {
    try {
      const newFlashState = !isFlashOn;
      await fossCamera.setFlash(newFlashState);
      setIsFlashOn(newFlashState);
    } catch (error) {
      console.error("Error toggling flash:", error);
      Alert.alert("Error", "Failed to toggle flash");
    }
  };

  const switchCamera = async () => {
    try {
      await fossCamera.switchCamera();
    } catch (error) {
      console.error("Error switching camera:", error);
      Alert.alert("Error", "Failed to switch camera");
    }
  };

  const takePicture = async () => {
    if (!isInitialized || isCapturing) return;

    try {
      setIsCapturing(true);

      // Shutter animation
      Animated.sequence([
        Animated.timing(shutterAnimation, {
          toValue: 0.8,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(shutterAnimation, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      const result: FOSSCaptureResult = await fossCamera.takePicture();

      if (result) {
        // Save to selected album
        if (selectedLocation) {
          await CameraService.savePhotoToAlbum(result.uri, selectedLocation);
          await updatePhotoCount();
        }

        // Show success feedback
        Alert.alert("📸 Photo Saved!", `Saved to ${selectedLocation.name}`);
      }
    } catch (error) {
      console.error("Error taking picture:", error);
      Alert.alert("Error", "Failed to take picture");
    } finally {
      setIsCapturing(false);
    }
  };

  const toggleControlsVisibility = () => {
    const newVisibility = !controlsVisible;
    setControlsVisible(newVisibility);

    Animated.timing(controlsOpacity, {
      toValue: newVisibility ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
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
      availableLocations,
    );
    if (isTaken) {
      Alert.alert("Name Taken", "This album name is already in use.");
      return;
    }

    const newLocation: Location = {
      id: Date.now().toString(),
      name: trimmedName,
      path: `DCIM/${trimmedName}`,
    };

    const updatedLocations = [...availableLocations, newLocation];
    await StorageService.saveLocations(updatedLocations);
    setAvailableLocations(updatedLocations);
    setSelectedLocation(newLocation);
    await StorageService.saveSelectedLocation(newLocation);

    setNewLocationName("");
    setShowNewLocationInput(false);
    setShowLocationPicker(false);
  };

  const selectLocation = async (location: Location) => {
    setSelectedLocation(location);
    await StorageService.saveSelectedLocation(location);
    setShowLocationPicker(false);
  };

  const deleteLocation = async (locationToDelete: Location) => {
    if (locationToDelete.id === "1") {
      Alert.alert("Cannot Delete", "The default album cannot be deleted.");
      return;
    }

    Alert.alert(
      "Delete Album",
      `Are you sure you want to delete "${locationToDelete.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const updatedLocations = availableLocations.filter(
              (loc) => loc.id !== locationToDelete.id,
            );
            await StorageService.saveLocations(updatedLocations);
            setAvailableLocations(updatedLocations);

            if (selectedLocation.id === locationToDelete.id) {
              setSelectedLocation(DEFAULT_LOCATION);
              await StorageService.saveSelectedLocation(DEFAULT_LOCATION);
            }

            try {
              await CameraService.deleteAlbum(locationToDelete.name);
            } catch (error) {
              console.warn("Could not delete system album:", error);
            }
          },
        },
      ],
    );
  };

  // Handle missing permissions
  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.permissionContainer}>
        <View style={styles.permissionContent}>
          <Text style={styles.permissionTitle}>📸 Camera Access Required</Text>
          <Text style={styles.permissionMessage}>
            AlbumCam needs camera access to take photos and organize them into
            albums.
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={initializeCamera}
          >
            <Text style={styles.permissionButtonText}>Grant Camera Access</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!isInitialized) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Initializing camera...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Camera Placeholder View - In a full implementation, you'd add a camera preview surface */}
      <TouchableOpacity
        style={styles.cameraContainer}
        activeOpacity={1}
        onPress={toggleControlsVisibility}
      >
        <Animated.View
          style={[
            styles.cameraPreview,
            {
              transform: [{ scale: shutterAnimation }],
            },
          ]}
        >
          <View style={styles.cameraPlaceholder}>
            <Ionicons
              name="camera-outline"
              size={80}
              color="rgba(255,255,255,0.3)"
            />
            <Text style={styles.placeholderText}>Camera Preview</Text>
            <Text style={styles.placeholderSubtext}>
              Tap to toggle controls • Tap shutter to capture
            </Text>
          </View>
        </Animated.View>
      </TouchableOpacity>

      {/* Camera Controls */}
      <Animated.View
        style={[
          styles.controlsContainer,
          {
            opacity: controlsOpacity,
          },
        ]}
      >
        {/* Top Controls */}
        <View style={styles.topControls}>
          <TouchableOpacity style={styles.controlButton} onPress={toggleFlash}>
            <Ionicons
              name={isFlashOn ? "flash" : "flash-off"}
              size={24}
              color={isFlashOn ? "#FFD700" : "white"}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlButton} onPress={switchCamera}>
            <Ionicons name="camera-reverse-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Bottom Controls */}
        <View style={styles.bottomControls}>
          {/* Location Selector */}
          <TouchableOpacity
            style={styles.locationButton}
            onPress={() => setShowLocationPicker(true)}
          >
            <View style={styles.locationContent}>
              <Text
                style={styles.locationText}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                📁 {selectedLocation.name}
              </Text>
              <Text style={styles.photoCountText}>{photoCount} photos</Text>
            </View>
          </TouchableOpacity>

          {/* Shutter Button */}
          <TouchableOpacity
            style={[
              styles.shutterButton,
              isCapturing && styles.shutterButtonDisabled,
            ]}
            onPress={takePicture}
            disabled={isCapturing}
          >
            <View style={styles.shutterInner} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Location Picker Modal */}
      {showLocationPicker && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Album</Text>
              <TouchableOpacity onPress={() => setShowLocationPicker(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.locationList}>
              {availableLocations.map((location) => (
                <TouchableOpacity
                  key={location.id}
                  style={[
                    styles.locationItem,
                    selectedLocation.id === location.id &&
                    styles.selectedLocationItem,
                  ]}
                  onPress={() => selectLocation(location)}
                  onLongPress={() => deleteLocation(location)}
                >
                  <Text
                    style={[
                      styles.locationItemText,
                      selectedLocation.id === location.id &&
                      styles.selectedLocationText,
                    ]}
                  >
                    📁 {location.name}
                  </Text>
                  {selectedLocation.id === location.id && (
                    <Ionicons name="checkmark" size={20} color="#007AFF" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.addLocationButton}
              onPress={() => setShowNewLocationInput(true)}
            >
              <Ionicons name="add" size={20} color="#007AFF" />
              <Text style={styles.addLocationText}>Add New Album</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* New Location Input Modal */}
      {showNewLocationInput && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Album</Text>
              <TouchableOpacity onPress={() => setShowNewLocationInput(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Album Name</Text>
              <View style={styles.textInputContainer}>
                <Text
                  style={styles.textInput}
                  onPress={() => {
                    // Note: This is a simplified input - in a real app you'd use TextInput
                    Alert.prompt(
                      "Album Name",
                      "Enter the name for your new album:",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Create",
                          onPress: (text) => {
                            if (text) {
                              setNewLocationName(text);
                              addLocation();
                            }
                          },
                        },
                      ],
                      "plain-text",
                      newLocationName,
                    );
                  }}
                >
                  {newLocationName || "Tap to enter album name"}
                </Text>
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowNewLocationInput(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.createButton]}
                onPress={addLocation}
              >
                <Text style={styles.createButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  loadingText: {
    color: "white",
    fontSize: 18,
    textAlign: "center",
    marginTop: 100,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  permissionContent: {
    alignItems: "center",
    maxWidth: 300,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginBottom: 16,
    textAlign: "center",
  },
  permissionMessage: {
    fontSize: 16,
    color: "rgba(255,255,255,0.8)",
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
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  cameraContainer: {
    flex: 1,
  },
  cameraPreview: {
    flex: 1,
  },
  cameraPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
  },
  placeholderText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
  },
  placeholderSubtext: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  controlsContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "space-between",
  },
  topControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  bottomControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  locationButton: {
    flex: 1,
    marginRight: 20,
  },
  locationContent: {
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  locationText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    maxWidth: screenWidth * 0.4,
  },
  photoCountText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    marginTop: 2,
  },
  shutterButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.3)",
  },
  shutterButtonDisabled: {
    opacity: 0.5,
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "white",
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    width: screenWidth * 0.85,
    maxHeight: screenHeight * 0.7,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  locationList: {
    maxHeight: 300,
  },
  locationItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "#f8f9fa",
  },
  selectedLocationItem: {
    backgroundColor: "rgba(0,122,255,0.1)",
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  locationItemText: {
    fontSize: 16,
    color: "#333",
    flex: 1,
  },
  selectedLocationText: {
    color: "#007AFF",
    fontWeight: "600",
  },
  addLocationButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    marginTop: 10,
    borderRadius: 12,
    backgroundColor: "rgba(0,122,255,0.1)",
  },
  addLocationText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  textInputContainer: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#f8f9fa",
  },
  textInput: {
    fontSize: 16,
    color: "#333",
    minHeight: 20,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  createButton: {
    backgroundColor: "#007AFF",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
  createButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
