import { NativeEventEmitter, NativeModules } from "react-native";

const { CustomCameraModule } = NativeModules;

export interface CameraPermissionStatus {
  granted: boolean;
  canAsk: boolean;
}

export interface CameraPhoto {
  uri: string;
  width: number;
  height: number;
}

export interface CameraConfig {
  facing: "front" | "back";
  flash: "on" | "off" | "auto";
  quality: number; // 0.0 to 1.0
}

class CameraModule {
  private eventEmitter: NativeEventEmitter;

  constructor() {
    this.eventEmitter = new NativeEventEmitter(CustomCameraModule);
  }

  async requestCameraPermission(): Promise<CameraPermissionStatus> {
    try {
      const result = await CustomCameraModule.requestCameraPermission();
      return result;
    } catch (error) {
      console.error("Error requesting camera permission:", error);
      return { granted: false, canAsk: false };
    }
  }

  async checkCameraPermission(): Promise<CameraPermissionStatus> {
    try {
      const result = await CustomCameraModule.checkCameraPermission();
      return result;
    } catch (error) {
      console.error("Error checking camera permission:", error);
      return { granted: false, canAsk: false };
    }
  }

  async takePicture(config?: Partial<CameraConfig>): Promise<CameraPhoto> {
    try {
      const defaultConfig: CameraConfig = {
        facing: "back",
        flash: "off",
        quality: 0.8,
      };

      const finalConfig = { ...defaultConfig, ...config };
      const result = await CustomCameraModule.takePicture(finalConfig);
      return result;
    } catch (error) {
      console.error("Error taking picture:", error);
      throw error;
    }
  }

  async savePhotoToGallery(uri: string, albumName?: string): Promise<boolean> {
    try {
      const result = await CustomCameraModule.savePhotoToGallery(
        uri,
        albumName || "Camera",
      );
      return result;
    } catch (error) {
      console.error("Error saving photo to gallery:", error);
      return false;
    }
  }

  async createAlbum(albumName: string): Promise<boolean> {
    try {
      const result = await CustomCameraModule.createAlbum(albumName);
      return result;
    } catch (error) {
      console.error("Error creating album:", error);
      return false;
    }
  }

  async getAlbumPhotoCount(albumName: string): Promise<number> {
    try {
      const result = await CustomCameraModule.getAlbumPhotoCount(albumName);
      return result;
    } catch (error) {
      console.error("Error getting album photo count:", error);
      return 0;
    }
  }

  // Event listeners
  onCameraReady(callback: () => void) {
    return this.eventEmitter.addListener("CameraReady", callback);
  }

  onCameraError(callback: (error: string) => void) {
    return this.eventEmitter.addListener("CameraError", callback);
  }
}

export default new CameraModule();
