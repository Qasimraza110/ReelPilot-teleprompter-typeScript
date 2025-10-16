// components/DebugOverlay.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { subscribeToLogs } from "@/utils/debugLogger";

export function DebugOverlay() {
  const [logs, setLogs] = useState<string[]>([]);
  const bufferRef = useRef<string[]>([]);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    const flush = () => {
      rafIdRef.current = null;
      if (bufferRef.current.length === 0) return;
      setLogs((prev) => {
        const merged = [...prev, ...bufferRef.current];
        bufferRef.current = [];
        return merged.slice(-20);
      });
    };

    const scheduleFlush = () => {
      if (rafIdRef.current !== null) return;
      rafIdRef.current = requestAnimationFrame(flush);
    };

    const unsub = subscribeToLogs((msg) => {
      bufferRef.current.push(msg);
      scheduleFlush();
    });
    return unsub;
  }, []);

  return (
    <div className="fixed my-5 top-0 left-0 w-full max-h-40 overflow-y-auto bg-black/70 text-green-400 text-[10px] sm:text-xs p-2 z-[9999] font-mono">
      {logs.map((log, i) => (
        <div key={i}>{log}</div>
      ))}
    </div>
  );
}
