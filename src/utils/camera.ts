import CameraModule from "../native/camera/CameraModule.ts";
import type { Location } from "../types/index.ts";

export class CameraService {
  static async ensurePermissions(): Promise<boolean> {
    try {
      const permission = await CameraModule.checkCameraPermission();
      if (permission.granted) {
        return true;
      }

      if (permission.canAsk) {
        const requestResult = await CameraModule.requestCameraPermission();
        return requestResult.granted;
      }

      return false;
    } catch (error) {
      console.error("Error requesting camera permissions:", error);
      return false;
    }
  }

  static async savePhotoToAlbum(
    photoUri: string,
    location: Location,
  ): Promise<boolean> {
    try {
      const hasPermission = await this.ensurePermissions();
      if (!hasPermission) {
        throw new Error("Camera permission not granted");
      }

      // For non-default locations, create/use the specific album
      const albumName = location.id === "1" ? "Camera" : location.name;

      // Save photo to gallery/album
      const success = await CameraModule.savePhotoToGallery(
        photoUri,
        albumName,
      );

      if (success) {
        console.log(`Photo saved to album: ${albumName}`);
      } else {
        console.warn(`Could not save to album ${albumName}`);
      }

      return success;
    } catch (error) {
      console.error("Error saving photo to album:", error);
      throw error;
    }
  }

  static async takePicture(config?: {
    facing?: "front" | "back";
    flash?: "on" | "off" | "auto";
    quality?: number;
  }) {
    try {
      const hasPermission = await this.ensurePermissions();
      if (!hasPermission) {
        throw new Error("Camera permission not granted");
      }

      const result = await CameraModule.takePicture(config);
      return result;
    } catch (error) {
      console.error("Error taking picture:", error);
      throw error;
    }
  }

  static async getAlbumPhotoCount(albumName: string): Promise<number> {
    try {
      const hasPermission = await this.ensurePermissions();
      if (!hasPermission) {
        return 0;
      }

      // For default album, we'll return a placeholder count
      if (albumName === "Default") {
        return await CameraModule.getAlbumPhotoCount("Camera");
      }

      return await CameraModule.getAlbumPhotoCount(albumName);
    } catch (error) {
      console.error("Error getting album photo count:", error);
      return 0;
    }
  }

  static async createAlbum(albumName: string): Promise<boolean> {
    try {
      const hasPermission = await this.ensurePermissions();
      if (!hasPermission) {
        return false;
      }

      return await CameraModule.createAlbum(albumName);
    } catch (error) {
      console.error("Error creating album:", error);
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

  static isAlbumNameTaken(
    name: string,
    existingLocations: Location[],
  ): boolean {
    // Check against existing locations
    const nameExists = existingLocations.some(
      (location) => location.name.toLowerCase() === name.toLowerCase(),
    );

    if (nameExists) return true;

    // For simplicity, we'll just check against existing locations
    // In a full implementation, you'd check against system albums
    return false;
  }
}
