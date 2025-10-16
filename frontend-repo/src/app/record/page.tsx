// app/record/[scriptId]/RecordPageContent.tsx
"use client";
import "regenerator-runtime/runtime";

import { useState, useEffect, useCallback, Suspense, useRef } from "react";
import { Loader } from "lucide-react";
import { useRouter } from "next/navigation";

// Hooks
import { useCameraStream } from "@/hooks/record/useCameraStream";
import { useMediaRecorder } from "@/hooks/record/useMediaRecorder";
import { useScriptFetch } from "@/hooks/record/useScriptFetch";
import { useSpeechRecognitionProcessor } from "@/hooks/record/useSpeechRecognitionProcessor";
import { useUserSettings } from "@/hooks/record/useUserSettings";

// Components
import { TeleprompterDisplay } from "@/components/record/TeleprompterDisplay";
import { ControlButtons } from "@/components/record/ControlButtons";
import { InitialLoadOverlay } from "@/components/record/InitialLoadOverlay";
import { StatusIndicators } from "@/components/record/StatusIndicators";
import { DebugOverlay } from "./DebugOverlay";
import AnalysisModal from "@/components/record/AnalysisModal";
import { getCookie } from "@/actions/cookie";
import { GuidanceOverlay } from "@/components/record/GuidanceOverlay";
import { GuidanceControls } from "@/components/record/GuidanceControls";
import { EffectsPicker, EffectKind } from "@/components/record/EffectsPicker";
import { useFramingAndLighting } from "@/hooks/record/useFramingAndLighting";

// IndexedDB Utility
import { addRecording } from "@/utils/indexedDB/recordings";

