/* eslint-disable no-restricted-globals */

// Minimal pose result bridged to main thread
type PoseOut = {
  type: "pose";
  landmarks: Array<{ x: number; y: number; z?: number }> | null;
};

type InitMsg = { type: "init" };
type FrameMsg = { type: "frame"; imageBitmap: ImageBitmap };
type InMsg = InitMsg | FrameMsg;

let pose: any = null;
let canvas: OffscreenCanvas | null = null;
let ctx: OffscreenCanvasRenderingContext2D | null = null;

async function ensurePoseLoaded() {
  if (pose) return;
  const mp = await import("@mediapipe/pose");
  const PoseCtor = (mp as any).Pose || (mp as any).default?.Pose;
  if (!PoseCtor) throw new Error("Pose constructor not available");
  pose = new PoseCtor({
    locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
  });
  pose.setOptions({
    modelComplexity: 0,
    smoothLandmarks: true,
    enableSegmentation: false,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });
}

// @ts-expect-error worker global
self.onmessage = async (event: MessageEvent<InMsg>) => {
  const data = event.data;
  if (data.type === "init") {
    // lazy canvas init; size will be from first frame
    if (!canvas) {
      canvas = new OffscreenCanvas(640, 360);
      ctx = canvas.getContext("2d");
    }
    return;
  }

  if (data.type === "frame") {
    try {
      await ensurePoseLoaded();
      if (!ctx || !canvas) {
        canvas = new OffscreenCanvas(data.imageBitmap.width, data.imageBitmap.height);
        ctx = canvas.getContext("2d");
      }
      ctx!.drawImage(data.imageBitmap, 0, 0, canvas!.width, canvas!.height);
      const results = await pose.send({ image: canvas });
      // Some builds resolve via onResults; to support both, read poseLandmarks if present
      const landmarks = (results && results.poseLandmarks) ? results.poseLandmarks : null;
      // @ts-expect-error worker global
      postMessage({ type: "pose", landmarks } as PoseOut);
    } finally {
      data.imageBitmap.close();
    }
  }
};


