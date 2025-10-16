"use client";
import React from "react";

type EffectKind =
  | "none"
  | "grayscale"
  | "sepia"
  | "warm"
  | "cool"
  | "cinematic"
  | "vignette"
  | "soften"
  | "clarity";

type Props = {
  effect: EffectKind;
  strength: number; // 0..1
  onEffect: (e: EffectKind) => void;
  onStrength: (v: number) => void;
  className?: string;
};

export const EffectsPicker: React.FC<Props> = ({ effect, strength, onEffect, onStrength, className }) => {
  return (
    <div className={`bg-black/60 text-white p-3 rounded-lg backdrop-blur-sm space-y-2 w-full max-w-md sm:max-w-lg ${className ?? ""}`}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Effect</label>
        <select
          className="bg-black/40 border border-white/20 rounded px-2 py-1 text-sm"
          value={effect}
          onChange={(e) => onEffect(e.target.value as EffectKind)}
        >
          <option value="none">None</option>
          <option value="grayscale">Grayscale</option>
          <option value="sepia">Sepia</option>
          <option value="warm">Warm</option>
          <option value="cool">Cool</option>
          <option value="cinematic">Cinematic</option>
          <option value="vignette">Vignette</option>
          <option value="soften">Soften</option>
          <option value="clarity">Clarity</option>
        </select>
      </div>
      <div className="opacity-90">
        <label className="text-xs">Intensity: {(Number.isFinite(strength) ? strength : 0) * 100}%</label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={strength}
          onChange={(e) => onStrength(Number(e.target.value))}
          className="w-full"
        />
      </div>
    </div>
  );
};

export type { EffectKind };


