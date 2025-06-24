package com.sigmacool.albumcam.camera

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.ImageFormat
import android.hardware.camera2.*
import android.hardware.camera2.params.OutputConfiguration
import android.hardware.camera2.params.SessionConfiguration
import android.media.Image
import android.media.ImageReader
import android.os.Handler
import android.os.HandlerThread
import android.util.Log
import android.util.Size
import android.view.Surface
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.util.*
import java.util.concurrent.Executor
import java.util.concurrent.Executors

class FOSSCameraModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "FOSSCamera"
        private const val CAMERA_PERMISSION_REQUEST_CODE = 1001
    }

    private val context: ReactApplicationContext = reactContext
    private var cameraManager: CameraManager? = null
    private var cameraDevice: CameraDevice? = null
    private var cameraCaptureSession: CameraCaptureSession? = null
    private var backgroundHandler: Handler? = null
    private var backgroundThread: HandlerThread? = null
    private var imageReader: ImageReader? = null
    private var currentCameraId: String = "0" // Default to back camera
    private var isFlashOn: Boolean = false

    private val executor: Executor = Executors.newSingleThreadExecutor()

    override fun getName(): String {
        return "FOSSCamera"
    }

    init {
        cameraManager = context.getSystemService(Context.CAMERA_SERVICE) as CameraManager
    }

    @ReactMethod
    fun checkCameraPermission(promise: Promise) {
        val permission = ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA)
        promise.resolve(permission == PackageManager.PERMISSION_GRANTED)
    }

    @ReactMethod
    fun getAvailableCameras(promise: Promise) {
        try {
            val cameraManager = this.cameraManager ?: run {
                promise.reject("CAMERA_ERROR", "Camera manager not available")
                return
            }

            val cameras = WritableNativeArray()
            for (cameraId in cameraManager.cameraIdList) {
                val characteristics = cameraManager.getCameraCharacteristics(cameraId)
                val facing = characteristics.get(CameraCharacteristics.LENS_FACING)

                val camera = WritableNativeMap()
                camera.putString("id", cameraId)
                camera.putString("type", when (facing) {
                    CameraCharacteristics.LENS_FACING_FRONT -> "front"
                    CameraCharacteristics.LENS_FACING_BACK -> "back"
                    else -> "external"
                })
                cameras.pushMap(camera)
            }
            promise.resolve(cameras)
        } catch (e: Exception) {
            Log.e(TAG, "Error getting available cameras", e)
            promise.reject("CAMERA_ERROR", e.message)
        }
    }

    @ReactMethod
    fun openCamera(cameraId: String, promise: Promise) {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            promise.reject("PERMISSION_ERROR", "Camera permission not granted")
            return
        }

        try {
            currentCameraId = cameraId
            startBackgroundThread()

            val cameraManager = this.cameraManager ?: run {
                promise.reject("CAMERA_ERROR", "Camera manager not available")
                return
            }

            cameraManager.openCamera(cameraId, object : CameraDevice.StateCallback() {
                override fun onOpened(camera: CameraDevice) {
                    cameraDevice = camera
                    createCameraPreviewSession()
                    promise.resolve(null)
                }

                override fun onDisconnected(camera: CameraDevice) {
                    camera.close()
                    cameraDevice = null
                    promise.reject("CAMERA_ERROR", "Camera disconnected")
                }

                override fun onError(camera: CameraDevice, error: Int) {
                    camera.close()
                    cameraDevice = null
                    promise.reject("CAMERA_ERROR", "Camera error: $error")
                }
            }, backgroundHandler)

        } catch (e: Exception) {
            Log.e(TAG, "Error opening camera", e)
            promise.reject("CAMERA_ERROR", e.message)
        }
    }

    @ReactMethod
    fun closeCamera(promise: Promise) {
        try {
            cameraCaptureSession?.close()
            cameraCaptureSession = null

            cameraDevice?.close()
            cameraDevice = null

            imageReader?.close()
            imageReader = null

            stopBackgroundThread()
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "Error closing camera", e)
            promise.reject("CAMERA_ERROR", e.message)
        }
    }

    @ReactMethod
    fun takePicture(promise: Promise) {
        val device = cameraDevice
        val session = cameraCaptureSession

        if (device == null || session == null) {
            promise.reject("CAMERA_ERROR", "Camera not ready")
            return
        }

        try {
            // Set up image reader for capture
            val characteristics = cameraManager?.getCameraCharacteristics(currentCameraId)
            val map = characteristics?.get(CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP)
            val jpegSizes = map?.getOutputSizes(ImageFormat.JPEG)
            val largestSize = jpegSizes?.maxByOrNull { it.width * it.height } ?: Size(1920, 1080)

            val reader = ImageReader.newInstance(largestSize.width, largestSize.height, ImageFormat.JPEG, 1)

            reader.setOnImageAvailableListener({ reader ->
                val image = reader.acquireLatestImage()
                saveImage(image, promise)
            }, backgroundHandler)

            val outputSurfaces = listOf(reader.surface)
            val captureBuilder = device.createCaptureRequest(CameraDevice.TEMPLATE_STILL_CAPTURE)
            captureBuilder.addTarget(reader.surface)

            // Set flash if enabled
            if (isFlashOn) {
                captureBuilder.set(CaptureRequest.FLASH_MODE, CaptureRequest.FLASH_MODE_SINGLE)
            }

            // Auto focus and exposure
            captureBuilder.set(CaptureRequest.CONTROL_AF_TRIGGER, CameraMetadata.CONTROL_AF_TRIGGER_START)
            captureBuilder.set(CaptureRequest.CONTROL_AE_PRECAPTURE_TRIGGER, CameraMetadata.CONTROL_AE_PRECAPTURE_TRIGGER_START)

            session.capture(captureBuilder.build(), object : CameraCaptureSession.CaptureCallback() {
                override fun onCaptureCompleted(session: CameraCaptureSession, request: CaptureRequest, result: TotalCaptureResult) {
                    Log.d(TAG, "Picture captured successfully")
                }

                override fun onCaptureFailed(session: CameraCaptureSession, request: CaptureRequest, failure: CaptureFailure) {
                    promise.reject("CAPTURE_ERROR", "Failed to capture picture")
                }
            }, backgroundHandler)

        } catch (e: Exception) {
            Log.e(TAG, "Error taking picture", e)
            promise.reject("CAMERA_ERROR", e.message)
        }
    }

    @ReactMethod
    fun switchCamera(promise: Promise) {
        try {
            val cameraManager = this.cameraManager ?: run {
                promise.reject("CAMERA_ERROR", "Camera manager not available")
                return
            }

            // Find the opposite camera
            val cameraIds = cameraManager.cameraIdList
            var newCameraId: String? = null

            for (id in cameraIds) {
                val characteristics = cameraManager.getCameraCharacteristics(id)
                val facing = characteristics.get(CameraCharacteristics.LENS_FACING)
                val currentCharacteristics = cameraManager.getCameraCharacteristics(currentCameraId)
                val currentFacing = currentCharacteristics.get(CameraCharacteristics.LENS_FACING)

                if (facing != currentFacing) {
                    newCameraId = id
                    break
                }
            }

            if (newCameraId != null) {
                closeCamera(object : Promise {
                    override fun resolve(value: Any?) {
                        openCamera(newCameraId, promise)
                    }
                    override fun reject(code: String?, message: String?) {
                        promise.reject(code, message)
                    }
                    override fun reject(code: String?, throwable: Throwable?) {
                        promise.reject(code, throwable)
                    }
                    override fun reject(code: String?, message: String?, throwable: Throwable?) {
                        promise.reject(code, message, throwable)
                    }
                    override fun reject(throwable: Throwable?) {
                        promise.reject(throwable)
                    }
                })
            } else {
                promise.reject("CAMERA_ERROR", "No alternative camera found")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error switching camera", e)
            promise.reject("CAMERA_ERROR", e.message)
        }
    }

    @ReactMethod
    fun setFlash(enabled: Boolean, promise: Promise) {
        try {
            isFlashOn = enabled
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "Error setting flash", e)
            promise.reject("CAMERA_ERROR", e.message)
        }
    }

    private fun createCameraPreviewSession() {
        // This is a minimal implementation - in a full app you'd create a preview surface
        // For now, we'll just prepare for capture
        Log.d(TAG, "Camera preview session created (minimal implementation)")
    }

    private fun saveImage(image: Image, promise: Promise) {
        val buffer = image.planes[0].buffer
        val bytes = ByteArray(buffer.remaining())
        buffer.get(bytes)

        try {
            val picturesDir = File(context.getExternalFilesDir(null), "Pictures")
            if (!picturesDir.exists()) {
                picturesDir.mkdirs()
            }

            val fileName = "IMG_${System.currentTimeMillis()}.jpg"
            val file = File(picturesDir, fileName)

            FileOutputStream(file).use { output ->
                output.write(bytes)
            }

            val result = WritableNativeMap()
            result.putString("uri", "file://${file.absolutePath}")
            result.putString("path", file.absolutePath)
            result.putInt("width", image.width)
            result.putInt("height", image.height)

            promise.resolve(result)

        } catch (e: IOException) {
            Log.e(TAG, "Error saving image", e)
            promise.reject("SAVE_ERROR", e.message)
        } finally {
            image.close()
        }
    }

    private fun startBackgroundThread() {
        backgroundThread = HandlerThread("CameraBackground").also { it.start() }
        backgroundHandler = Handler(backgroundThread?.looper ?: return)
    }

    private fun stopBackgroundThread() {
        backgroundThread?.quitSafely()
        try {
            backgroundThread?.join()
            backgroundThread = null
            backgroundHandler = null
        } catch (e: InterruptedException) {
            Log.e(TAG, "Error stopping background thread", e)
        }
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Required for RN built in Event Emitter Calls
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for RN built in Event Emitter Calls
    }
}
