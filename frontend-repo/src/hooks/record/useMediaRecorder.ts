/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useCallback, useEffect } from "react";

interface UseMediaRecorderResult {
  mediaRecorder: React.MutableRefObject<MediaRecorder | null>;
  recordedBlob: Blob | null;
  recordingDuration: number;
  startRecording: (
    prevStream: MediaStream | null,
    onAudioData: (data: Int16Array) => void
  ) => Promise<void>;
  stopRecording: () => void;
  resetRecording: () => void;
  mediaRecorderError: string | null;
  mediaStream: React.MutableRefObject<MediaStream | null>;
}

export const useMediaRecorder = (): UseMediaRecorderResult => {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunks = useRef<Blob[]>([]);
  const recordingStartTime = useRef<number>(0);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [mediaRecorderError, setMediaRecorderError] = useState<string | null>(
    null
  );

  const float32To16BitPCM = (input: Float32Array): Int16Array => {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return output;
  };

  const cleanupAudioProcessing = useCallback(() => {
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current.onaudioprocess = null;
      scriptProcessorRef.current = null;
    }
    if (mediaStreamSourceRef.current) {
      mediaStreamSourceRef.current.disconnect();
      mediaStreamSourceRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  const startRecording = useCallback(
    async (
      prevStream: MediaStream | null,
      onAudioData: (data: Int16Array) => void
    ) => {
      try {
        setRecordedBlob(null);
        setRecordingDuration(0);
        recordedChunks.current = [];
        setMediaRecorderError(null);

        let stream = prevStream;
        if (
          !stream ||
          !stream.getTracks().some((track) => track.readyState === "live")
        ) {
          console.log("Requesting camera and mic...");
          stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true,
          });
        }

        mediaStreamRef.current = stream;

        // Attach live preview
        const preview = document.querySelector(
          "video#camera-preview"
        ) as HTMLVideoElement | null;
        if (preview) preview.srcObject = stream;

        // Initialize MediaRecorder
        mediaRecorderRef.current = new MediaRecorder(stream, {
          mimeType: "video/webm;codecs=vp8,opus",
        });

        mediaRecorderRef.current.ondataavailable = (e) => {
          if (e.data.size > 0) recordedChunks.current.push(e.data);
        };

        mediaRecorderRef.current.onstop = () => {
          console.log("Recording stopped.");
          const blob = new Blob(recordedChunks.current, {
            type: mediaRecorderRef.current?.mimeType,
          });
          setRecordedBlob(blob);
          setRecordingDuration(
            (performance.now() - recordingStartTime.current) / 1000
          );
          cleanupAudioProcessing();
        };

        mediaRecorderRef.current.onerror = (e: any) => {
          console.error("MediaRecorder error:", e);
          setMediaRecorderError(e.error?.message || "Unknown error");
          cleanupAudioProcessing();
        };

        recordingStartTime.current = performance.now();
        mediaRecorderRef.current.start(250); // collect data every 250ms
        console.log("MediaRecorder started successfully.");

        audioContextRef.current = new AudioContext({ sampleRate: 48000 });
        mediaStreamSourceRef.current =
          audioContextRef.current.createMediaStreamSource(stream);

        const bufferSize = 1024;
        scriptProcessorRef.current =
          audioContextRef.current.createScriptProcessor(bufferSize, 1, 1);

        scriptProcessorRef.current.onaudioprocess = (event) => {
          const input = event.inputBuffer.getChannelData(0);
          const pcmData = float32To16BitPCM(input);
          onAudioData(pcmData);
        };

        mediaStreamSourceRef.current.connect(scriptProcessorRef.current);
        scriptProcessorRef.current.connect(audioContextRef.current.destination);
      } catch (err: any) {
        console.error("Failed to start recording:", err);
        setMediaRecorderError(err.message || "Failed to start recording");
        cleanupAudioProcessing();
      }
    },
    [cleanupAudioProcessing]
  );

  const stopRecording = useCallback(() => {
    try {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      cleanupAudioProcessing();
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getAudioTracks().forEach((t) => t.stop());
      }
      console.log("Recording stopped cleanly.");
    } catch (err) {
      console.error("stopRecording error:", err);
    }
  }, [cleanupAudioProcessing]);

  const resetRecording = useCallback(() => {
    setRecordedBlob(null);
    setRecordingDuration(0);
    recordedChunks.current = [];
    mediaRecorderRef.current = null;
    setMediaRecorderError(null);
    cleanupAudioProcessing();
  }, [cleanupAudioProcessing]);

  useEffect(() => {
    return () => {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();
      }
      cleanupAudioProcessing();
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [cleanupAudioProcessing]);

  return {
    mediaRecorder: mediaRecorderRef,
    recordedBlob,
    recordingDuration,
    startRecording,
    stopRecording,
    resetRecording,
    mediaRecorderError,
    mediaStream: mediaStreamRef,
  };
};
