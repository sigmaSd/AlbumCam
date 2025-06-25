import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";

interface CameraViewProps {
  style?: ViewStyle;
  facing?: "front" | "back";
  flash?: "on" | "off" | "auto";
  zoom?: number;
  onTouchEnd?: () => void;
  children?: React.ReactNode;
}

export const CameraView: React.FC<CameraViewProps> = ({
  style,
  facing = "back",
  flash = "off",
  zoom = 0,
  onTouchEnd,
  children,
}) => {
  return (
    <View style={[styles.container, style]} onTouchEnd={onTouchEnd}>
      {/* Camera preview placeholder - in a real implementation, this would show the native camera preview */}
      <View style={styles.previewContainer}>
        <Text style={styles.previewText}>
          Camera Preview
        </Text>
        <Text style={styles.configText}>
          Facing: {facing} | Flash: {flash} | Zoom: {(zoom * 2 + 1).toFixed(1)}x
        </Text>
      </View>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    position: "relative",
  },
  previewContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#222",
  },
  previewText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  configText: {
    color: "#ccc",
    fontSize: 14,
  },
});
