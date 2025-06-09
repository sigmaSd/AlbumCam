import React, { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
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
// hack just to make it type check, but it does already work at runtime
const AsyncStorage = AsyncStorageModule as unknown as {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

const STORAGE_KEYS = {
  LOCATIONS: "@camera_locations",
  SELECTED_LOCATION: "@selected_location",
};

type Locaton = {
  id: string;
  name: string;
  path: string;
};

const CameraApp = () => {
  // Camera state
  const [facing, setFacing] = useState<CameraType>("back");
  const [flash, setFlash] = useState<"off" | "on">("off");
  const [zoom, setZoom] = useState(0);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [mediaLibraryPermission, requestMediaLibraryPermission] = MediaLibrary
    .usePermissions();
  const [camera, setCamera] = useState<CameraView | null>(null);

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

  // Load saved data when component mounts
  useEffect(() => {
    loadSavedData();
  }, []);

  // Save data whenever locations or selectedLocationId changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    saveData();
  }, [locations, selectedLocationId]);

  const loadSavedData = async () => {
    try {
      const savedLocations = await AsyncStorage.getItem(STORAGE_KEYS.LOCATIONS);
      const savedSelectedLocation = await AsyncStorage.getItem(
        STORAGE_KEYS.SELECTED_LOCATION,
      );

      if (savedLocations) {
        setLocations(JSON.parse(savedLocations));
      }

      if (savedSelectedLocation) {
        setSelectedLocationId(savedSelectedLocation);
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
    } catch (error) {
      console.error("Error saving data:", error);
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
      <View style={styles.container}>
        <Text style={styles.message}>
          We need camera and media library permissions to save photos
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={async () => {
            await requestCameraPermission();
            await requestMediaLibraryPermission();
          }}
        >
          <Text style={styles.permissionButtonText}>Grant Permissions</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Toggle camera facing
  const toggleCameraFacing = () => {
    setFacing((current) => current === "back" ? "front" : "back");
  };

  const zoomIn = () => {
    setZoom(Math.min(1, zoom + 0.1));
  };

  const zoomOut = () => {
    setZoom(Math.max(0, zoom - 0.1));
  };

  // Take photo functionality
  const takePicture = async () => {
    if (camera) {
      try {
        const photo = await camera.takePictureAsync();

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

        // Alert.alert(
        //   "Photo Saved",
        //   `Saved to ${selectedLocation.name} album`,
        // );
      } catch (error) {
        console.error("Error taking picture:", error);
        Alert.alert("Error", "Failed to take picture");
      }
    }
  };

  // Add new location button
  const addLocation = () => {
    if (newLocationName.trim() === "") {
      Alert.alert("Error", "Location name cannot be empty");
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
    <SafeAreaView style={styles.container}>
      {/* Camera View */}
      <CameraView
        style={styles.camera}
        facing={facing}
        ref={(ref) => setCamera(ref)}
        enableTorch={flash === "on" ? true : false}
        zoom={zoom}
      >
        <View style={styles.cameraControlsContainer}>
          <View style={styles.controlsRow}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => setFlash(flash === "on" ? "off" : "on")}
            >
              <Text style={styles.controlButtonText}>
                {flash === "on" ? "🔦" : "🔆"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              onPress={toggleCameraFacing}
            >
              <Text style={styles.controlButtonText}>🔄</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.zoomControls}>
            <TouchableOpacity
              style={styles.zoomButton}
              onPress={zoomIn}
            >
              <Text style={styles.zoomButtonText}>+</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.zoomButton}
              onPress={zoomOut}
            >
              <Text style={styles.zoomButtonText}>-</Text>
            </TouchableOpacity>
          </View>
        </View>
      </CameraView>

      <View style={styles.bottomContainer}>
        {/* Location Buttons Container with Fixed Add Button */}
        <View style={styles.locationButtonsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.locationScrollView}
            contentContainerStyle={styles.locationButtonsScroll}
          >
            {locations.map((location) => (
              <View key={location.id} style={styles.locationButtonWrapper}>
                <TouchableOpacity
                  style={[
                    styles.locationButton,
                    selectedLocationId === location.id &&
                    styles.selectedLocationButton,
                  ]}
                  onPress={() =>
                    setSelectedLocationId(location.id)}
                  onLongPress={() => {
                    if (location.id !== "1") {
                      Alert.alert(
                        "Remove Location",
                        `Remove ${location.name}?`,
                        [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "Remove",
                            onPress: () =>
                              removeLocation(location.id),
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
                      styles.selectedLocationText,
                    ]}
                  >
                    {location.name}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          {/* Fixed Add Button */}
          <TouchableOpacity
            style={styles.addLocationButton}
            onPress={() => setIsAddLocationModalVisible(true)}
            onLongPress={async () => {
              await fetchAvailableAlbums();
              setIsAlbumSelectionModalVisible(true);
            }}
          >
            <Text style={styles.addLocationButtonText}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Capture Button */}
        <TouchableOpacity
          style={styles.captureButton}
          onPress={takePicture}
        >
          <View style={styles.captureButtonInner} />
        </TouchableOpacity>
      </View>

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
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Existing Album</Text>
            <ScrollView style={styles.albumList}>
              {availableAlbums.map((album) => (
                <TouchableOpacity
                  key={album.id}
                  style={styles.albumItem}
                  onPress={() => {
                    if (!locations.some((loc) => loc.name === album.title)) {
                      const newLocation = {
                        id: String(Date.now()),
                        name: album.title,
                        path: `DCIM/${album.title}`,
                      };
                      setLocations([...locations, newLocation]);
                    } else {
                      Alert.alert("Album already exists in locations");
                    }
                    setIsAlbumSelectionModalVisible(false);
                  }}
                >
                  <Text style={styles.albumItemText}>{album.title}</Text>
                  <Text style={styles.albumItemCount}>
                    ({album.assetCount} items)
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.modalCancelButton, { marginTop: 10 }]}
              onPress={() => setIsAlbumSelectionModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  message: {
    textAlign: "center",
    paddingBottom: 10,
    color: "#fff",
  },
  permissionButton: {
    backgroundColor: "#007AFF",
    padding: 15,
    margin: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  permissionButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  camera: {
    flex: 1,
    width: "100%",
  },
  cameraControlsContainer: {
    flex: 1,
    padding: 20,
  },
  controlsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  controlButton: {
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 12,
    borderRadius: 25,
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  controlButtonText: {
    fontSize: 20,
  },
  zoomControls: {
    position: "absolute",
    right: 20,
    top: "50%",
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 25,
    padding: 5,
    opacity: 0.5,
  },
  zoomButton: {
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 12,
    borderRadius: 25,
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 5,
  },
  zoomButtonText: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#aff",
    opacity: 0.9,
    textAlign: "center",
    textAlignVertical: "center", // Android
    includeFontPadding: false, // Android
    lineHeight: 28, // Match fontSize for better vertical centering
  },
  bottomContainer: {
    backgroundColor: "#000",
    paddingBottom: 20,
  },
  locationButtonsContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
  },
  locationScrollView: {
    flex: 1,
  },
  locationButtonsScroll: {
    paddingRight: 10,
  },
  locationButtonWrapper: {
    marginRight: 8,
  },
  locationButton: {
    backgroundColor: "#333",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  selectedLocationButton: {
    backgroundColor: "#007AFF",
  },
  locationButtonText: {
    color: "#fff",
    fontSize: 14,
  },
  selectedLocationText: {
    fontWeight: "600",
  },
  addLocationButton: {
    backgroundColor: "#007AFF",
    padding: 8,
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  addLocationButtonText: {
    color: "#fff",
    fontSize: 20,
    textAlign: "center",
    textAlignVertical: "center", // for Android
    lineHeight: 20, // match fontSize for better vertical centering
    includeFontPadding: false, // for Android to remove extra padding
  },
  captureButton: {
    alignSelf: "center",
    marginVertical: 20,
    width: 70,
    height: 70,
    backgroundColor: "#fff",
    borderRadius: 35,
    padding: 5,
  },
  captureButtonInner: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "#000",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.8)",
  },
  modalContent: {
    backgroundColor: "#222",
    padding: 20,
    borderRadius: 15,
    width: "80%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
    color: "#fff",
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#444",
    padding: 12,
    marginBottom: 15,
    borderRadius: 8,
    color: "#fff",
    backgroundColor: "#333",
  },
  modalButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalCancelButton: {
    backgroundColor: "#444",
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
  },
  modalAddButton: {
    backgroundColor: "#007AFF",
    padding: 12,
    borderRadius: 8,
    flex: 1,
  },
  modalButtonText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "600",
  },
  albumList: {
    maxHeight: 300,
  },
  albumItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#444",
  },
  albumItemText: {
    color: "#fff",
    fontSize: 16,
  },
  albumItemCount: {
    color: "#999",
    fontSize: 14,
  },
});

export default CameraApp;
