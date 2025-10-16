// components/record-page/StatusIndicators.tsx
import React from "react";
import { Camera } from "lucide-react";
interface StatusIndicatorsProps {
  isCameraReady: boolean;
  fps: number;
  isRecording: boolean;
  devTesting: boolean;
  listening: boolean; // Add listening state from RSR
  onFlipCamera: () => void;
  // Live metrics (optional)
  liveWpm?: number;
  liveFiller?: number;
  liveAccuracy?: number; // 0..1
}

export const StatusIndicators: React.FC<StatusIndicatorsProps> = ({
  isCameraReady,
  fps,
  isRecording,
  devTesting,
  onFlipCamera,
  liveWpm,
  liveFiller,
  liveAccuracy,
}) => {
  return (
    <>
      <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
        <button
          onClick={() => window.history.back()}
          className="bg-gray-800/80 backdrop-blur-sm text-white px-3 py-2 rounded-lg hover:bg-gray-700/80 transition-all flex items-center gap-2 text-sm font-medium"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back
        </button>
        <button
          onClick={onFlipCamera}
          disabled={!isCameraReady}
          className={`bg-gray-800/80 backdrop-blur-sm text-white px-3 py-2 rounded-lg 
              flex items-center gap-2 text-sm font-medium transition-all
              ${
                isCameraReady
                  ? "hover:bg-gray-700/80"
                  : "opacity-50 cursor-not-allowed"
              }`}
        >
          <Camera className="w-5 h-5" />
          Flip
        </button>
        {isCameraReady && (
          <div className="bg-black/60 backdrop-blur-sm text-green-400 px-3 py-1 rounded-lg text-sm font-mono">
            FPS: {fps}
          </div>
        )}
      </div>

      {isRecording && (
        <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-2">
          <div className="bg-red-600 px-3 py-1 rounded-full text-white text-sm font-semibold flex items-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            RECORDING {devTesting ? "(Dev Testing)" : "(Live)"}
          </div>
          <div className="bg-black/60 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-xs sm:text-sm font-mono flex flex-wrap gap-3 sm:gap-4">
            <span>WPM: {typeof liveWpm === "number" ? liveWpm : "-"}</span>
            <span>Filler: {typeof liveFiller === "number" ? liveFiller : 0}</span>
            <span>
              Accuracy: {typeof liveAccuracy === "number" ? Math.round(liveAccuracy * 100) : "-"}%
            </span>
          </div>
        </div>
      )}
    </>
  );
};
