import * as MediaLibrary from "expo-media-library";
import type { Location } from "../types";

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
    location: Location,
  ): Promise<MediaLibrary.Asset | null> {
    try {
      const hasPermission = await this.ensurePermissions();
      if (!hasPermission) {
        throw new Error("Media library permission not granted");
      }

      // Create asset from photo
      const asset = await MediaLibrary.createAssetAsync(photoUri);

      // If it's not the default location, add to specific album
      if (location.id !== "1") {
        await this.addAssetToAlbum(asset, location.name);
      }

      return asset;
    } catch (error) {
      console.error("Error saving photo to album:", error);
      throw error;
    }
  }

  static async addAssetToAlbum(
    asset: MediaLibrary.Asset,
    albumName: string,
  ): Promise<void> {
    try {
      // Try to get existing album
      let album = await MediaLibrary.getAlbumAsync(albumName);

      if (!album) {
        // Create new album with the asset
        album = await MediaLibrary.createAlbumAsync(albumName, asset, false);
      } else {
        // Add asset to existing album
        await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
      }
    } catch (error) {
      console.error("Error adding asset to album:", error);
      throw error;
    }
  }

  static async getAlbumPhotoCount(albumName: string): Promise<number> {
    try {
      if (albumName === "Default") {
        // For default, get all photos
        const { totalCount } = await MediaLibrary.getAssetsAsync({
          first: 1,
          mediaType: MediaLibrary.MediaType.photo,
        });
        return totalCount;
      }

      // Get specific album
      const album = await MediaLibrary.getAlbumAsync(albumName);
      if (!album) return 0;

      const { totalCount } = await MediaLibrary.getAssetsAsync({
        first: 1,
        album: album,
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
