import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system";
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
    location: Location,
  ): Promise<MediaLibrary.Asset | null> {
    try {
      const hasPermission = await this.ensurePermissions();
      if (!hasPermission) {
        throw new Error("Media library permission not granted");
      }

      // Generate timestamped filename
      const timestampedFilename = this.generatePhotoFileName();
      const fileExtension = photoUri.split(".").pop() || "jpg";
      const newFilename = timestampedFilename.replace(
        ".jpg",
        `.${fileExtension}`,
      );

      // Create a new file path with the timestamped name
      const newPhotoUri = `${FileSystem.documentDirectory}${newFilename}`;

      // Copy the photo to the new location with timestamped name
      await FileSystem.copyAsync({
        from: photoUri,
        to: newPhotoUri,
      });

      // Create asset from the renamed photo - this saves to camera roll first
      const asset = await MediaLibrary.createAssetAsync(newPhotoUri);

      // For non-default locations, try to create/use the specific album
      if (location.id !== "1") { // Not the default album
        try {
          // Check if album exists
          let album = await MediaLibrary.getAlbumAsync(location.name);

          // Create album if it doesn't exist
          if (!album) {
            album = await MediaLibrary.createAlbumAsync(
              location.name,
              asset,
              true,
            );
          } else {
            // Add asset to existing album
            await MediaLibrary.addAssetsToAlbumAsync([asset], album, true);
          }

          console.log(`Photo saved to album: ${location.name}`);
        } catch (albumError) {
          console.warn(
            `Could not save to album ${location.name}, saved to camera roll:`,
            albumError,
          );
        }
      }

      // Clean up the temporary renamed file
      try {
        await FileSystem.deleteAsync(newPhotoUri, { idempotent: true });
      } catch (cleanupError) {
        console.warn("Could not clean up temporary file:", cleanupError);
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
      const hasPermission = await this.ensurePermissions();
      if (!hasPermission) {
        throw new Error("Media library permission not granted");
      }

      // Check if album exists
      let album = await MediaLibrary.getAlbumAsync(albumName);

      // Create album if it doesn't exist
      if (!album) {
        album = await MediaLibrary.createAlbumAsync(albumName, asset, true);
      } else {
        // Add asset to existing album
        await MediaLibrary.addAssetsToAlbumAsync([asset], album, true);
      }

      console.log(`Asset added to album: ${albumName}`);
    } catch (error) {
      console.error("Error adding asset to album:", error);
      throw error;
    }
  }

  static async getAlbumPhotoCount(albumName: string): Promise<number> {
    try {
      const hasPermission = await this.ensurePermissions();
      if (!hasPermission) {
        return 0;
      }

      // For default album, return total photo count
      if (albumName === "Default") {
        const { totalCount } = await MediaLibrary.getAssetsAsync({
          first: 1,
          mediaType: MediaLibrary.MediaType.photo,
        });
        return totalCount;
      }

      // For specific albums, try to get the actual album count
      try {
        const album = await MediaLibrary.getAlbumAsync(albumName);
        if (album) {
          return album.assetCount;
        }
        return 0;
      } catch (albumError) {
        console.warn(`Could not get count for album ${albumName}:`, albumError);
        // Fallback to total count
        const { totalCount } = await MediaLibrary.getAssetsAsync({
          first: 1,
          mediaType: MediaLibrary.MediaType.photo,
        });
        return totalCount;
      }
    } catch (error) {
      console.error("Error getting album photo count:", error);
      return 0;
    }
  }

  static async getAllAvailableAlbums(): Promise<MediaLibrary.Album[]> {
    try {
      const hasPermission = await this.ensurePermissions();
      if (!hasPermission) {
        return [];
      }

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
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");

    return `IMG_${year}${month}${day}_${hours}${minutes}${seconds}.jpg`;
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
      const hasPermission = await this.ensurePermissions();
      if (!hasPermission) {
        return false;
      }

      const album = await MediaLibrary.getAlbumAsync(name);
      return album !== null;
    } catch (error) {
      console.error("Error checking album name:", error);
      return false;
    }
  }
}
