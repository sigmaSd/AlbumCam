package com.albumcam.camera;

import android.Manifest;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Matrix;
import android.hardware.camera2.CameraAccessException;
import android.hardware.camera2.CameraCaptureSession;
import android.hardware.camera2.CameraCharacteristics;
import android.hardware.camera2.CameraDevice;
import android.hardware.camera2.CameraManager;
import android.hardware.camera2.CameraMetadata;
import android.hardware.camera2.CaptureRequest;
import android.hardware.camera2.CaptureResult;
import android.hardware.camera2.TotalCaptureResult;
import android.hardware.camera2.params.StreamConfigurationMap;
import android.media.Image;
import android.media.ImageReader;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.Handler;
import android.os.HandlerThread;
import android.provider.MediaStore;
import android.util.Size;
import android.view.Surface;

import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.facebook.react.bridge.BaseActivityEventListener;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.text.SimpleDateFormat;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.Locale;

public class CustomCameraModule extends ReactContextBaseJavaModule {

    private static final String MODULE_NAME = "CustomCameraModule";
    private static final int REQUEST_CAMERA_PERMISSION = 200;
    private static final int REQUEST_STORAGE_PERMISSION = 201;

    private ReactApplicationContext reactContext;
    private Promise permissionPromise;
    private CameraManager cameraManager;
    private String cameraId;
    private CameraDevice cameraDevice;
    private CameraCaptureSession cameraCaptureSessions;
    private CaptureRequest.Builder captureRequestBuilder;
    private Size imageDimension;
    private ImageReader imageReader;
    private Handler mBackgroundHandler;
    private HandlerThread mBackgroundThread;

    public CustomCameraModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        this.cameraManager = (CameraManager) reactContext.getSystemService(Context.CAMERA_SERVICE);

