"use client";
import React from "react";

type Props = {
  autoAdjust: boolean;
  onToggleAuto: (v: boolean) => void;
  brightness: number;
  contrast: number;
  onBrightness: (v: number) => void;
  onContrast: (v: number) => void;
  className?: string;
};

export const GuidanceControls: React.FC<Props> = ({
  autoAdjust,
  onToggleAuto,
  brightness,
  contrast,
  onBrightness,
  onContrast,
  className,
}) => {
  return (
    <div className={
      `bg-black/60 text-white p-3 rounded-lg backdrop-blur-sm space-y-2 w-full max-w-md sm:max-w-lg ${className ?? ""}`
    }>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Auto Adjust</label>
        <input
          type="checkbox"
          checked={autoAdjust}
          onChange={(e) => onToggleAuto(e.target.checked)}
        />
      </div>
      <div className="opacity-90">
        <label className="text-xs">Brightness: {Number.isFinite(brightness) ? brightness.toFixed(2) : "1.00"}</label>
        <input
          type="range"
          min={0.5}
          max={1.8}
          step={0.01}
          value={brightness}
          onChange={(e) => onBrightness(Number(e.target.value))}
          disabled={autoAdjust}
          className="w-full"
        />
      </div>
      <div className="opacity-90">
        <label className="text-xs">Contrast: {Number.isFinite(contrast) ? contrast.toFixed(2) : "1.00"}</label>
        <input
          type="range"
          min={0.7}
          max={1.4}
          step={0.01}
          value={contrast}
          onChange={(e) => onContrast(Number(e.target.value))}
          disabled={autoAdjust}
          className="w-full"
        />
      </div>
    </div>
  );
};


