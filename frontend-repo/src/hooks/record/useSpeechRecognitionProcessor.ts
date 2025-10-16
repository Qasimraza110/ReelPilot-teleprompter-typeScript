/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect, useRef, useCallback } from "react";
import { wordsToNumbers } from "words-to-numbers";
//import { debugLog } from "@/utils/debugLogger";

const DEV_LOG = false; 

interface UseSpeechRecognitionProcessorOutput {
  transcript: string;
  currentLineTranscript: string; 
  matchedWordIndices: number[]; 
  listening: boolean;
  browserSupportsSpeechRecognition: boolean;
  currentLineIndex: number;
  currentLineProgress: number;
  spokenWordCount: number;
  accumulatedFinalTranscript: string;
  resetSpeechRecognition: () => void;
  stopSpeechRecognition: () => void;
  speechRecognitionError: Error | null;
  sendAudioData: (data: Int16Array) => void;
  deepgramBackendReady: boolean;
}

const BASE_THRESHOLD = 0.97; // stricter to avoid premature advances
const BUFFER_MAX_SIZE = 500;
const HARD_BUFFER_LIMIT = 160; // buffered words to bound
const BUFFER_TIMEOUT_MS = 100000; // clean stale words 
const COMPLETE_ON_FULL_PREFIX = true; // allow threshold-based completion
const COMPLETE_HOLD_MS = 120; // shorter hold
const MATCH_DEBOUNCE_MS = 50; // debounce
const PAUSE_GRACE_MS = 8000; // allow short pauses without losing buffer
const MIN_LINE_DWELL_MS = 700; // minimum time on a line before non-prefix completion

const processTranscriptNumbers = (
  rawWords: string[],
  convertNumbers = true
): (string | number)[] => {
  const tokens: (string | number)[] = [];
  const scale: { [key: string]: number } = {
    thousand: 1000,
    million: 1000000,
    billion: 1000000000,
    trillion: 1000000000000,
  };

  rawWords.forEach((w) => {
    const lower = w.toLowerCase();
    const num = parseInt(w, 10);

    if (!isNaN(num) && String(num) === w) {
      tokens.push(num);
      return;
    }

    if (convertNumbers) {
      const converted = wordsToNumbers(lower);
      if (typeof converted === "number") {
        tokens.push(converted);
        return;
      }
      if (scale[lower]) {
        tokens.push(scale[lower]);
        return;
      }
    }

    tokens.push(lower);
  });

  return tokens;
};

const normalizeUnicodePunctuation = (text: string): string => {
  return text
    .replace(/[“”«»]/g, '"')
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/\u00A0/g, " ");
};

