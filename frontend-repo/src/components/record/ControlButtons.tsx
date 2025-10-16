// components/record-page/ControlButtons.tsx
import React from "react";
import { Mic } from "lucide-react";
import SpeechRecognition from "react-speech-recognition";
interface ControlButtonsProps {
  isRecording: boolean;
  recordingStatus: "idle" | "starting" | "recording" | "stopping";
  finalRecordingData: {
    blob: Blob;
    duration: number;
    finalTranscript: string;
  } | null;
  isLoading: boolean;
  hasError: boolean;
  scriptIsEmpty: boolean;
  isCameraReady: boolean;
  browserSupportsSpeechRecognition: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onSaveRecording: () => void;
  onDiscardRecording: () => void;
  devTesting: boolean;
  onStartRSRDev?: () => void; // Optional for dev testing
  onStopRSRDev?: () => void; // Optional for dev testing
  onLogRSRStatesDev?: () => void; // Optional for dev testing
}

export const ControlButtons: React.FC<ControlButtonsProps> = ({
  isRecording,
  recordingStatus,
  finalRecordingData,
  isLoading,
  hasError,
  scriptIsEmpty,
  isCameraReady,
  browserSupportsSpeechRecognition,
  onStartRecording,
  onStopRecording,
  onSaveRecording,
  onDiscardRecording,
  devTesting,
  onLogRSRStatesDev,
}) => {
  return (
    <div className="w-full flex justify-center pb-4">

      {isRecording || recordingStatus === "recording" ? (
        <button
          onClick={onStopRecording}
          className="z-10000 px-6 py-3 bg-red-600/80 backdrop-blur-sm text-white font-semibold rounded-full shadow-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75 transition-all transform hover:scale-105 flex items-center space-x-2"
        >
          <div className="w-4 h-4 bg-white rounded-sm"></div>
          <span>Stop Recording</span>
        </button>
      ) : finalRecordingData ? (
        <div className="flex space-x-4">
          <button
            onClick={onSaveRecording}
            className="px-6 py-3 bg-blue-600/80 backdrop-blur-sm text-white font-semibold rounded-full shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition-all transform hover:scale-105 flex items-center space-x-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
              ></path>
            </svg>
            <span>Save Recording</span>
          </button>
          <button
            onClick={onDiscardRecording}
            className="px-6 py-3 bg-gray-600/80 backdrop-blur-sm text-white font-semibold rounded-full shadow-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-75 transition-all transform hover:scale-105 flex items-center space-x-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
            <span>Discard</span>
          </button>
        </div>
      ) : (
        <button
          onClick={onStartRecording}
          disabled={
            isLoading ||
            hasError ||
            scriptIsEmpty ||
            !isCameraReady ||
            !browserSupportsSpeechRecognition
          }
          className="px-6 py-3 bg-green-600/80 backdrop-blur-sm text-white font-semibold rounded-full shadow-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-75 transition-all transform hover:scale-105 flex items-center space-x-2"
        >
          <Mic size={20} />
          <span>Start Recording</span>
        </button>
      )}

      {devTesting && (
        <div className="fixed bottom-4 left-4 flex gap-2 z-50">
          <button
            // Use the directly imported startListening and stopListening
            onClick={() =>
              SpeechRecognition.startListening({ continuous: true })
            } // No need for onStartRSRDev prop anymore if using directly
            className="bg-blue-500 text-white px-3 py-1 rounded"
          >
            Start RSR
          </button>
          <button
            onClick={() => SpeechRecognition.stopListening()} // No need for onStopRSRDev prop anymore if using directly
            className="bg-red-500 text-white px-3 py-1 rounded"
          >
            Stop RSR
          </button>
          <button
            onClick={onLogRSRStatesDev} // Keep this as it logs other states too
            className="bg-green-500 text-white px-3 py-1 rounded"
          >
            Log RSR States
          </button>
        </div>
      )}
    </div>
  );
};
