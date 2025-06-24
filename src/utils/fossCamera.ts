import { NativeEventEmitter, NativeModules } from "react-native";

export interface FOSSCameraInfo {
  id: string;
  type: "front" | "back" | "external";
}

export interface FOSSCaptureResult {
  uri: string;
  path: string;
  width: number;
  height: number;
}

export interface FOSSCameraModule {
  checkCameraPermission(): Promise<boolean>;
  getAvailableCameras(): Promise<FOSSCameraInfo[]>;
  openCamera(cameraId: string): Promise<void>;
  closeCamera(): Promise<void>;
  takePicture(): Promise<FOSSCaptureResult>;
  switchCamera(): Promise<void>;
  setFlash(enabled: boolean): Promise<void>;
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

const { FOSSCamera } = NativeModules;

if (!FOSSCamera) {
  throw new Error("FOSSCamera native module is not available");
}

export class FOSSCameraService {
  private static instance: FOSSCameraService;
  private cameraModule: FOSSCameraModule;
  private eventEmitter: NativeEventEmitter;
  private isInitialized: boolean = false;
  private currentCameraId: string | null = null;
  private availableCameras: FOSSCameraInfo[] = [];

  private constructor() {
    this.cameraModule = FOSSCamera as FOSSCameraModule;
    this.eventEmitter = new NativeEventEmitter(FOSSCamera);
  }

  public static getInstance(): FOSSCameraService {
    if (!FOSSCameraService.instance) {
      FOSSCameraService.instance = new FOSSCameraService();
    }
    return FOSSCameraService.instance;
  }

  /**
   * Check if camera permission is granted
   */
  public async checkPermission(): Promise<boolean> {
    return this.cameraModule.checkCameraPermission();
  }

  /**
   * Initialize the camera service
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    const hasPermission = await this.checkPermission();
    if (!hasPermission) {
      throw new Error("Camera permission not granted");
    }

    this.availableCameras = await this.cameraModule.getAvailableCameras();

    // Default to back camera if available
    const backCamera = this.availableCameras.find((cam) => cam.type === "back");
    if (backCamera) {
      await this.cameraModule.openCamera(backCamera.id);
      this.currentCameraId = backCamera.id;
    } else if (this.availableCameras.length > 0) {
      // Fallback to first available camera
      await this.cameraModule.openCamera(this.availableCameras[0].id);
      this.currentCameraId = this.availableCameras[0].id;
    } else {
      throw new Error("No cameras available");
    }

    this.isInitialized = true;
  }

  /**
   * Take a picture
   */
  public async takePicture(): Promise<FOSSCaptureResult> {
    if (!this.isInitialized) {
      throw new Error("Camera not initialized");
    }
    return this.cameraModule.takePicture();
  }

  /**
   * Switch between front and back cameras
   */
  public async switchCamera(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error("Camera not initialized");
    }
    await this.cameraModule.switchCamera();
  }

  /**
   * Set flash on/off
   */
  public async setFlash(enabled: boolean): Promise<void> {
    if (!this.isInitialized) {
      throw new Error("Camera not initialized");
    }
    await this.cameraModule.setFlash(enabled);
  }

  /**
   * Get available cameras
   */
  public getAvailableCameras(): FOSSCameraInfo[] {
    return this.availableCameras;
  }

  /**
   * Get current camera info
   */
  public getCurrentCamera(): FOSSCameraInfo | null {
    if (!this.currentCameraId) {
      return null;
    }
    return this.availableCameras.find((cam) =>
      cam.id === this.currentCameraId
    ) || null;
  }

  /**
   * Check if camera is front-facing
   */
  public isFrontCamera(): boolean {
    const currentCamera = this.getCurrentCamera();
    return currentCamera?.type === "front";
  }

  /**
   * Check if camera is back-facing
   */
  public isBackCamera(): boolean {
    const currentCamera = this.getCurrentCamera();
    return currentCamera?.type === "back";
  }

  /**
   * Cleanup and close camera
   */
  public async cleanup(): Promise<void> {
    if (this.isInitialized) {
      await this.cameraModule.closeCamera();
      this.isInitialized = false;
      this.currentCameraId = null;
    }
  }

  /**
   * Add event listener
   */
  public addListener(eventName: string, listener: (event: any) => void) {
    return this.eventEmitter.addListener(eventName, listener);
  }

  /**
   * Remove all listeners
   */
  public removeAllListeners(eventName?: string) {
    if (eventName) {
      this.eventEmitter.removeAllListeners(eventName);
    } else {
      this.eventEmitter.removeAllListeners();
    }
  }
}

export default FOSSCameraService.getInstance();
