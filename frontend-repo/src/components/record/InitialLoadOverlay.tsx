// components/record-page/InitialLoadOverlay.tsx
import React from "react";
import { Loader, AlertTriangle, CameraOff, Video } from "lucide-react";

interface InitialLoadOverlayProps {
  isLoading: boolean;
  error: string | null;
  scriptId: string | null;
  scriptIsEmpty: boolean;
  isCameraReady: boolean;
  browserSupportsSpeechRecognition: boolean;
  devTesting: boolean;
}

export const InitialLoadOverlay: React.FC<InitialLoadOverlayProps> = ({
  isLoading,
  error,
  scriptId,
  scriptIsEmpty,
  isCameraReady,
  browserSupportsSpeechRecognition,
  devTesting,
}) => {
  return (
    <div className="flex flex-col items-center text-white">
      {isLoading && (
        <>
          <Loader className="animate-spin h-12 w-12 mx-auto" />
          <p className="mt-2">Loading Script...</p>
        </>
      )}
      {error && (
        <div className="flex flex-col items-center text-red-400">
          <CameraOff className="h-12 w-12 mb-4" />
          <p className="font-semibold mb-2">Error Occurred</p>
          <p className="max-w-sm text-sm text-center">{error}</p>
        </div>
      )}
      {!isLoading && !error && !scriptId && (
        <div className="flex flex-col items-center text-yellow-400">
          <AlertTriangle className="h-12 w-12 mb-2" />
          <p>Please provide a script ID in the URL.</p>
        </div>
      )}
      {!isLoading && !error && !scriptIsEmpty && scriptId && (
        <div className="flex flex-col items-center">
          {isCameraReady ? (
            <Video className="h-12 w-12 mb-2 text-green-400" />
          ) : (
            <CameraOff className="h-12 w-12 mb-2 text-yellow-400" />
          )}
          <p className="max-w-sm text-center">
            Ready to record. Press the button to begin.
          </p>
          <p className="max-w-sm text-sm text-gray-300 mt-1 text-center">
            Current Mode:{" "}
            {devTesting
              ? "Dev Testing (Browser Speech Recognition)"
              : "Browser Speech Recognition"}
            {!browserSupportsSpeechRecognition && (
              <span className="text-red-400 block">
                Warning: Speech recognition not supported by your browser.
              </span>
            )}
          </p>
        </div>
      )}
      {!isLoading && !error && scriptIsEmpty && scriptId && (
        <div className="flex flex-col items-center text-yellow-400">
          <AlertTriangle className="h-12 w-12 mb-2" />
          <p className="text-center">
            Script fetched, but it&apos;s empty or has no content.
          </p>
        </div>
      )}
    </div>
  );
};
