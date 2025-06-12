import AsyncStorageModule from "@react-native-async-storage/async-storage";
import { DEFAULT_LOCATION, STORAGE_KEYS } from "../constants";
import type { AsyncStorageInterface, Location } from "../types";

// Type-safe AsyncStorage wrapper
const AsyncStorage = AsyncStorageModule as unknown as AsyncStorageInterface;

export class StorageService {
  static async getLocations(): Promise<Location[]> {
    try {
      const savedLocations = await AsyncStorage.getItem(STORAGE_KEYS.LOCATIONS);
      if (savedLocations) {
        return JSON.parse(savedLocations);
      }
      return [DEFAULT_LOCATION];
    } catch (error) {
      console.error("Error loading locations:", error);
      return [DEFAULT_LOCATION];
    }
  }

  static async saveLocations(locations: Location[]): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.LOCATIONS,
        JSON.stringify(locations),
      );
    } catch (error) {
      console.error("Error saving locations:", error);
      throw error;
    }
  }

  static async getSelectedLocationId(): Promise<string> {
    try {
      const savedSelectedLocation = await AsyncStorage.getItem(
        STORAGE_KEYS.SELECTED_LOCATION,
      );
      return savedSelectedLocation || DEFAULT_LOCATION.id;
    } catch (error) {
      console.error("Error loading selected location:", error);
      return DEFAULT_LOCATION.id;
    }
  }

  static async saveSelectedLocationId(locationId: string): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SELECTED_LOCATION, locationId);
    } catch (error) {
      console.error("Error saving selected location:", error);
      throw error;
    }
  }

  static async getHapticEnabled(): Promise<boolean> {
    try {
      const savedHapticEnabled = await AsyncStorage.getItem(
        STORAGE_KEYS.HAPTIC_ENABLED,
      );
      if (savedHapticEnabled !== null) {
        return JSON.parse(savedHapticEnabled);
      }
      return true; // Default to enabled
    } catch (error) {
      console.error("Error loading haptic setting:", error);
      return true;
    }
  }

  static async saveHapticEnabled(enabled: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.HAPTIC_ENABLED,
        JSON.stringify(enabled),
      );
    } catch (error) {
      console.error("Error saving haptic setting:", error);
      throw error;
    }
  }

  static async saveAllData(
    locations: Location[],
    selectedLocationId: string,
    isHapticEnabled: boolean,
  ): Promise<void> {
    try {
      await Promise.all([
        this.saveLocations(locations),
        this.saveSelectedLocationId(selectedLocationId),
        this.saveHapticEnabled(isHapticEnabled),
      ]);
    } catch (error) {
      console.error("Error saving all data:", error);
      throw error;
    }
  }

  static async loadAllData(): Promise<{
    locations: Location[];
    selectedLocationId: string;
    isHapticEnabled: boolean;
  }> {
    try {
      const [locations, selectedLocationId, isHapticEnabled] = await Promise
        .all([
          this.getLocations(),
          this.getSelectedLocationId(),
          this.getHapticEnabled(),
        ]);

      return {
        locations,
        selectedLocationId,
        isHapticEnabled,
      };
    } catch (error) {
      console.error("Error loading all data:", error);
      return {
        locations: [DEFAULT_LOCATION],
        selectedLocationId: DEFAULT_LOCATION.id,
        isHapticEnabled: true,
      };
    }
  }
}
