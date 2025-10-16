"use client";

import { useEffect } from "react";

const VideoModal = ({
  isOpen,
  onClose,
  videoUrl,
}: {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
}) => {
  // Handle ESC key press
  useEffect(() => {
    const handleEscape = (e: { key: string }) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden"; // Prevent background scroll
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="relative bg-zinc-900 rounded-2xl p-8 shadow-2xl border border-white/10 max-w-4xl w-full mx-4 max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all duration-200 text-xl font-light z-10"
          title="Close"
        >
          ×
        </button>

        {/* Video Container */}
        <div className="flex flex-col items-center">
          <video
            src={videoUrl}
            controls
            autoPlay
            preload="metadata"
            className="w-full max-w-3xl max-h-[70vh] min-h-[300px] rounded-xl bg-black shadow-xl border border-white/5"
            style={{ objectFit: "contain" }}
          />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="mt-6 px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoModal;
