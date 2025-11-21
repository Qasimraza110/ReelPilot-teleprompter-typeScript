// utils/mediaUtils.ts


export const getCameraAndMicrophoneStream = async({facingMode}: {facingMode: string}): Promise<MediaStream> => {


  try {
    const devices = await navigator.mediaDevices.enumerateDevices();   
    const audioInputs = devices.filter((d) => d.kind === "audioinput");
    
    const constraints = {
  video: {
    // Request the highest common high-definition resolution.
    // Use 'ideal' so the browser attempts to provide this, but falls back if not possible.
    width: { ideal: 3840 }, // 4K width
    height: { ideal: 2160 }, // 4K height
    // Request a high frame rate for smooth video.
    frameRate: { ideal: 60 }, // 60 frames per second

    // You can also consider adding:
    facingMode: facingMode , // 'user' for front camera, 'environment' for rear camera
                                   // This is useful for mobile devices to explicitly choose.
                                   // If omitted, browser defaults to front camera for 'user' facing if available.
  },
  audio:
    audioInputs.length > 0 ? { deviceId: audioInputs[0].deviceId } : true,
};

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    console.log("Media stream obtained successfully.");
    return stream;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    console.error("Error accessing camera/microphone:", err.name, err.message);
    let errorMessage =
      "An unexpected error occurred accessing your camera/microphone.";
    switch (err.name) {
      case "NotAllowedError":
        errorMessage =
          "Permission Denied: Please allow camera and microphone access in your browser settings and refresh.";
        break;
      case "NotFoundError":
        errorMessage =
          "No Camera or Microphone Found: Please ensure devices are connected and enabled.";
        break;
      case "NotReadableError":
        errorMessage =
          "Device In Use: Your camera or microphone might be used by another application. Please close other apps and try again.";
        break;
      case "OverconstrainedError":
        errorMessage =
          "Device Not Supported: The requested camera/microphone settings (e.g., resolution) are not supported by your device.";
        break;
      default:
        errorMessage = `An unexpected media error occurred: ${err.name} - ${err.message}`;
        break;
    }
    throw new Error(errorMessage);
  }
};



export const stopMediaStream = (stream: MediaStream | null) => {
  if (stream) {
    stream.getTracks().forEach((track) => {
      console.log(`Stopping track: kind=${track.kind}, id=${track.id}`);
      track.stop();
    });
    console.log("Media stream tracks stopped.");
  } else {
    console.log("No active media stream to stop.");
  }
};

export const prewarmMicrophone = async (): Promise<void> => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    console.log("Microphone pre-warmed successfully.");
  } catch (err) {
    console.warn(
      "Pre-warm failed - will try again when recording starts:",
      err
    );
  }
};

