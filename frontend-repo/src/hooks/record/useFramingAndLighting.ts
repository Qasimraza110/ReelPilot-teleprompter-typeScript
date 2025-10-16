"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Results as PoseResults } from "@mediapipe/pose";
import { sendGuidanceEvent } from "@/utils/analytics/appwriteClient";

type Guidance = {
  framingText: string | null;
  lightingText: string | null;
  overlays: Array<{ x: number; y: number; text: string }>;
  framingStatus?:
    | "centered"
    | "too_left"
    | "too_right"
    | "too_high"
    | "too_low"
    | "too_close"
    | "too_far"
    | "tilted";
  lightingStatus?: "underexposed" | "overexposed" | "harsh" | "flat" | "good";
};

type LightingOutMessage = {
  type: "lighting";
  metrics: {
    avgLuma: number;
    stdLuma: number;
    percentBlack: number;
    percentWhite: number;
  };
  classification: "underexposed" | "overexposed" | "harsh" | "flat" | "good";
};

export function useFramingAndLighting(options: {
  videoEl: HTMLVideoElement | null;
  enabled: boolean;
  analysisFps?: number; // default 12
  cooldownMs?: number; // minimal time between hint changes
  manualBrightness?: number | null; // when set, overrides auto
  manualContrast?: number | null; // when set, overrides auto
}) {
  const {
    videoEl,
    enabled,
    analysisFps = 12,
    cooldownMs = 1200,
    manualBrightness = null,
    manualContrast = null,
  } = options;

  const [guidance, setGuidance] = useState<Guidance>({
    framingText: null,
    lightingText: null,
    overlays: [],
  });

  const poseWorkerRef = useRef<Worker | null>(null);
  const lightingWorkerRef = useRef<Worker | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastSentTimeRef = useRef<number>(0);
  const lastHintChangeRef = useRef<number>(0);
  const lastFramingStatusRef = useRef<Guidance["framingStatus"] | undefined>(
    undefined
  );
  const lastLightingStatusRef = useRef<Guidance["lightingStatus"] | undefined>(
    undefined
  );
  const lastCompositeHintRef = useRef<string | null>(null);
  const [landmarksState, setLandmarksState] = useState<{ x: number; y: number }[] | null>(null);
  const lastRoiRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);

  // Auto-adjust filter values with light smoothing
  const [brightness, setBrightness] = useState(1);
  const [contrast, setContrast] = useState(1);
  const targetBrightnessRef = useRef(1);
  const targetContrastRef = useRef(1);

  // Local hidden canvas for frame extraction
  useEffect(() => {
    if (!canvasRef.current) {
      canvasRef.current = document.createElement("canvas");
      canvasRef.current.width = 640;
      canvasRef.current.height = 360;
      canvasRef.current.style.display = "none";
      document.body.appendChild(canvasRef.current);
    }
    return () => {
      if (canvasRef.current && canvasRef.current.parentElement) {
        canvasRef.current.parentElement.removeChild(canvasRef.current);
      }
      canvasRef.current = null;
    };
  }, []);

  // Init pose worker
  useEffect(() => {
    if (!enabled || poseWorkerRef.current) return;
    const worker = new Worker(new URL("../../workers/poseWorker.ts", import.meta.url), { type: "module" });
    poseWorkerRef.current = worker;
    const handle = (e: MessageEvent<{ type: string; landmarks: any }>) => {
      if (e.data?.type !== "pose") return;
      const landmarks = e.data.landmarks;
      if (!landmarks || landmarks.length === 0) {
        setGuidance((g) => ({ ...g, framingText: "Center yourself", framingStatus: undefined }));
        setLandmarksState(null);
        return;
      }
      const indices = [0, 2, 5, 11, 12, 23, 24];
      const pts = indices.map((i) => landmarks[i]).filter(Boolean);
      if (pts.length === 0) return;
      const cx = pts.reduce((s: number, p: any) => s + p.x, 0) / pts.length;
      const cy = pts.reduce((s: number, p: any) => s + p.y, 0) / pts.length;
      const xs = pts.map((p: any) => p.x);
      const ys = pts.map((p: any) => p.y);
      const bboxW = Math.max(...xs) - Math.min(...xs);
      const bboxH = Math.max(...ys) - Math.min(...ys);

      let framingText: string | null = null;
      let framingStatus: Guidance["framingStatus"] = "centered";
      const dx = cx - 0.5;
      const dy = cy - 0.5;
      const tol = 0.08;
      if (Math.abs(dx) > tol || Math.abs(dy) > tol) {
        const moveX = dx < -tol ? "right" : dx > tol ? "left" : "";
        const moveY = dy < -tol ? "down" : dy > tol ? "up" : "";
        framingText = `Move ${[moveX, moveY].filter(Boolean).join(" ")}`.trim();
        if (dx < -tol) framingStatus = "too_left"; else if (dx > tol) framingStatus = "too_right";
        if (dy < -tol) framingStatus = "too_high"; else if (dy > tol) framingStatus = "too_low";
      }
      const area = bboxW * bboxH;
      if (area < 0.05) {
        framingText = framingText ? `${framingText} and move closer` : "Move closer";
        framingStatus = "too_far";
      } else if (area > 0.25) {
        framingText = framingText ? `${framingText} and step back` : "Step back";
        framingStatus = "too_close";
      }
      const leftShoulder = landmarks[11];
      const rightShoulder = landmarks[12];
      const nose = landmarks[0];
      const midShoulderX = leftShoulder && rightShoulder ? (leftShoulder.x + rightShoulder.x) / 2 : undefined;
      if (leftShoulder && rightShoulder) {
        const tilt = Math.atan2(
          rightShoulder.y - leftShoulder.y,
          rightShoulder.x - leftShoulder.x
        );
        if (Math.abs(tilt) > 0.15) {
          framingText = framingText ? `${framingText} and straighten shoulders` : "Straighten shoulders";
          framingStatus = "tilted";
        }
      }
      if (nose != null && midShoulderX != null) {
        const yaw = nose.x - midShoulderX;
        const yawTol = 0.03;
        if (yaw > yawTol) {
          framingText = framingText ? `${framingText} and face slightly left` : "Face slightly left";
        } else if (yaw < -yawTol) {
          framingText = framingText ? `${framingText} and face slightly right` : "Face slightly right";
        }
      }

      setLandmarksState(landmarks.map((l: any) => ({ x: l.x, y: l.y })));
      // Update ROI for lighting worker around face/upper torso
      try {
        const faceIdx = [0, 2, 5];
        const torsoIdx = [11, 12];
        const pts2 = [...faceIdx, ...torsoIdx].map((i) => landmarks[i]).filter(Boolean);
        if (pts2.length > 0 && canvasRef.current) {
          const xs2 = pts2.map((p: any) => p.x);
          const ys2 = pts2.map((p: any) => p.y);
          const minX = Math.max(0, Math.min(...xs2) - 0.1);
          const maxX = Math.min(1, Math.max(...xs2) + 0.1);
          const minY = Math.max(0, Math.min(...ys2) - 0.1);
          const maxY = Math.min(1, Math.max(...ys2) + 0.1);
          lastRoiRef.current = {
            x: Math.floor(minX * canvasRef.current.width),
            y: Math.floor(minY * canvasRef.current.height),
            width: Math.floor((maxX - minX) * canvasRef.current.width),
            height: Math.floor((maxY - minY) * canvasRef.current.height),
          };
        }
      } catch {}
      setGuidance((g) => {
        const now = performance.now();
        let chosen = g.lightingText || framingText;
        const severeLighting = g.lightingStatus === "underexposed" || g.lightingStatus === "overexposed";
        if (severeLighting) chosen = g.lightingText || framingText; else chosen = framingText || g.lightingText;
        if (chosen !== lastCompositeHintRef.current && now - lastHintChangeRef.current < cooldownMs) {
          chosen = lastCompositeHintRef.current;
        } else if (chosen !== lastCompositeHintRef.current) {
          lastCompositeHintRef.current = chosen ?? null;
          lastHintChangeRef.current = now;
          if (framingStatus !== lastFramingStatusRef.current && framingStatus) {
            lastFramingStatusRef.current = framingStatus;
            sendGuidanceEvent({ type: "framing", message: framingStatus, ts: Date.now() });
          }
        }
        return { ...g, framingText: chosen ?? null, framingStatus };
      });
    };
    worker.addEventListener("message", handle);
    worker.postMessage({ type: "init" });
    return () => {
      worker.removeEventListener("message", handle);
      worker.terminate();
      poseWorkerRef.current = null;
    };
  }, [enabled, cooldownMs]);

  // Init lighting worker
  useEffect(() => {
    if (!enabled) return;
    if (lightingWorkerRef.current) return;
    const worker = new Worker(new URL("../../workers/lightingWorker.ts", import.meta.url), { type: "module" });
    lightingWorkerRef.current = worker;
    const handleMessage = (ev: MessageEvent<LightingOutMessage>) => {
      if (ev.data?.type === "lighting") {
        const cls = ev.data.classification;
        let text: string | null = null;
        if (cls === "underexposed") text = "Add more light";
        else if (cls === "overexposed") text = "Reduce exposure / move from bright source";
        else if (cls === "harsh") text = "Soften lighting / avoid harsh shadows";
        else if (cls === "flat") text = "Increase contrast / add directional light";
        else text = null;
        setGuidance((g) => ({ ...g, lightingText: text, lightingStatus: cls }));
        // Emit analytics if changed
        if (lastLightingStatusRef.current !== cls) {
          lastLightingStatusRef.current = cls;
          sendGuidanceEvent({ type: "lighting", classification: cls, ts: Date.now() });
        }

        // Compute target brightness/contrast based on metrics
        const { avgLuma, stdLuma } = ev.data.metrics;
        // Normalize avgLuma (0..255). Aim approx 140 as midface exposure
        const desired = 140;
        const delta = (desired - avgLuma) / 255; // -1..1
        const baseBrightness = 1 + delta * 0.8; // cap range roughly 0.2..1.8
        // Contrast adjustment: increase if flat, decrease if harsh
        let baseContrast = 1;
        if (stdLuma < 15) baseContrast = 1.2 + (15 - stdLuma) * 0.01; // up to ~1.35
        else if (stdLuma > 60) baseContrast = 0.9 - Math.min((stdLuma - 60) * 0.005, 0.2); // down to ~0.7

        // Clamp
        targetBrightnessRef.current = Math.max(0.5, Math.min(1.8, baseBrightness));
        targetContrastRef.current = Math.max(0.7, Math.min(1.4, baseContrast));
      }
    };
    worker.addEventListener("message", handleMessage);
    // Initialize with a default size; will be updated with first frame
    worker.postMessage({ type: "init", width: 640, height: 360 });
    return () => {
      worker.removeEventListener("message", handleMessage);
      worker.terminate();
      lightingWorkerRef.current = null;
    };
  }, [enabled]);

  // Processing loop
  useEffect(() => {
    if (!enabled || !videoEl || !canvasRef.current) return;
    let rafId = 0;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const intervalMs = Math.max(1000 / analysisFps, 16);

    const process = async () => {
      rafId = requestAnimationFrame(process);
      const now = performance.now();
      if (now - lastSentTimeRef.current < intervalMs) return;
      lastSentTimeRef.current = now;

      const w = canvasRef.current!.width;
      const h = canvasRef.current!.height;
      ctx.drawImage(videoEl, 0, 0, w, h);

      // Send to lighting worker via ImageBitmap
      if (lightingWorkerRef.current) {
        const bitmap = await createImageBitmap(canvasRef.current!);
        lightingWorkerRef.current.postMessage(
          { type: "frame", imageBitmap: bitmap, roi: lastRoiRef.current ?? undefined },
          [bitmap as unknown as Transferable]
        );
      }

      // Send frame to pose worker
      if (poseWorkerRef.current) {
        const bmp2 = await createImageBitmap(canvasRef.current!);
        poseWorkerRef.current.postMessage({ type: "frame", imageBitmap: bmp2 }, [bmp2 as unknown as Transferable]);
      }
    };
    rafId = requestAnimationFrame(process);
    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [enabled, videoEl, analysisFps]);

  // Smoothly approach target brightness/contrast
  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
      // small smoothing factor
      setBrightness((b) => lerp(b, targetBrightnessRef.current, 0.12));
      setContrast((c) => lerp(c, targetContrastRef.current, 0.12));
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [enabled]);

  const effectiveBrightness = manualBrightness ?? brightness;
  const effectiveContrast = manualContrast ?? contrast;

  const filterCss = useMemo(
    () => `brightness(${effectiveBrightness.toFixed(2)}) contrast(${effectiveContrast.toFixed(2)})`,
    [effectiveBrightness, effectiveContrast]
  );

  return useMemo(
    () => ({ guidance, filterCss, brightness: effectiveBrightness, contrast: effectiveContrast, landmarks: landmarksState }),
    [guidance, filterCss, effectiveBrightness, effectiveContrast, landmarksState]
  );
}