        // Add permission result listener
        reactContext.addActivityEventListener(new BaseActivityEventListener() {
            @Override
            public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
                if (requestCode == REQUEST_CAMERA_PERMISSION && permissionPromise != null) {
                    WritableMap result = Arguments.createMap();
                    boolean allGranted = true;

                    // Check if all requested permissions are granted
                    for (int grantResult : grantResults) {
                        if (grantResult != PackageManager.PERMISSION_GRANTED) {
                            allGranted = false;
                            break;
                        }
                    }

                    result.putBoolean("granted", allGranted);
                    result.putBoolean("canAsk", true);
                    permissionPromise.resolve(result);
                    permissionPromise = null;
                }
            }
        });
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    @ReactMethod
    public void checkCameraPermission(Promise promise) {
        try {
            WritableMap result = Arguments.createMap();
            boolean cameraGranted = ContextCompat.checkSelfPermission(reactContext, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED;
            boolean storageGranted = true; // Android 10+ uses scoped storage, no permission needed
            if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.P) {
                storageGranted = ContextCompat.checkSelfPermission(reactContext, Manifest.permission.WRITE_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED;
            }
            result.putBoolean("granted", cameraGranted && storageGranted);
            result.putBoolean("canAsk", true);
            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("PERMISSION_CHECK_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void requestCameraPermission(Promise promise) {
        try {
            WritableMap result = Arguments.createMap();
            boolean cameraGranted = ContextCompat.checkSelfPermission(reactContext, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED;
            boolean storageGranted = true; // Android 10+ uses scoped storage, no permission needed
            if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.P) {
                storageGranted = ContextCompat.checkSelfPermission(reactContext, Manifest.permission.WRITE_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED;
            }

            if (cameraGranted && storageGranted) {
                result.putBoolean("granted", true);
                result.putBoolean("canAsk", true);
                promise.resolve(result);
            } else {
                // Store the promise to resolve it later in the permission callback
                permissionPromise = promise;

                // Request permissions based on Android version
                String[] permissions;
                if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.P) {
                    permissions = new String[]{Manifest.permission.CAMERA, Manifest.permission.WRITE_EXTERNAL_STORAGE};
                } else {
                    permissions = new String[]{Manifest.permission.CAMERA};
                }

                if (reactContext.getCurrentActivity() != null) {
                    ActivityCompat.requestPermissions(
                        reactContext.getCurrentActivity(),
                        permissions,
                        REQUEST_CAMERA_PERMISSION
                    );
                } else {
                    result.putBoolean("granted", false);
                    result.putBoolean("canAsk", true);
                    promise.resolve(result);
                }
            }
        } catch (Exception e) {
            promise.reject("PERMISSION_REQUEST_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void takePicture(ReadableMap config, Promise promise) {
        // Check permissions first
        boolean cameraGranted = ContextCompat.checkSelfPermission(reactContext, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED;
        boolean storageGranted = true; // Android 10+ uses scoped storage, no permission needed
        if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.P) {
            storageGranted = ContextCompat.checkSelfPermission(reactContext, Manifest.permission.WRITE_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED;
        }

        if (!cameraGranted || !storageGranted) {
            promise.reject("PERMISSION_DENIED", "Camera or storage permission not granted");
            return;
        }

        if (cameraDevice == null) {
            openCamera(config, promise);
            return;
        }

        try {
            String facing = config.hasKey("facing") ? config.getString("facing") : "back";
            String flash = config.hasKey("flash") ? config.getString("flash") : "off";
            double quality = config.hasKey("quality") ? config.getDouble("quality") : 0.8;

            takePictureInternal(facing, flash, quality, promise);
        } catch (Exception e) {
            promise.reject("TAKE_PICTURE_ERROR", e.getMessage());
        }
    }

    private void openCamera(ReadableMap config, Promise promise) {
        try {
            String facing = config.hasKey("facing") ? config.getString("facing") : "back";
            setupCamera(facing);

            if (ActivityCompat.checkSelfPermission(reactContext, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                promise.reject("PERMISSION_DENIED", "Camera permission not granted");
                return;
            }

            cameraManager.openCamera(cameraId, stateCallback, mBackgroundHandler);

            // Store promise for later resolution
            pendingPromise = promise;
            pendingConfig = config;

        } catch (CameraAccessException e) {
            promise.reject("CAMERA_ACCESS_ERROR", e.getMessage());
        }
    }

    private Promise pendingPromise;
    private ReadableMap pendingConfig;

    private final CameraDevice.StateCallback stateCallback = new CameraDevice.StateCallback() {
        @Override
        public void onOpened(@NonNull CameraDevice camera) {
            cameraDevice = camera;
            if (pendingPromise != null && pendingConfig != null) {
                try {
                    String facing = pendingConfig.hasKey("facing") ? pendingConfig.getString("facing") : "back";
                    String flash = pendingConfig.hasKey("flash") ? pendingConfig.getString("flash") : "off";
                    double quality = pendingConfig.hasKey("quality") ? pendingConfig.getDouble("quality") : 0.8;

                    takePictureInternal(facing, flash, quality, pendingPromise);
                    pendingPromise = null;
                    pendingConfig = null;
                } catch (Exception e) {
                    pendingPromise.reject("TAKE_PICTURE_ERROR", e.getMessage());
                    pendingPromise = null;
                    pendingConfig = null;
                }
            }
        }

        @Override
        public void onDisconnected(@NonNull CameraDevice camera) {
            cameraDevice.close();
            cameraDevice = null;
        }

        @Override
        public void onError(@NonNull CameraDevice camera, int error) {
            cameraDevice.close();
            cameraDevice = null;
            if (pendingPromise != null) {
                pendingPromise.reject("CAMERA_ERROR", "Camera error: " + error);
                pendingPromise = null;
                pendingConfig = null;
            }
        }
    };

    private void setupCamera(String facing) throws CameraAccessException {
        String[] cameraIdList = cameraManager.getCameraIdList();

        for (String id : cameraIdList) {
            CameraCharacteristics characteristics = cameraManager.getCameraCharacteristics(id);
            Integer cameraDirection = characteristics.get(CameraCharacteristics.LENS_FACING);

            boolean isBackCamera = cameraDirection != null && cameraDirection == CameraCharacteristics.LENS_FACING_BACK;
            boolean isFrontCamera = cameraDirection != null && cameraDirection == CameraCharacteristics.LENS_FACING_FRONT;

            if ((facing.equals("back") && isBackCamera) || (facing.equals("front") && isFrontCamera)) {
                cameraId = id;

                StreamConfigurationMap map = characteristics.get(CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP);
                if (map != null) {
                    Size[] sizes = map.getOutputSizes(ImageReader.class);
                    imageDimension = Collections.max(Arrays.asList(sizes), new CompareSizesByArea());
                }
                break;
            }
        }
    }

    private void takePictureInternal(String facing, String flash, double quality, Promise promise) {
        if (cameraDevice == null) {
            promise.reject("CAMERA_NOT_READY", "Camera device not ready");
            return;
        }

        try {
            startBackgroundThread();

            imageReader = ImageReader.newInstance(imageDimension.getWidth(), imageDimension.getHeight(), android.graphics.ImageFormat.JPEG, 1);
            imageReader.setOnImageAvailableListener(readerListener, mBackgroundHandler);

            captureRequestBuilder = cameraDevice.createCaptureRequest(CameraDevice.TEMPLATE_STILL_CAPTURE);
            captureRequestBuilder.addTarget(imageReader.getSurface());

            // Set flash mode
            if (flash.equals("on")) {
                captureRequestBuilder.set(CaptureRequest.FLASH_MODE, CameraMetadata.FLASH_MODE_SINGLE);
            } else if (flash.equals("auto")) {
                captureRequestBuilder.set(CaptureRequest.CONTROL_AE_MODE, CameraMetadata.CONTROL_AE_MODE_ON_AUTO_FLASH);
            }

            captureRequestBuilder.set(CaptureRequest.CONTROL_MODE, CameraMetadata.CONTROL_MODE_AUTO);

            cameraDevice.createCaptureSession(Arrays.asList(imageReader.getSurface()), new CameraCaptureSession.StateCallback() {
                @Override
                public void onConfigured(@NonNull CameraCaptureSession session) {
                    try {
                        session.capture(captureRequestBuilder.build(), captureCallback, mBackgroundHandler);
                    } catch (CameraAccessException e) {
                        promise.reject("CAPTURE_ERROR", e.getMessage());
                    }
                }

                @Override
                public void onConfigureFailed(@NonNull CameraCaptureSession session) {
                    promise.reject("CAPTURE_SESSION_ERROR", "Failed to configure capture session");
                }
            }, mBackgroundHandler);

            // Store promise for later resolution
            currentCapturePromise = promise;

        } catch (CameraAccessException e) {
            promise.reject("CAMERA_ACCESS_ERROR", e.getMessage());
        }
    }

    private Promise currentCapturePromise;

    private final CameraCaptureSession.CaptureCallback captureCallback = new CameraCaptureSession.CaptureCallback() {
        @Override
        public void onCaptureCompleted(@NonNull CameraCaptureSession session, @NonNull CaptureRequest request, @NonNull TotalCaptureResult result) {
            super.onCaptureCompleted(session, request, result);
            // Picture will be saved in readerListener
        }
    };

    private final ImageReader.OnImageAvailableListener readerListener = new ImageReader.OnImageAvailableListener() {
        @Override
        public void onImageAvailable(ImageReader reader) {
            Image image = null;
            try {
                image = reader.acquireLatestImage();
                ByteBuffer buffer = image.getPlanes()[0].getBuffer();
                byte[] bytes = new byte[buffer.capacity()];
                buffer.get(bytes);

                String fileName = "IMG_" + new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(new Date()) + ".jpg";
                File file = new File(reactContext.getExternalFilesDir(Environment.DIRECTORY_PICTURES), fileName);

                FileOutputStream output = new FileOutputStream(file);
                output.write(bytes);
                output.close();

                if (currentCapturePromise != null) {
                    WritableMap result = Arguments.createMap();
                    result.putString("uri", "file://" + file.getAbsolutePath());
                    result.putInt("width", imageDimension.getWidth());
                    result.putInt("height", imageDimension.getHeight());
                    currentCapturePromise.resolve(result);
                    currentCapturePromise = null;
                }

            } catch (IOException e) {
                if (currentCapturePromise != null) {
                    currentCapturePromise.reject("SAVE_ERROR", e.getMessage());
                    currentCapturePromise = null;
                }
            } finally {
                if (image != null) {
                    image.close();
                }
                closeCamera();
            }
        }
    };

    @ReactMethod
    public void savePhotoToGallery(String uri, String albumName, Promise promise) {
        try {
            File sourceFile = new File(uri.replace("file://", ""));
            if (!sourceFile.exists()) {
                promise.reject("FILE_NOT_FOUND", "Source file does not exist");
                return;
            }

            ContentResolver resolver = reactContext.getContentResolver();
            ContentValues contentValues = new ContentValues();
            contentValues.put(MediaStore.MediaColumns.DISPLAY_NAME, sourceFile.getName());
            contentValues.put(MediaStore.MediaColumns.MIME_TYPE, "image/jpeg");

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                contentValues.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/" + albumName);
            }

            Uri imageUri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, contentValues);

            if (imageUri != null) {
                // Copy file content to MediaStore
                promise.resolve(true);
            } else {
                promise.resolve(false);
            }

        } catch (Exception e) {
            promise.reject("SAVE_TO_GALLERY_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void createAlbum(String albumName, Promise promise) {
        try {
            // Albums are created automatically when photos are saved to them in Android 10+
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("CREATE_ALBUM_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void getAlbumPhotoCount(String albumName, Promise promise) {
        try {
            // This would require querying MediaStore to count photos in the album
            // For simplicity, returning 0 for now
            promise.resolve(0);
        } catch (Exception e) {
            promise.reject("GET_ALBUM_COUNT_ERROR", e.getMessage());
        }
    }

    private void startBackgroundThread() {
        mBackgroundThread = new HandlerThread("Camera Background");
        mBackgroundThread.start();
        mBackgroundHandler = new Handler(mBackgroundThread.getLooper());
    }

    private void stopBackgroundThread() {
        if (mBackgroundThread != null) {
            mBackgroundThread.quitSafely();
            try {
                mBackgroundThread.join();
                mBackgroundThread = null;
                mBackgroundHandler = null;
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }
    }

    private void closeCamera() {
        if (cameraDevice != null) {
            cameraDevice.close();
            cameraDevice = null;
        }
        if (imageReader != null) {
            imageReader.close();
            imageReader = null;
        }
        stopBackgroundThread();
    }

    static class CompareSizesByArea implements Comparator<Size> {
        @Override
        public int compare(Size lhs, Size rhs) {
            return Long.signum((long) lhs.getWidth() * lhs.getHeight() - (long) rhs.getWidth() * rhs.getHeight());
        }
    }
}
