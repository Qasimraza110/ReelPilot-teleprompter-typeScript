"use client";
import React from "react";

type Props = {
  framingText: string | null;
  lightingText: string | null;
  showZone?: boolean;
  landmarks?: { x: number; y: number }[] | null;
};

export const GuidanceOverlay: React.FC<Props> = ({ framingText, lightingText, showZone = true, landmarks }) => {
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-between p-4 z-10">
      {/* Top framing guidance */}
      <div className="w-full flex justify-center mt-3">
        {framingText && (
          <div className="bg-black/70 text-white px-3 py-1 rounded-md text-xs sm:text-sm shadow border border-white/10">
            {framingText}
          </div>
        )}
      </div>
      {/* Bottom lighting guidance: placed near controls, clearly visible */}
      {lightingText && (
        <div className="w-full flex justify-center absolute left-0 right-0 bottom-4 sm:bottom-6">
          <div className="max-w-[92%] sm:max-w-xl bg-black/75 text-white px-4 py-2 rounded-lg text-sm sm:text-base shadow-lg border border-white/10 backdrop-blur-sm text-center">
            {lightingText}
          </div>
        </div>
      )}
      {showZone && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="border-2 border-white/40 rounded-lg" style={{ width: "50%", height: "60%" }} />
        </div>
      )}
      {Array.isArray(landmarks) && landmarks.length > 0 && (
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1 1" preserveAspectRatio="none">
          {landmarks.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={0.005} fill="#22d3ee" />
          ))}
        </svg>
      )}
    </div>
  );
};


