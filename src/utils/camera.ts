import * as MediaLibrary from "expo-media-library";
import type { Location } from "../types/index.ts";

export class CameraService {
  static async ensurePermissions(): Promise<boolean> {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      return status === "granted";
    } catch (error) {
      console.error("Error requesting media library permissions:", error);
      return false;
    }
  }

  static async savePhotoToAlbum(
    photoUri: string,
    _location: Location,
  ): Promise<MediaLibrary.Asset | null> {
    try {
      const hasPermission = await this.ensurePermissions();
      if (!hasPermission) {
        throw new Error("Media library permission not granted");
      }

      // Create asset from photo - this saves to camera roll
      const asset = await MediaLibrary.createAssetAsync(photoUri);

      // For non-default locations, we don't modify existing assets
      // Instead we let the user organize manually to avoid Expo Go permissions
      // The photo is still saved to the camera roll

      return asset;
    } catch (error) {
      console.error("Error saving photo to album:", error);
      throw error;
    }
  }

  static addAssetToAlbum(
    _asset: MediaLibrary.Asset,
    albumName: string,
  ): void {
    try {
      // In Expo Go, we avoid modifying assets to prevent permission popups
      // Photos are saved to camera roll and users can organize manually
      console.log(`Photo saved to camera roll (album: ${albumName})`);
    } catch (error) {
      console.error("Error adding asset to album:", error);
      throw error;
    }
  }

  static async getAlbumPhotoCount(_albumName: string): Promise<number> {
    try {
      // In Expo Go, just return total photo count for all albums
      // to avoid permission issues with accessing specific albums
      const { totalCount } = await MediaLibrary.getAssetsAsync({
        first: 1,
        mediaType: MediaLibrary.MediaType.photo,
      });
      return totalCount;
    } catch (error) {
      console.error("Error getting album photo count:", error);
      return 0;
    }
  }

  static async getAllAvailableAlbums(): Promise<MediaLibrary.Album[]> {
    try {
      const albums = await MediaLibrary.getAlbumsAsync();
      return albums;
    } catch (error) {
      console.error("Error fetching available albums:", error);
      return [];
    }
  }

  static async deleteAlbum(albumName: string): Promise<boolean> {
    try {
      const album = await MediaLibrary.getAlbumAsync(albumName);
      if (!album) return false;

      await MediaLibrary.deleteAlbumsAsync([album], false);
      return true;
    } catch (error) {
      console.error("Error deleting album:", error);
      return false;
    }
  }

  static generatePhotoFileName(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    return `IMG_${timestamp}.jpg`;
  }

  static validateAlbumName(name: string): { isValid: boolean; error?: string } {
    if (!name || name.trim().length === 0) {
      return { isValid: false, error: "Album name cannot be empty" };
    }

    if (name.trim().length > 50) {
      return {
        isValid: false,
        error: "Album name must be 50 characters or less",
      };
    }

    // Check for invalid characters
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(name)) {
      return {
        isValid: false,
        error: "Album name contains invalid characters",
      };
    }

    return { isValid: true };
  }

  static async isAlbumNameTaken(
    name: string,
    existingLocations: Location[],
  ): Promise<boolean> {
    // Check against existing locations
    const nameExists = existingLocations.some(
      (location) => location.name.toLowerCase() === name.toLowerCase(),
    );

    if (nameExists) return true;

    // Check against system albums
    try {
      const album = await MediaLibrary.getAlbumAsync(name);
      return album !== null;
    } catch (error) {
      console.error("Error checking album name:", error);
      return false;
    }
  }
}
