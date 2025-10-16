// hooks/useCameraStream.ts
import { useState, useEffect, useRef, useCallback } from "react";
import React from "react"
import {
  getCameraAndMicrophoneStream,
  stopMediaStream,
} from "@/utils/recording/mediaUtils"; // Adjust path as needed

interface UseCameraStreamResult {
  videoRef: React.RefObject<HTMLVideoElement>;
  mediaStream: React.MutableRefObject<MediaStream | null>;
  isCameraReady: boolean;
  cameraError: string | null;
  fps: number;
  startCamera: () => Promise<MediaStream>;
  stopCamera: () => void;
  flipCamera: () => void;
}

export const useCameraStream = (autoStart = true): UseCameraStreamResult => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [fps, setFps] = useState(0);
const [facingMode, setFacingMode] = useState<"user" | "environment">(
  "environment"
);
  
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await getCameraAndMicrophoneStream({facingMode});
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      mediaStreamRef.current = stream;
      setIsCameraReady(true);
      return stream; // Return the MediaStream object
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setCameraError(err.message);
      setIsCameraReady(false);
      throw err; // Re-throw the error
    }
  }, []);

  const stopCamera = useCallback(() => {
    stopMediaStream(mediaStreamRef.current);
    mediaStreamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraReady(false);
  }, []);

  // FPS Counter
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animationFrameId: number;

    const calculateFps = () => {
      const currentTime = performance.now();
      frameCount++;
      if (currentTime - lastTime >= 1000) {
        setFps(frameCount);
        frameCount = 0;
        lastTime = currentTime;
      }
      animationFrameId = requestAnimationFrame(calculateFps);
    };

    if (isCameraReady) {
      animationFrameId = requestAnimationFrame(calculateFps);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isCameraReady]);

  useEffect(() => {
    if (autoStart) {
      startCamera();
    }
    return () => {
      stopCamera(); // Ensure camera is stopped on unmount
    };
  }, [autoStart, startCamera, stopCamera]);

const flipCamera = useCallback(async () => {
  try {
    // Stop existing tracks first
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    // Pause video before swapping stream
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    // Toggle facingMode
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));

    // Start new stream after small delay to avoid race conditions
    const newStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: facingMode === "user" ? "environment" : "user" },
      audio: true,
    });

    mediaStreamRef.current = newStream;
    if (videoRef.current) {
      videoRef.current.srcObject = newStream;
      await videoRef.current.play(); // resume playback
    }
  } catch (err) {
    console.error("Error flipping camera:", err);
    setCameraError(err as string);
  }
}, [facingMode, videoRef]);

 return {
   videoRef: videoRef as React.RefObject<HTMLVideoElement>,
   mediaStream: mediaStreamRef,
   isCameraReady,
   cameraError,
   fps,
   startCamera,
   stopCamera,
   flipCamera,
 };
};
