"use client";

import React from "react";

interface AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  loading: boolean;
  videoUrl?: string | null;
  result?: {
    transcript?: string;
    metrics?: {
      speakingPace?: { averageWPM?: number };
      fillerWords?: { count?: number };
      pauseAnalysis?: { totalPauses?: number };
      accuracy?: number;
    };
  } | null;
}

export const AnalysisModal: React.FC<AnalysisModalProps> = ({
  isOpen,
  onClose,
  loading,
  videoUrl,
  result,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative bg-zinc-900 rounded-2xl p-6 shadow-2xl border border-white/10 w-full max-w-2xl mx-2 sm:mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-white/90 hover:text-white hover:bg-white/15 rounded-full transition shadow focus:outline-none focus:ring-2 focus:ring-purple-500"
          aria-label="Close"
        >
          ✕
        </button>

        <h3 className="text-lg font-semibold text-white mb-4">
          Performance Analysis
        </h3>

        {loading ? (
          <div className="flex flex-col items-center justify-center text-gray-300 space-y-4">
            <div>Analyzing your take... This may take a few seconds.</div>

            {/* Inline Loading Bar */}
            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <div
                className="h-2 bg-purple-500 rounded-full"
                style={{
                  animation: "loading-bar 1.8s infinite ease-in-out",
                }}
              />
            </div>

            {/* Inline Animation Keyframes */}
            <style >{`
              @keyframes loading-bar {
                0% {
                  transform: translateX(-100%);
                }
                50% {
                  transform: translateX(0%);
                }
                100% {
                  transform: translateX(100%);
                }
              }
            `}</style>
          </div>
        ) : (
          <div className="space-y-4">
            {videoUrl && (
              <video
                src={videoUrl}
                controls
                className="w-full rounded-lg border border-white/5"
              />
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-gray-400">WPM</div>
                <div className="text-white text-xl font-semibold">
                  {result?.metrics?.speakingPace?.averageWPM ?? "-"}
                </div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-gray-400">Filler words</div>
                <div className="text-white text-xl font-semibold">
                  {result?.metrics?.fillerWords?.count ?? 0}
                </div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-gray-400">Long pauses</div>
                <div className="text-white text-xl font-semibold">
                  {result?.metrics?.pauseAnalysis?.totalPauses ?? 0}
                </div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-gray-400">Accuracy</div>
                <div className="text-white text-xl font-semibold">
                  {typeof result?.metrics?.accuracy === "number"
                    ? Math.round((result?.metrics?.accuracy || 0) * 100)
                    : "-"}
                  %
                </div>
              </div>
            </div>

            {result?.transcript && (
              <div className="text-sm text-gray-200">
                <div className="text-gray-400 mb-1">Transcript</div>
                <div className="bg-white/5 rounded p-3 max-h-56 sm:max-h-60 overflow-auto whitespace-pre-wrap">
                  {result.transcript}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnalysisModal;
