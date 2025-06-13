import AsyncStorageModule from "@react-native-async-storage/async-storage";
import { DEFAULT_LOCATION, STORAGE_KEYS } from "../constants";
import type { AsyncStorageInterface, Location } from "../types/index.ts";

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

  static async saveAllData(
    locations: Location[],
    selectedLocationId: string,
  ): Promise<void> {
    try {
      await Promise.all([
        this.saveLocations(locations),
        this.saveSelectedLocationId(selectedLocationId),
      ]);
    } catch (error) {
      console.error("Error saving all data:", error);
      throw error;
    }
  }

  static async loadAllData(): Promise<{
    locations: Location[];
    selectedLocationId: string;
  }> {
    try {
      const [locations, selectedLocationId] = await Promise
        .all([
          this.getLocations(),
          this.getSelectedLocationId(),
        ]);

      return {
        locations,
        selectedLocationId,
      };
    } catch (error) {
      console.error("Error loading all data:", error);
      return {
        locations: [DEFAULT_LOCATION],
        selectedLocationId: DEFAULT_LOCATION.id,
      };
    }
  }
}
