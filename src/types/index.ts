export type CameraFacing = "back" | "front";

export type FlashMode = "off" | "on";

export type Location = {
  id: string;
  name: string;
  path: string;
};

export type AsyncStorageInterface = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

export type HapticFeedbackStyle = "Light" | "Medium" | "Heavy";

export type NotificationFeedbackType = "Success" | "Warning" | "Error";