function RecordPageContent() {
  const router = useRouter();

  const {
    scriptLines,
    isLoading: isLoadingScript,
    error: scriptError,
    scriptId,
  } = useScriptFetch();
  const { settings, loadingSettings } = useUserSettings();

  // Combine loading and error states for main UI logic
  const isLoading = isLoadingScript || loadingSettings;
  const error = scriptError;
  const devTesting = settings?.devTesting || false; // Default to false if settings not loaded yet

  const [recordingStatus, setRecordingStatus] = useState<
    "idle" | "starting" | "recording" | "stopping"
  >("idle");
  const [isRecording, setIsRecording] = useState(false);
  const [finalRecordingData, setFinalRecordingData] = useState<{
    blob: Blob;
    duration: number;
    finalTranscript: string;
  } | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    transcript?: string;
    metrics?: any;
  } | null>(null);
  const [uploadedRecordingUrl, setUploadedRecordingUrl] = useState<
    string | null
  >(null);
  const [uploadedRecordingId, setUploadedRecordingId] = useState<string | null>(
    null
  );

  // Custom Hooks
  const {
    videoRef,
    mediaStream,
    isCameraReady,
    cameraError,
    fps,
    startCamera,
    stopCamera,
    flipCamera,
  } = useCameraStream(false); // Don't auto-start here, let main component control
  const {
    recordedBlob,
    recordingDuration,
    startRecording: startMediaRecording,
    stopRecording: stopMediaRecording,
    resetRecording: resetMediaRecording,
    mediaRecorderError,
  } = useMediaRecorder();

  const {
    transcript,
    listening,
    browserSupportsSpeechRecognition,
    currentLineIndex,
    accumulatedFinalTranscript,
    resetSpeechRecognition,
    stopSpeechRecognition,
    speechRecognitionError,
    sendAudioData,
    deepgramBackendReady,
  } = useSpeechRecognitionProcessor(
    scriptLines,
    isRecording, // Pass isRecording state to the hook
    useCallback(
      (lineIndex: number) => console.log(`Line ${lineIndex} completed!`),
      []
    ), // Optional: Callback for line completion
    useCallback(() => {
      console.log(
        "--- onRecordingEnd (from useSpeechRecognitionProcessor) triggered. ---"
      );
      console.log("    -> Setting recordingStatus to 'stopping'.");
      setRecordingStatus("stopping"); // Signal the stopping phase
      console.log("    -> Calling stopMediaRecording().");
      stopMediaRecording(); // This will eventually set recordedBlob and trigger the useEffect below
      // DO NOT setIsRecording(false) here. Let the useEffect handle it after final data is ready.
    }, [stopMediaRecording])
  );

  const [autoAdjust, setAutoAdjust] = useState(true);
  const [manualBrightness, setManualBrightness] = useState(1);
  const [manualContrast, setManualContrast] = useState(1);
  const [effect, setEffect] = useState<EffectKind>("none");
  const [effectStrength, setEffectStrength] = useState(0.5);
  const [showMobileEffects, setShowMobileEffects] = useState(false);
  const [showMobileAdjust, setShowMobileAdjust] = useState(false);
  const [liveWpm, setLiveWpm] = useState<number | undefined>(undefined);
  const [liveFiller, setLiveFiller] = useState<number | undefined>(undefined);
  const [liveAccuracy, setLiveAccuracy] = useState<number | undefined>(
    undefined
  );

  // Pull live metrics written by the hook (simple bridge without prop drilling through the hook API)
  useEffect(() => {
    const id = setInterval(() => {
      // @ts-expect-error window bridges
      if (typeof (window as any).__LIVE_WPM__ === "number")
        setLiveWpm((window as any).__LIVE_WPM__);
      // @ts-expect-error window bridges
      if (typeof (window as any).__LIVE_FILLER__ === "number")
        setLiveFiller((window as any).__LIVE_FILLER__);
      // @ts-expect-error window bridges
      if (typeof (window as any).__LIVE_ACCURACY__ === "number")
        setLiveAccuracy((window as any).__LIVE_ACCURACY__);
    }, 300);
    return () => clearInterval(id);
  }, []);

  const { guidance, filterCss, landmarks, brightness, contrast } =
    useFramingAndLighting({
      videoEl:
        typeof window !== "undefined"
          ? (videoRef.current as HTMLVideoElement | null)
          : null,
      enabled: isCameraReady,
      analysisFps: 12,
      cooldownMs: 1200,
      manualBrightness: autoAdjust ? null : manualBrightness,
      manualContrast: autoAdjust ? null : manualContrast,
    });

  // Canvas-based processing pipeline to bake visual effects into the recorded video
  const processedCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const processedStreamRef = useRef<MediaStream | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const cleanupProcessedRef = useRef<(() => void) | null>(null);

  const getCombinedFilterCss = useCallback(() => {
    const effectCss =
      effect === "grayscale"
        ? `grayscale(${effectStrength})`
        : effect === "sepia"
        ? `sepia(${effectStrength})`
        : effect === "warm"
        ? `saturate(${1 + effectStrength * 0.4}) hue-rotate(${
            effectStrength * -10
          }deg)`
        : effect === "cool"
        ? `saturate(${1 + effectStrength * 0.2}) hue-rotate(${
            effectStrength * 10
          }deg)`
        : effect === "cinematic"
        ? `contrast(${1 + effectStrength * 0.2}) saturate(${
            1 + effectStrength * 0.2
          }) brightness(${1 - effectStrength * 0.05})`
        : effect === "soften"
        ? `blur(${Math.max(0, effectStrength * 1.2)}px) brightness(${
            1 + effectStrength * 0.05
          })`
        : effect === "clarity"
        ? `contrast(${1 + effectStrength * 0.35}) saturate(${
            1 + effectStrength * 0.15
          })`
        : "";
    return `${filterCss ?? ""} ${effectCss}`.trim();
  }, [filterCss, effect, effectStrength]);

  const setupProcessedStream = useCallback(
    (baseStream: MediaStream): MediaStream | null => {
      const videoEl = videoRef.current as HTMLVideoElement | null;
      if (!videoEl) return null;

      const ensureDimensions = () => {
        const width = videoEl.videoWidth || 1280;
        const height = videoEl.videoHeight || 720;
        return { width, height };
      };

      const { width, height } = ensureDimensions();
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      processedCanvasRef.current = canvas;

      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      let running = true;
      const drawFrame = () => {
        if (!running) return;
        // Resize if underlying video dimensions become available/changed
        const vw = videoEl.videoWidth;
        const vh = videoEl.videoHeight;
        if (vw && vh && (vw !== canvas.width || vh !== canvas.height)) {
          canvas.width = vw;
          canvas.height = vh;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.filter = getCombinedFilterCss();
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        if (effect === "vignette") {
          const grd = ctx.createRadialGradient(
            canvas.width / 2,
            canvas.height / 2,
            Math.max(canvas.width, canvas.height) *
              (0.6 - effectStrength * 0.2),
            canvas.width / 2,
            canvas.height / 2,
            Math.max(canvas.width, canvas.height) * 0.55
          );
          const alpha = 0.35 + effectStrength * 0.35;
          grd.addColorStop(0, "rgba(0,0,0,0)");
          grd.addColorStop(1, `rgba(0,0,0,${alpha})`);
          ctx.save();
          ctx.filter = "none";
          ctx.fillStyle = grd;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.restore();
        }
        rafIdRef.current = requestAnimationFrame(drawFrame);
      };
      drawFrame();

      const fpsToCapture = Math.max(12, Math.min(60, Math.round(fps || 30)));
      const processedStream = canvas.captureStream(fpsToCapture);
      // Add original audio tracks
      baseStream.getAudioTracks().forEach((t) => processedStream.addTrack(t));

      processedStreamRef.current = processedStream;
      cleanupProcessedRef.current = () => {
        running = false;
        if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current);
        processedStream.getTracks().forEach((tr) => tr.stop());
        processedStreamRef.current = null;
        processedCanvasRef.current = null;
        cleanupProcessedRef.current = null;
      };

      return processedStream;
    },
    [videoRef, fps, getCombinedFilterCss, effect, effectStrength]
  );

  // Consolidated error handling
  const overallError =
    error || cameraError || mediaRecorderError || speechRecognitionError;

  // --- Camera & Recording Flow Management ---
  useEffect(() => {
    // Start camera for preview if not recording, no errors, script loaded, and camera not yet ready
    if (
      !isLoading &&
      !overallError &&
      scriptLines.length > 0 &&
      !isRecording &&
      !isCameraReady
    ) {
      startCamera();
    }
    // Stop camera only if there's an error, no script, or loading, AND camera is currently active
    // IMPORTANT: We REMOVED the `!isRecording` condition here, so camera stays on when recording starts
    else if (
      (overallError || scriptLines.length === 0 || isLoading) &&
      isCameraReady
    ) {
      stopCamera();
    }
  }, [
    isLoading,
    overallError,
    scriptLines.length,
    isRecording,
    isCameraReady,
    startCamera,
    stopCamera,
  ]);

  // Handle final recording data once MediaRecorder stops
  useEffect(() => {
    if (recordedBlob && recordingStatus === "stopping") {
      // recordedBlob is now available
      setFinalRecordingData({
        blob: recordedBlob,
        duration: recordingDuration,
        finalTranscript: accumulatedFinalTranscript.trim(),
      });
      console.log(
        "+++ Effect: Final recording data assembled and set to state. +++"
      );
      console.log("    -> Setting recordingStatus to idle.");
      setRecordingStatus("idle"); // Reset status to idle *after* final data is ready
      console.log("    -> Setting isRecording to false.");
      setIsRecording(false); // NOW set isRecording to false, after final data is populated
    }
  }, [
    recordedBlob,
    recordingDuration,
    accumulatedFinalTranscript,
    recordingStatus, // Include this for the effect to react to "stopping" state
  ]);

  // --- Main Start Recording Handler ---
  const handleStartRecording = async () => {
    setFinalRecordingData(null);
    setRecordingStatus("starting");
    setIsRecording(true);

    resetSpeechRecognition();
    resetMediaRecording();

    // Ensure camera is active before starting MediaRecorder
    let streamToUse = mediaStream.current; // Get the current stream from useCameraStream

    if (!streamToUse) {
      try {
        streamToUse = await startCamera(); // Try to start camera if not already active
        if (!streamToUse) {
          throw new Error("Could not obtain media stream for recording.");
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        console.error("Error obtaining stream for recording:", err);
        setIsRecording(false);
        setRecordingStatus("idle");
        return;
      }
    }

    if (streamToUse) {
      // Build processed stream with baked-in filters/effects
      const processed = setupProcessedStream(streamToUse) ?? streamToUse;
      // Pass the stream AND the sendAudioData callback
      startMediaRecording(processed, sendAudioData);
      setRecordingStatus("recording");
      console.log("Recording sequence initiated.");
    } else {
      console.error("No media stream available to start recording.");
      setIsRecording(false);
      setRecordingStatus("idle");
    }
  };

  const handleStopRecording = useCallback(() => {
    console.log(
      "handleStopRecording: Attempting to stop all recording processes."
    );
    setRecordingStatus("stopping");
    stopSpeechRecognition();
    stopMediaRecording();
    // Cleanup processed stream/canvas if present
    try {
      cleanupProcessedRef.current?.();
    } catch (e) {
      // no-op
    }
    console.log("Stopping sequence initiated.");
  }, [stopSpeechRecognition, stopMediaRecording]);

  const handleSaveToIndexedDB = async () => {
    if (finalRecordingData && scriptId) {
      try {
        const recording = {
          timestamp: Date.now(),
          scriptId: scriptId,
          transcript: finalRecordingData.finalTranscript,
          duration: finalRecordingData.duration,
          blob: finalRecordingData.blob,
        };
        const id = await addRecording(recording);
        console.log("Recording saved to IndexedDB with ID:", id);
        setFinalRecordingData(null);
        // alert("Recording saved successfully!");
        router.push("/dashboard");
      } catch (dbError) {
        console.error("Failed to save recording to IndexedDB:", dbError);
      }
    } else {
      console.warn("No final recording data or script ID to save.");
    }
  };

  const handleDiscardRecording = () => {
    setFinalRecordingData(null);
    resetSpeechRecognition();
    resetMediaRecording();
    console.log("Recording discarded.");
  };

  // Upload and analyze automatically after recording stops
 useEffect(() => {
  const runAnalyzeOnly = async () => {
    if (!finalRecordingData || !scriptId) return;

    try {
      setShowAnalysis(true);
      setAnalysisLoading(true);
      setAnalysisResult(null);

      // Create a local preview URL for the recorded blob so it can be viewed in the modal
      try {
        const localUrl = URL.createObjectURL(finalRecordingData.blob);
        setUploadedRecordingUrl(localUrl);
      } catch (e) {
        // no-op if URL creation fails
      }

      const formData = new FormData();
      formData.append(
        "video",
        finalRecordingData.blob,
        `recording-${Date.now()}.webm`
      );
      formData.append("scriptId", scriptId);
      formData.append("duration", String(finalRecordingData.duration));
      formData.append("transcript", finalRecordingData.finalTranscript || "");

      const session_id = await getCookie("session_id");

      // ✅ Directly send video blob for analysis (no upload)
      const analyzeRes = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/recordings/analyze-direct`,
        {
          method: "POST",
          body: formData,
          headers: { authorization: `Bearer ${session_id}` },
        }
      );

      if (!analyzeRes.ok) {
        throw new Error(`Analyze failed: ${analyzeRes.status}`);
      }

      const analyzeJson = await analyzeRes.json();
      setAnalysisResult({
        transcript: analyzeJson?.transcript,
        metrics: analyzeJson?.metrics,
      });
    } catch (err) {
      console.error("Auto analyze (no-upload) failed:", err);
    } finally {
      setAnalysisLoading(false);
    }
  };

  runAnalyzeOnly();
  // Run only when finalRecordingData changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [finalRecordingData]);

 // Cleanup object URL when modal closes or when a new recording is created
 useEffect(() => {
   if (!showAnalysis && uploadedRecordingUrl) {
     try {
       URL.revokeObjectURL(uploadedRecordingUrl);
     } catch (e) {
       // ignore
     }
     setUploadedRecordingUrl(null);
   }
 }, [showAnalysis, uploadedRecordingUrl]);


  useEffect(() => {
    const prewarm = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        stream.getTracks().forEach((track) => track.stop());
        console.log("Microphone pre-warmed successfully.");
      } catch (err) {
        console.warn(
          "Pre-warm failed - will try again when recording starts:",
          err
        );
      }
    };
    prewarm();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-gray-700">
        <Loader className="w-12 h-12 animate-spin text-blue-500" />
        <p className="mt-4 text-lg">Loading script and settings...</p>
      </div>
    );
  }
  // Inside RecordPageContent.tsx, at the very beginning of the component function
  // console.log("--- RecordPageContent Render Cycle ---");
  // console.log("isRecording:", isRecording);
  // console.log("recordingStatus:", recordingStatus);
  // console.log("finalRecordingData (truthy?):", !!finalRecordingData); // Use !! to easily see true/false
  // console.log("recordedBlob (truthy?):", !!recordedBlob); // From useMediaRecorder
  // console.log("accumulatedFinalTranscript (has content?):", accumulatedFinalTranscript.length > 0);
  // console.log("currentLineIndex:", currentLineIndex);
  // console.log("scriptLines.length:", scriptLines.length);
  // console.log("-------------------------------------");

  return (
    <div className="relative w-screen h-screen font-sans overflow-hidden">
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ filter: getCombinedFilterCss() }}
        autoPlay
        muted
        playsInline
      ></video>
      {!isRecording && effect === "vignette" && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(circle at center, rgba(0,0,0,0) ${
              60 - effectStrength * 20
            }%, rgba(0,0,0,${0.35 + effectStrength * 0.35}))`,
          }}
        />
      )}

      <div
        className={`absolute inset-0 flex flex-col items-center justify-between p-4 sm:p-6 md:p-8`}
      >
        {/* Mobile start/stop button moved to bottom after panels */}
        <StatusIndicators
          isCameraReady={isCameraReady}
          fps={fps}
          isRecording={isRecording}
          devTesting={devTesting}
          listening={listening}
          onFlipCamera={flipCamera}
          liveWpm={liveWpm}
          liveFiller={liveFiller}
          liveAccuracy={liveAccuracy}
        />

        <div className="flex-grow flex flex-col items-center justify-center">
          {isRecording &&
          scriptLines.length > 0 &&
          settings?.teleprompterSettings ? (
            <div className="relative w-full max-w-3xl mx-auto mb-8">
              <TeleprompterDisplay
                scriptLines={scriptLines}
                currentLineIndex={currentLineIndex}
                isRecording={isRecording}
                settings={settings.teleprompterSettings}
              />
            </div>
          ) : (
            <InitialLoadOverlay
              isLoading={isLoading}
              error={overallError?.toString() ?? null}
              scriptId={scriptId}
              scriptIsEmpty={scriptLines.length === 0}
              isCameraReady={isCameraReady}
              browserSupportsSpeechRecognition={
                browserSupportsSpeechRecognition
              }
              devTesting={devTesting}
            />
          )}
        </div>

        <div className="relative z-20 w-full">
          <ControlButtons
            isRecording={isRecording}
            recordingStatus={recordingStatus}
            finalRecordingData={finalRecordingData}
            isLoading={isLoading}
            hasError={!!overallError}
            scriptIsEmpty={scriptLines.length === 0}
            isCameraReady={isCameraReady}
            browserSupportsSpeechRecognition={browserSupportsSpeechRecognition}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
            onSaveRecording={handleSaveToIndexedDB}
            onDiscardRecording={handleDiscardRecording}
            devTesting={devTesting}
            onLogRSRStatesDev={() =>
              console.log({
                transcript,
                listening,
                browserSupportsSpeechRecognition,
              })
            }
          />
        </div>
        <GuidanceOverlay
          framingText={guidance.framingText}
          lightingText={guidance.lightingText}
          showZone={true}
          landmarks={devTesting ? landmarks ?? [] : undefined}
        />
        {!isRecording && (
          <>
            {/* Desktop/tablet layout: left/right anchored */}
            <div className="hidden sm:block pointer-events-auto absolute bottom-4 left-4 w-[40vw] max-w-md z-40">
              <EffectsPicker
                className="w-full"
                effect={effect}
                strength={effectStrength}
                onEffect={setEffect}
                onStrength={setEffectStrength}
              />
            </div>
            <div className="hidden sm:block pointer-events-auto absolute bottom-4 right-4 w-[40vw] max-w-md z-40">
              <GuidanceControls
                className="w-full"
                autoAdjust={autoAdjust}
                onToggleAuto={setAutoAdjust}
                brightness={autoAdjust ? brightness : manualBrightness}
                contrast={autoAdjust ? contrast : manualContrast}
                onBrightness={setManualBrightness}
                onContrast={setManualContrast}
              />
            </div>
            {/* Mobile layout: collapsed FAB icons bottom, panels open on tap */}
            <div className="sm:hidden pointer-events-auto absolute inset-x-0 bottom-4 px-3 z-40">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  aria-label="Effects"
                  onClick={() => {
                    setShowMobileEffects((v) => !v);
                    setShowMobileAdjust(false);
                  }}
                  className="w-11 h-11 rounded-full bg-black/70 text-white flex items-center justify-center shadow-md active:scale-95"
                >
                  ✨
                </button>
                <button
                  type="button"
                  aria-label="Adjust"
                  onClick={() => {
                    setShowMobileAdjust((v) => !v);
                    setShowMobileEffects(false);
                  }}
                  className="w-11 h-11 rounded-full bg-black/70 text-white flex items-center justify-center shadow-md active:scale-95"
                >
                  ⚙️
                </button>
              </div>
            </div>
            {showMobileEffects && (
              <div className="sm:hidden pointer-events-auto absolute inset-x-0 bottom-20 px-3 z-50">
                <EffectsPicker
                  className="w-full"
                  effect={effect}
                  strength={effectStrength}
                  onEffect={setEffect}
                  onStrength={setEffectStrength}
                />
              </div>
            )}
            {showMobileAdjust && (
              <div className="sm:hidden pointer-events-auto absolute inset-x-0 bottom-20 px-3 z-50">
                <div className="w-full space-y-3">
                  <GuidanceControls
                    className="w-full"
                    autoAdjust={autoAdjust}
                    onToggleAuto={setAutoAdjust}
                    brightness={autoAdjust ? brightness : manualBrightness}
                    contrast={autoAdjust ? contrast : manualContrast}
                    onBrightness={setManualBrightness}
                    onContrast={setManualContrast}
                  />
                  <EffectsPicker
                    className="w-full"
                    effect={effect}
                    strength={effectStrength}
                    onEffect={setEffect}
                    onStrength={setEffectStrength}
                  />
                </div>
              </div>
            )}
          </>
        )}
        <DebugOverlay />
      </div>
      <AnalysisModal
        isOpen={showAnalysis}
        onClose={() => setShowAnalysis(false)}
        loading={analysisLoading}
        videoUrl={uploadedRecordingUrl}
        result={analysisResult}
      />
    </div>
  );
}

export default function RecordPage() {
  return (
    <Suspense
      fallback={
        <div className=" text-white h-screen flex items-center justify-center text-xl">
          <Loader className="animate-spin h-8 w-8 mr-3" />
          Loading...
        </div>
      }
    >
      <RecordPageContent />
    </Suspense>
  );
}
