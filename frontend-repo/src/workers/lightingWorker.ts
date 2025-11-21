/* eslint-disable no-restricted-globals */

// Types for messages
type InitMessage = {
  type: "init";
  width: number; 
  height: number;
};

type FrameMessage = {
  type: "frame";
  imageBitmap: ImageBitmap;
  roi?: { x: number; y: number; width: number; height: number };
};

type WorkerInMessage = InitMessage | FrameMessage;

type LightingMetrics = {
  avgLuma: number;
  stdLuma: number;
  percentBlack: number;
  percentWhite: number;
  avgR: number;
  avgG: number;
  avgB: number;
  colorLabel: "warm" | "cool" | "neutral";
  warmthScore: number; // positive warm, negative cool
};

type LightingAssessment = {
  metrics: LightingMetrics;
  classification: "underexposed" | "overexposed" | "harsh" | "flat" | "good";
};

// Use different names to avoid redeclare issues in certain bundlers
let lwCanvas: OffscreenCanvas | null = null;
let lwCtx: OffscreenCanvasRenderingContext2D | null = null;

function computeLuminance(r: number, g: number, b: number): number {
  // Perceptual Rec. 709
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function analyzeImageData(
  data: Uint8ClampedArray
): LightingMetrics {
  const pixelCount = data.length / 4;
  let sum = 0;
  let sumSq = 0;
  let blackCount = 0;
  let whiteCount = 0;
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const y = computeLuminance(r, g, b);
    sum += y;
    sumSq += y * y;
    if (y <= 5) blackCount++;
    if (y >= 250) whiteCount++;
    sumR += r;
    sumG += g;
    sumB += b;
  }

  const avg = sum / pixelCount;
  const variance = Math.max(sumSq / pixelCount - avg * avg, 0);
  const std = Math.sqrt(variance);
  const avgR = sumR / pixelCount;
  const avgG = sumG / pixelCount;
  const avgB = sumB / pixelCount;
  const warmthScore = (avgR - avgB) / 255; // -1..1
  let colorLabel: LightingMetrics["colorLabel"] = "neutral";
  if (warmthScore > 0.08) colorLabel = "warm";
  else if (warmthScore < -0.08) colorLabel = "cool";

  return {
    avgLuma: avg,
    stdLuma: std,
    percentBlack: (blackCount / pixelCount) * 100,
    percentWhite: (whiteCount / pixelCount) * 100,
    avgR,
    avgG,
    avgB,
    colorLabel,
    warmthScore,
  };
}

function classifyLighting(m: LightingMetrics): LightingAssessment["classification"] {
  if (m.percentWhite > 5) return "overexposed";
  if (m.percentBlack > 5) return "underexposed";
  if (m.stdLuma > 60) return "harsh";
  if (m.stdLuma < 15) return "flat";
  return "good";
}

self.onmessage = async (event: MessageEvent<WorkerInMessage>) => {
  const msg = event.data;
  if (msg.type === "init") {
    lwCanvas = new OffscreenCanvas(msg.width, msg.height);
    lwCtx = lwCanvas.getContext("2d");
    return;
  }

  if (msg.type === "frame") {
    if (!lwCtx || !lwCanvas) return;
    const { imageBitmap, roi } = msg;
    try {
      lwCtx.drawImage(imageBitmap, 0, 0, lwCanvas.width, lwCanvas.height);
      const x = roi ? roi.x : 0;
      const y = roi ? roi.y : 0;
      const w = roi ? roi.width : lwCanvas.width;
      const h = roi ? roi.height : lwCanvas.height;
      const imageData = lwCtx.getImageData(x, y, w, h);
      const metrics = analyzeImageData(imageData.data);
      const classification = classifyLighting(metrics);
      
      postMessage({ type: "lighting", metrics, classification } as const);
    } finally {
      imageBitmap.close();
    }
  }
};



