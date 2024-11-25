import React, { useState } from "react";
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

const CameraApp = () => {
  // Camera state
  const [facing, setFacing] = useState<CameraType>("back");
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [mediaLibraryPermission, requestMediaLibraryPermission] = MediaLibrary
    .usePermissions();
  const [camera, setCamera] = useState<CameraView | null>(null);

  // Location buttons state
  const [locations, setLocations] = useState([
    { id: "1", name: "Default", path: "DCIM/CameraApp" },
  ]);
  const [selectedLocationId, setSelectedLocationId] = useState("1");
  const [isAddLocationModalVisible, setIsAddLocationModalVisible] = useState(
    false,
  );
  const [newLocationName, setNewLocationName] = useState("");

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
          false,
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

    setLocations([...locations, newLocation]);
    setNewLocationName("");
    setIsAddLocationModalVisible(false);
  };

  // Remove location button
  const removeLocation = (id: string) => {
    if (id === "1") {
      Alert.alert("Error", "Cannot remove default location");
      return;
    }

    setLocations(locations.filter((loc) => loc.id !== id));
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
      >
        <View style={styles.cameraButtonContainer}>
          <TouchableOpacity
            style={styles.flipButton}
            onPress={toggleCameraFacing}
          >
            <Text style={styles.buttonText}>Flip</Text>
          </TouchableOpacity>
        </View>
      </CameraView>

      {/* Location Buttons Scroll View */}
      <View style={styles.locationButtonsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
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
                        {
                          text: "Cancel",
                          style: "cancel",
                        },
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
                <Text style={styles.locationButtonText}>
                  {location.name}
                </Text>
              </TouchableOpacity>
            </View>
          ))}

          {/* Add Location Button */}
          <TouchableOpacity
            style={styles.addLocationButton}
            onPress={() => setIsAddLocationModalVisible(true)}
          >
            <Text style={styles.addLocationButtonText}>+</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Capture Button */}
      <TouchableOpacity
        style={styles.captureButton}
        onPress={takePicture}
      >
        <Text style={styles.captureButtonText}>Capture</Text>
      </TouchableOpacity>

      {/* Add Location Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isAddLocationModalVisible}
        onRequestClose={() => setIsAddLocationModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Location</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Location Name"
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  message: {
    textAlign: "center",
    paddingBottom: 10,
  },
  permissionButton: {
    backgroundColor: "#4CAF50",
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
    flex: 0.7,
    width: "100%",
  },
  cameraButtonContainer: {
    flex: 1,
    backgroundColor: "transparent",
    flexDirection: "row",
  },
  flipButton: {
    position: "absolute",
    top: 20,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 10,
    borderRadius: 10,
  },
  buttonText: {
    color: "white",
    fontSize: 18,
  },
  locationButtonsContainer: {
    padding: 10,
    backgroundColor: "#f0f0f0",
  },
  locationButtonWrapper: {
    marginRight: 10,
  },
  locationButton: {
    backgroundColor: "#e0e0e0",
    padding: 10,
    borderRadius: 5,
  },
  selectedLocationButton: {
    backgroundColor: "#4CAF50",
  },
  locationButtonText: {
    color: "black",
  },
  addLocationButton: {
    backgroundColor: "#2196F3",
    padding: 10,
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
  },
  addLocationButtonText: {
    color: "white",
    fontSize: 18,
  },
  captureButton: {
    backgroundColor: "#4CAF50",
    padding: 15,
    margin: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  captureButtonText: {
    color: "white",
    fontSize: 18,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    width: "80%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    marginBottom: 15,
    borderRadius: 5,
  },
  modalButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalCancelButton: {
    backgroundColor: "#f44336",
    padding: 10,
    borderRadius: 5,
    flex: 1,
    marginRight: 10,
  },
  modalAddButton: {
    backgroundColor: "#4CAF50",
    padding: 10,
    borderRadius: 5,
    flex: 1,
  },
  modalButtonText: {
    color: "white",
    textAlign: "center",
  },
});

export default CameraApp;