const normalizeToken = (token: string | number): string | number => {
  if (typeof token === "number") return token;
  const normalized = token
    .toLowerCase()
    .replace(/n't$/, " not")
    .replace(/'re$/, " are")
    .replace(/'ll$/, " will")
    .replace(/'ve$/, " have")
    .replace(/'m$/, " am")
    .replace(/'s$/, "")
    .trim();
  return normalized;
};

const wordsAreSimilar = (w1: string | number, w2: string | number): boolean => {
  if (typeof w1 === "number" && typeof w2 === "number") {
    return w1 === w2;
  }

  if (typeof w1 === "number" && typeof w2 === "string") {
    const converted = wordsToNumbers(w2);
    return converted === w1;
  }
  if (typeof w1 === "string" && typeof w2 === "number") {
    const converted = wordsToNumbers(w1);
    return converted === w2;
  }

  if (typeof w1 === "string" && typeof w2 === "string") {
    const a = normalizeToken(w1);
    const b = normalizeToken(w2);

    if (a === b) return true;

    // Articles can interchange
    const articles = ["a", "an", "the"];
    if (typeof a === "string" && typeof b === "string") {
      if (articles.includes(a) && articles.includes(b)) return true;

      // Prefix matching for longer words
      if (a.length >= 4 && b.length >= 4) {
        if (a.startsWith(b) || b.startsWith(a)) return true;
      }

      // Fuzzy match for very similar words
      if (a.length >= 5 && b.length >= 5) {
        const shorter = a.length < b.length ? a : b;
        const longer = a.length >= b.length ? a : b;
        if (longer.includes(shorter) && Math.abs(a.length - b.length) <= 2) {
          return true;
        }
      }
    }
  }

  return false;
};

// NEW: Proper sequence alignment algorithm
const findBestAlignment = (
  scriptTokens: (string | number)[],
  spokenTokens: (string | number)[]
): {
  matched: number;
  scriptEnd: number;
  spokenEnd: number;
  matchDetails: string[];
  matchedScriptIndices: number[]; // NEW: Track which script words were matched
} => {
  const matchDetails: string[] = [];
  let bestMatched = 0;
  let bestScriptEnd = 0;
  let bestSpokenEnd = 0;
  let bestMatchedIndices: number[] = [];

  // Try limited starting points to reduce work (contiguous prefix prioritizes start)
  for (
    let spokenStart = 0;
    spokenStart < Math.min(spokenTokens.length, 4);
    spokenStart++
  ) {
    let scriptIdx = 0;
    let spokenIdx = spokenStart;
    let matched = 0;
    const localDetails: string[] = [];
    const localMatchedIndices: number[] = [];

    while (scriptIdx < scriptTokens.length && spokenIdx < spokenTokens.length) {
      if (wordsAreSimilar(scriptTokens[scriptIdx], spokenTokens[spokenIdx])) {
        matched++;
        localMatchedIndices.push(scriptIdx); // Track this script word as matched
        localDetails.push(
          `✓ Script[${scriptIdx}]="${scriptTokens[scriptIdx]}" ≈ Spoken[${spokenIdx}]="${spokenTokens[spokenIdx]}"`
        );
        scriptIdx++;
        spokenIdx++;
      } else {
        // Try skipping one word in script (user skipped a word)
        if (
          scriptIdx + 1 < scriptTokens.length &&
          wordsAreSimilar(scriptTokens[scriptIdx + 1], spokenTokens[spokenIdx])
        ) {
          localDetails.push(
            `⊗ Script[${scriptIdx}]="${scriptTokens[scriptIdx]}" SKIPPED`
          );
          scriptIdx++;
          continue;
        }

        // Try skipping one word in spoken (user added extra word)
        if (
          spokenIdx + 1 < spokenTokens.length &&
          wordsAreSimilar(scriptTokens[scriptIdx], spokenTokens[spokenIdx + 1])
        ) {
          localDetails.push(
            `⊕ Spoken[${spokenIdx}]="${spokenTokens[spokenIdx]}" EXTRA`
          );
          spokenIdx++;
          continue;
        }

        // No match, move spoken forward
        localDetails.push(
          `✗ Script[${scriptIdx}]="${scriptTokens[scriptIdx]}" ≠ Spoken[${spokenIdx}]="${spokenTokens[spokenIdx]}"`
        );
        spokenIdx++;
      }
    }

    // Keep the best alignment
    if (matched > bestMatched) {
      bestMatched = matched;
      bestScriptEnd = scriptIdx;
      bestSpokenEnd = spokenIdx;
      matchDetails.length = 0;
      matchDetails.push(...localDetails);
      bestMatchedIndices = [...localMatchedIndices];
    }
  }

  return {
    matched: bestMatched,
    scriptEnd: bestScriptEnd,
    spokenEnd: bestSpokenEnd,
    matchDetails,
    matchedScriptIndices: bestMatchedIndices, // Return which script words matched
  };
};

export function useSpeechRecognitionProcessor(
  scriptLines: string[],
  isRecording: boolean,
  onLineCompletion: (lineIndex: number) => void,
  onRecordingEnd: () => void
): UseSpeechRecognitionProcessorOutput {
  const [transcript, setTranscript] = useState("");
  const [currentLineTranscript, setCurrentLineTranscript] = useState(""); // NEW: Only words for current line
  const [matchedWordIndices, setMatchedWordIndices] = useState<number[]>([]); // NEW: Track matched script words
  const [listening, setListening] = useState(false);
  const [deepgramBackendReady, setDeepgramBackendReady] = useState(false);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [currentLineProgress, setCurrentLineProgress] = useState(0);
  const [spokenWordCount, setSpokenWordCount] = useState(0);
  const [accumulatedFinalTranscript, setAccumulatedFinalTranscript] =
    useState("");
  const [speechRecognitionError, setSpeechRecognitionError] =
    useState<Error | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const spokenBufferRef = useRef<
    Array<{ word: string | number; timestamp: number }>
  >([]);
  const lastMatchTimeRef = useRef<number>(Date.now());
  const pendingCompletionRef = useRef<number | null>(null); // NEW: defer advancing
  const lastCompletedLineToProcessRef = useRef<number | null>(null); // NEW: process previous line when next finishes
  const matchTimerRef = useRef<number | null>(null); // NEW: debounce timer
  const matchRafRef = useRef<number | null>(null); // NEW: coalesce matching on RAF
  const scriptTokensRef = useRef<(string | number)[]>([]); // NEW: cache tokens for current line
  const allScriptTokensRef = useRef<Array<(string | number)[]>>([]); // NEW: pre-tokenized lines
  const interimTokensRef = useRef<(string | number)[]>([]); // NEW: partial (non-final) tokens
  const lineStartTimeRef = useRef<number>(Date.now()); // NEW: track time when current line started
  const prevProgressRef = useRef<number>(-1); // NEW: gate progress updates
  const prevPrefixRef = useRef<number>(-1); // NEW: gate prefix updates

  const isRecordingRef = useRef(isRecording);
  const currentLineIndexRef = useRef(currentLineIndex);
  const scriptLinesRef = useRef(scriptLines);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);
  useEffect(() => {
    currentLineIndexRef.current = currentLineIndex;
  }, [currentLineIndex]);
  useEffect(() => {
    scriptLinesRef.current = scriptLines;
  }, [scriptLines]);

  // Pre-tokenize all lines when script changes
  useEffect(() => {
    const tokenized = (scriptLines || []).map((line) =>
      processTranscriptNumbers(
        normalizeUnicodePunctuation(line || "")
          .toLowerCase()
          .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "")
          .split(/\s+/)
          .filter(Boolean),
        true
      )
    );
    allScriptTokensRef.current = tokenized;
  }, [scriptLines]);

  // NEW: cache current line tokens when line index changes
  useEffect(() => {
    const idx = currentLineIndex;
    const tokens = allScriptTokensRef.current[idx] ?? [];
    scriptTokensRef.current = tokens;
    // reset per-line UI state
    setMatchedWordIndices([]);
    setCurrentLineProgress(0);
    lineStartTimeRef.current = Date.now();
  }, [currentLineIndex, scriptLines]);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  const deepgramWsBaseEndpoint = backendUrl
    ? backendUrl.replace(/^http/, "ws") + "/transcribe"
    : "";

  const resetSpeechRecognition = useCallback(() => {
    setTranscript("");
    setCurrentLineTranscript(""); // NEW: Clear current line transcript
    setMatchedWordIndices([]); // NEW: Clear matched indices
    setListening(false);
    setDeepgramBackendReady(false);
    setCurrentLineIndex(0);
    setCurrentLineProgress(0);
    setSpokenWordCount(0);
    setAccumulatedFinalTranscript("");
    spokenBufferRef.current = [];
    lastMatchTimeRef.current = Date.now();
    lineStartTimeRef.current = Date.now();
    setSpeechRecognitionError(null);
    if (matchTimerRef.current) {
      clearTimeout(matchTimerRef.current);
      matchTimerRef.current = null;
    }
    if (matchRafRef.current) {
      cancelAnimationFrame(matchRafRef.current);
      matchRafRef.current = null;
    }
   // debugLog("[SpeechRecog] Reset complete", []);
  }, []);

  const stopSpeechRecognition = useCallback(() => {
    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING)
    ) {
      wsRef.current.close();
     // debugLog("[SpeechRecog] WS closed by client.", []);
    }
    setListening(false);
    setDeepgramBackendReady(false);
  }, []);

  const sendAudioData = useCallback(
    (data: Int16Array) => {
      if (
        !deepgramBackendReady ||
        !wsRef.current ||
        wsRef.current.readyState !== WebSocket.OPEN
      )
        return;
      wsRef.current.send(data.buffer);
    },
    [deepgramBackendReady]
  );

  const cleanStaleWords = useCallback(() => {
    const now = Date.now();
    const oldLength = spokenBufferRef.current.length;
    spokenBufferRef.current = spokenBufferRef.current.filter((item) => {
      return now - item.timestamp < Math.max(PAUSE_GRACE_MS, BUFFER_TIMEOUT_MS);
    });

    const newLength = spokenBufferRef.current.length;
    if (newLength < oldLength) {
      // debugLog(
      //   `[SpeechRecog] Cleaned ${oldLength - newLength} stale words`,
      //   []
      // );
      setSpokenWordCount(newLength);
    }
  }, []);


  const scheduleMatching = useCallback(() => {
    if (matchRafRef.current !== null) return;
    matchRafRef.current = requestAnimationFrame(() => {
      matchRafRef.current = null;
      internalRunMatching();
    });
  }, []);

  const internalRunMatching = () => {
    if (!isRecordingRef.current) return;

    const idx = currentLineIndexRef.current;
    const lines = scriptLinesRef.current;
    if (!lines || idx >= lines.length) return;

    cleanStaleWords();

    const spokenTokensFinal = spokenBufferRef.current.map((item) => item.word);
    const combinedSpokenTokens = interimTokensRef.current.length
      ? [...spokenTokensFinal, ...interimTokensRef.current]
      : spokenTokensFinal;
    const rawLine = lines[idx] || "";

    if (!rawLine.trim()) {
      onLineCompletion(idx);
      setCurrentLineIndex((prev) => prev + 1);
      return;
    }

    // Use cached tokens for current line
    const scriptTokens = scriptTokensRef.current;

    // if (DEV_LOG) {
    //   debugLog(`[Matching] Line ${idx}: "${rawLine}"`, scriptTokens);
    //   debugLog(
    //     `[Matching] Script tokens (${scriptTokens.length}):`,
    //     scriptTokens
    //   );
    //   debugLog(
    //     `[Matching] Spoken tokens (${combinedSpokenTokens.length}):`,
    //     combinedSpokenTokens
    //   );
    // }

    // Use the new alignment algorithm
    const alignment = findBestAlignment(scriptTokens, combinedSpokenTokens);

    // Log match details
    // if (DEV_LOG) {
    //   alignment.matchDetails.forEach((detail) => {
    //     debugLog(`[Alignment] ${detail}`, []);
    //   });
    // }

    // NEW: compute contiguous prefix length from matched indices
    const matchedSet = new Set<number>(alignment.matchedScriptIndices);
    let contiguousPrefix = 0;
    while (matchedSet.has(contiguousPrefix)) {
      contiguousPrefix++;
    }

    // Progress is based ONLY on contiguous prefix from the start
    const progress =
      scriptTokens.length > 0 ? contiguousPrefix / scriptTokens.length : 0;
    if (
      prevProgressRef.current === -1 ||
      Math.abs(prevProgressRef.current - progress) > 0.001
    ) {
      prevProgressRef.current = progress;
      setCurrentLineProgress(progress);
    }

    // Drive highlighting strictly by contiguous prefix
    if (prevPrefixRef.current !== contiguousPrefix) {
      prevPrefixRef.current = contiguousPrefix;
      setMatchedWordIndices(
        Array.from({ length: contiguousPrefix }, (_, i) => i)
      );
    }

    // NEW: extend timestamps of matched prefix words to protect from staling during pauses
    if (contiguousPrefix > 0 && spokenBufferRef.current.length > 0) {
      const nowTs = Date.now();
      for (
        let i = 0;
        i < spokenBufferRef.current.length && i < contiguousPrefix;
        i++
      ) {
        spokenBufferRef.current[i].timestamp = nowTs;
      }
    }

    // Adaptive threshold biased to complete earlier for longer lines
    //   const adaptive = Math.min(
    //     0.97,
    //     Math.max(0.97, 0.97 + 0.8 / Math.max(3, scriptTokens.length))
    //   );
    //   const threshold = Math.min(0.95, Math.max(BASE_THRESHOLD, adaptive));

    // if (DEV_LOG) {
    //   debugLog(`[Progress] Matched ${contiguousPrefix}/${scriptTokens.length} (${(progress * 100).toFixed(1)}%) | Threshold: ${(threshold * 100).toFixed(1)}%`, scriptTokens);
    // }

    // let shouldComplete = COMPLETE_ON_FULL_PREFIX
    //   ? contiguousPrefix === scriptTokens.length
    //   : scriptTokens.length > 0 && progress >= threshold;
    // Require full line match before advancing
    const adaptive = 1.0;
    const threshold = 1.0;

    if (DEV_LOG) {
      // debugLog(
      //   `[Progress] Matched ${contiguousPrefix}/${scriptTokens.length} (${(
      //     progress * 100
      //   ).toFixed(1)}%) | Threshold: ${(threshold * 100).toFixed(1)}%`,
      //   scriptTokens
      // );
    }

    // Move to next line only when all tokens match (100%)
    let shouldComplete = contiguousPrefix === scriptTokens.length;

    // FAST-FORWARD: if current line doesn't meet threshold but next line matches very strongly, jump ahead
    let shouldFastForward = false;
    if (
      !shouldComplete &&
      idx + 1 < lines.length &&
      combinedSpokenTokens.length > 0
    ) {
      const nextTokens = processTranscriptNumbers(
        normalizeUnicodePunctuation(lines[idx + 1] || "")
          .toLowerCase()
          .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "")
          .split(/\s+/)
          .filter(Boolean),
        true
      );
      const nextAlign = findBestAlignment(nextTokens, combinedSpokenTokens);
      const nextSet = new Set<number>(nextAlign.matchedScriptIndices);
      let nextPrefix = 0;
      while (nextSet.has(nextPrefix)) nextPrefix++;
      const nextProgress =
        nextTokens.length > 0 ? nextPrefix / nextTokens.length : 0;
      // If the next line has a very high prefix match and we've dwelled long enough, assume the user skipped ahead
      const dwellOk =
        Date.now() - lineStartTimeRef.current >= MIN_LINE_DWELL_MS;
      if (dwellOk && nextProgress >= 0.8 && nextPrefix >= 4) {
        shouldFastForward = true;
      }
    }

    // FALLBACK COMPLETION: if prefix is struggling but overall alignment is strong, complete to avoid getting stuck
    if (!shouldComplete && !shouldFastForward) {
      const overallRatio =
        scriptTokens.length > 0 ? alignment.matched / scriptTokens.length : 0;
      const timeSinceLastMatchMs = Date.now() - lastMatchTimeRef.current;
      const dwellOk =
        Date.now() - lineStartTimeRef.current >= MIN_LINE_DWELL_MS;
      // Much stricter fallback: only trigger if user appears truly stuck (very long pause + high match)
      if (
        (dwellOk &&
          overallRatio >= 0.85 &&
          timeSinceLastMatchMs > 8000 &&
          alignment.matched >= 6) || // 85% match + 8s pause
        (timeSinceLastMatchMs > 12000 && alignment.matched >= 4) // or 12s complete silence with some matches
      ) {
        shouldComplete = true;
      }
    }

    if (shouldComplete || shouldFastForward) {
      // If a completion is already pending, let it finish
      if (pendingCompletionRef.current) {
        return;
      }

      // Hold briefly so UI shows final word as green
      setMatchedWordIndices(
        Array.from({ length: scriptTokens.length }, (_, i) => i)
      );
      setCurrentLineProgress(1);

      pendingCompletionRef.current = window.setTimeout(() => {
        pendingCompletionRef.current = null;

        // debugLog(
        //   `[LineComplete] Line ${idx}${
        //     shouldFastForward ? " (fast-forward)" : ""
        //   } completed!`,
        //   scriptTokens
        // );

        // DEFERRED PROCESSING: when current line completes, process the previously completed line instead
        if (lastCompletedLineToProcessRef.current !== null) {
          try {
            onLineCompletion(lastCompletedLineToProcessRef.current);
          } catch (e) {
           // console.error("onLineCompletion error (deferred):", e);
          }
        }
        // Now mark current line as the one to be processed at the next completion
        lastCompletedLineToProcessRef.current = idx;
        lastMatchTimeRef.current = Date.now();

        // If interim tokens exist, commit them to buffer before consuming
        if (interimTokensRef.current.length) {
          const nowCommit = Date.now();
          interimTokensRef.current.forEach((word) => {
            spokenBufferRef.current.push({ word, timestamp: nowCommit });
          });
          interimTokensRef.current = [];
        }

        // Consume matched words from buffer up to alignment.spokenEnd (or next alignment if fast-forward)
        const consumeEnd = shouldFastForward
          ? (() => {
              const nextTokens = processTranscriptNumbers(
                normalizeUnicodePunctuation(lines[idx + 1] || "")
                  .toLowerCase()
                  .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "")
                  .split(/\s+/)
                  .filter(Boolean),
                true
              );
              const na = findBestAlignment(
                nextTokens,
                spokenBufferRef.current.map((i) => i.word)
              );
              return Math.max(alignment.spokenEnd, na.spokenEnd);
            })()
          : alignment.spokenEnd;
        const bufferNow = spokenBufferRef.current.map((i) => i.word);
        const consumedWords = bufferNow.slice(0, consumeEnd).map(String);
        setAccumulatedFinalTranscript((prev) => {
          const prevArr = prev ? prev.split(/\s+/).filter(Boolean) : [];
          return [...prevArr, ...consumedWords].join(" ").trim();
        });

        // Keep remaining words with fresh timestamp
        const now = Date.now();
        spokenBufferRef.current = bufferNow
          .slice(alignment.spokenEnd)
          .map((word) => ({
            word,
            timestamp: now,
          }));
        setSpokenWordCount(spokenBufferRef.current.length);

        // Reset per-line UI state
        const bufferTranscript = spokenBufferRef.current
          .map((item) => String(item.word))
          .join(" ");
        setCurrentLineTranscript(bufferTranscript);
        setMatchedWordIndices([]);

        setCurrentLineIndex((prev) => {
          const nextLine = shouldFastForward ? prev + 2 : prev + 1;
          if (nextLine >= scriptLinesRef.current.length) {
           // debugLog("[SpeechRecog] Script completed!", []);
            // At script end, ensure any pending line gets processed now (including the final line)
            if (lastCompletedLineToProcessRef.current !== null) {
              try {
                onLineCompletion(lastCompletedLineToProcessRef.current);
              } catch (e) {
             //   console.error("onLineCompletion error (final flush):", e);
              }
              lastCompletedLineToProcessRef.current = null;
            }
            onRecordingEnd();
            return prev;
          }
          return nextLine;
        });

        setCurrentLineProgress(0);
        // Immediately run matching for the next line to catch up when speaking fast
        setTimeout(() => runMatching(), 0);
      }, COMPLETE_HOLD_MS);
    } else {
      // Skip updating currentLineTranscript every cycle to reduce string work

      // Limit buffer size
      if (spokenBufferRef.current.length > BUFFER_MAX_SIZE) {
        const excess = spokenBufferRef.current.length - BUFFER_MAX_SIZE;
        // debugLog(
        //   `[Buffer] Trimming ${excess} old words (buffer too large)`,
        //   []
        // );
        spokenBufferRef.current = spokenBufferRef.current.slice(excess);
        setSpokenWordCount(spokenBufferRef.current.length);
      }
    }
  };

  const runMatching = useCallback(internalRunMatching, [
    onLineCompletion,
    onRecordingEnd,
    cleanStaleWords,
  ]);

  useEffect(() => {
    if (!deepgramWsBaseEndpoint) {
      setSpeechRecognitionError(new Error("WebSocket endpoint not available."));
      return;
    }

    let sampleRate: number;
    const setup = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        audioContextRef.current = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
        sampleRate = audioContextRef.current.sampleRate;
        stream.getTracks().forEach((t) => t.stop());
      } catch {
        sampleRate = 48000;
      }

      const url = `${deepgramWsBaseEndpoint}?sampleRate=${sampleRate}`;
      wsRef.current = new WebSocket(url);

      wsRef.current.onopen = () => {
        setListening(true);
        setSpeechRecognitionError(null);
      //  debugLog("[SpeechRecog] WebSocket connected", []);
      };

      wsRef.current.onmessage = (evt: MessageEvent) => {
        try {
          const data = JSON.parse(evt.data as string);
         // debugLog(`[WS] Message: type=${data.type}`, []);

          if (data.type === "transcript") {
            const rec = data.transcript ?? "";
            setTranscript(rec);

            // Live metrics forwarded from backend
            if (typeof (data as any).wpm === "number") {
              (window as any).__LIVE_WPM__ = (data as any).wpm;
            }
            if (typeof (data as any).fillerCount === "number") {
              (window as any).__LIVE_FILLER__ = (data as any).fillerCount;
            }
            if (typeof (data as any).accuracy === "number") {
              (window as any).__LIVE_ACCURACY__ = (data as any).accuracy;
            }

            const words = normalizeUnicodePunctuation(rec)
              .toLowerCase()
              .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "")
              .split(/\s+/)
              .filter(Boolean);

            if (!data.is_final) {
              // Update interim tokens and schedule lightweight matching
              interimTokensRef.current = processTranscriptNumbers(words, true);
              if (matchTimerRef.current)
                window.clearTimeout(matchTimerRef.current);
              matchTimerRef.current = window.setTimeout(() => {
                matchTimerRef.current = null;
                scheduleMatching();
              }, Math.min(30, MATCH_DEBOUNCE_MS));
            }

            if (data.is_final && rec.trim()) {
             // debugLog(`[Final Transcript] "${rec}"`, []);

              const processed = processTranscriptNumbers(words, true);
              const now = Date.now();

              processed.forEach((word) => {
                spokenBufferRef.current.push({ word, timestamp: now });
              });
              interimTokensRef.current = [];

              setSpokenWordCount(spokenBufferRef.current.length);
              if (DEV_LOG) {
                // debugLog(
                //   `[Buffer] Added ${processed.length} words. Total: ${spokenBufferRef.current.length}`,
                //   processed
                // );
              }

              // Hard cap buffer to bound matching cost
              if (spokenBufferRef.current.length > HARD_BUFFER_LIMIT) {
                const excess =
                  spokenBufferRef.current.length - HARD_BUFFER_LIMIT;
                spokenBufferRef.current = spokenBufferRef.current.slice(excess);
                setSpokenWordCount(spokenBufferRef.current.length);
              }

              // Debounce and coalesce matching via RAF
              if (matchTimerRef.current)
                window.clearTimeout(matchTimerRef.current);
              matchTimerRef.current = window.setTimeout(() => {
                matchTimerRef.current = null;
                scheduleMatching();
              }, MATCH_DEBOUNCE_MS);
            }
          } else if (data.type === "deepgram_ready") {
            setDeepgramBackendReady(true);
           // debugLog("[SpeechRecog] Deepgram ready", []);
          } else if (data.type === "error") {
            const errorMsg = data.message || "Deepgram error";
           // debugLog(`[Error] ${errorMsg}`, []);
            setSpeechRecognitionError(new Error(errorMsg));
            stopSpeechRecognition();
          }
        } catch (e) {
        //  console.error("WS parse error:", e);
        }
      };

      wsRef.current.onerror = () => {
       // debugLog("[SpeechRecog] WebSocket error", []);
        setSpeechRecognitionError(new Error("WebSocket error"));
      };

      wsRef.current.onclose = () => {
       // debugLog("[SpeechRecog] WebSocket closed", []);
        setListening(false);
        setDeepgramBackendReady(false);
      };
    };

    setup();

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, [deepgramWsBaseEndpoint, stopSpeechRecognition, runMatching]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isRecordingRef.current) {
        cleanStaleWords();
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [cleanStaleWords]);

  useEffect(() => {
    runMatching();
  }, [currentLineIndex, runMatching]);
  useEffect(() => {
    if (isRecording) runMatching();
  }, [isRecording, runMatching]);

  // NEW: cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (matchTimerRef.current) {
        clearTimeout(matchTimerRef.current);
        matchTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      if (pendingCompletionRef.current) {
        clearTimeout(pendingCompletionRef.current);
        pendingCompletionRef.current = null;
      }
    };
  }, []);

  return {
    transcript,
    currentLineTranscript, // NEW: Export current line transcript for highlighting
    matchedWordIndices, // NEW: Export matched word indices for highlighting
    listening,
    browserSupportsSpeechRecognition: true,
    currentLineIndex,
    currentLineProgress,
    spokenWordCount,
    accumulatedFinalTranscript,
    resetSpeechRecognition,
    stopSpeechRecognition,
    speechRecognitionError,
    sendAudioData,
    deepgramBackendReady,
  };
}
