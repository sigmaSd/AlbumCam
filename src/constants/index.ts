export const STORAGE_KEYS = {
  LOCATIONS: "@camera_locations",
  SELECTED_LOCATION: "@selected_location",
} as const;

export const DEFAULT_LOCATION = {
  id: "1",
  name: "Default",
  path: "DCIM/CameraApp",
} as const;

export const CAMERA_CONFIG = {
  DEFAULT_ZOOM: 0,
  MAX_ZOOM: 1,
  MIN_ZOOM: 0,
  ZOOM_STEP: 0.25,
} as const;

export const ANIMATION_DURATION = {
  SHUTTER: 100,
  CONTROLS_FADE: 200,
} as const;
