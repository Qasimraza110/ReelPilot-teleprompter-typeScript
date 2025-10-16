const jwt = require("jsonwebtoken");
const { createClient } = require("@deepgram/sdk");
const Recording = require("../models/Recording");
const PerformanceAnalysis = require("../models/PerformanceAnalysis");

// Helper to pick Deepgram API key from env
function getDeepgramApiKey() {
  return (
    process.env.DEEPRGRAM_KEY ||
    process.env.DEEPGRAM_API_KEY ||
    process.env.DEEPGRAM_KEY ||
    ""
  );
}

// Basic list of common filler words; can be expanded or made configurable
const DEFAULT_FILLERS = new Set([
  "um",
  "uh",
  "erm",
  "uhm",
  "ah",
  "hmm",
  "like",
  "you",
  "you know",
  "actually",
  "basically",
  "literally",
  "right",
  "okay",
  "ok",
  "so",
]);

function normalizeWord(word) {
  if (!word) return "";
  return word.toLowerCase().replace(/[^a-z\s]/g, "");
}

function computeMetricsFromWords(words, recordingDurationSec) {
  if (!Array.isArray(words)) words = [];
  const sorted = words
    .filter((w) => typeof w.start === "number" && typeof w.end === "number")
    .sort((a, b) => a.start - b.start);

  const totalWords = sorted.length;
  const effectiveDurationSec = Math.max(
    recordingDurationSec || 0,
    sorted.length ? sorted[sorted.length - 1].end : 0,
  );
  const minutes = effectiveDurationSec > 0 ? effectiveDurationSec / 60 : 1;
  const averageWPM = Math.round(totalWords / minutes);

  // Pauses: gaps between consecutive words greater than threshold
  const longPauseThresholdSec = 0.7;
  let totalPauses = 0;
  let totalPauseDuration = 0;
  let longestPause = 0;
  const pauseTimestamps = [];
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i].start - sorted[i - 1].end;
    if (gap >= longPauseThresholdSec) {
      totalPauses += 1;
      totalPauseDuration += gap;
      if (gap > longestPause) longestPause = gap;
      pauseTimestamps.push(sorted[i - 1].end);
    }
  }
  const averagePauseLength = totalPauses > 0 ? totalPauseDuration / totalPauses : 0;
  const pauseFrequency = effectiveDurationSec > 0 ? totalPauses / (effectiveDurationSec / 60) : 0;

  // Filler words
  const fillerTimestamps = [];
  const fillerWordsFound = [];
  let fillerCount = 0;
  for (const w of sorted) {
    const norm = normalizeWord(w.word || w.punctuated_word || w.text);
    if (DEFAULT_FILLERS.has(norm)) {
      fillerCount += 1;
      fillerWordsFound.push(norm);
      fillerTimestamps.push(w.start);
    }
  }
  const fillerFrequency = minutes > 0 ? fillerCount / minutes : 0;

  return {
    duration: effectiveDurationSec,
    speakingPace: {
      averageWPM,
      minWPM: averageWPM, // placeholders; could compute per-utterance
      maxWPM: averageWPM,
      paceVariability: 0,
      recommendation:
        averageWPM < 110
          ? "Try increasing your pace slightly for better engagement."
          : averageWPM > 170
          ? "Consider slowing down to improve clarity."
          : "Nice pacing—keep it consistent.",
    },
    pauseAnalysis: {
      totalPauses,
      averagePauseLength,
      longestPause,
      pauseFrequency,
      recommendation:
        totalPauses > 8
          ? "Reduce long pauses; consider shorter breaths between sentences."
          : "Pause usage looks good—natural and clear.",
      timestamps: pauseTimestamps,
    },
    fillerWords: {
      count: fillerCount,
      words: fillerWordsFound,
      timestamps: fillerTimestamps,
      frequency: fillerFrequency,
    },
    totalWords,
  };
}

exports.analyzeRecording = async (req, res) => {
  // Auth extract and verify (mirror other controllers)
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }
  const session_id = authHeader.split(" ")[1];
  let decoded;
  try {
    decoded = jwt.verify(session_id, process.env.JWT_SECRET);
    if (!decoded?.userId) throw new Error("Invalid token");
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
  const userId = decoded.userId;

  const deepgramKey = getDeepgramApiKey();
  if (!deepgramKey) {
    return res.status(500).json({ message: "Deepgram API key not configured" });
  }

  const { id } = req.params;
  try {
    const recording = await Recording.findOne({ _id: id, userId });
    if (!recording) {
      return res.status(404).json({ message: "Recording not found or unauthorized" });
    }

    const deepgram = createClient(deepgramKey);

    // Prefer transcribing URL directly to avoid re-encoding server-side
    const response = await deepgram.listen.prerecorded.transcribeUrl(
      { url: recording.url },
      {
        model: "nova-2",
        smart_format: true,
        punctuate: true,
        diarize: false,
        filler_words: true,
        utterances: true,
        paragraphs: true,
        // word timestamps enabled by default with nova models; ensure returned words
      },
    );

    // Deepgram SDK v2 returns a .result with channels/alternatives
    const alt =
      response?.result?.results?.channels?.[0]?.alternatives?.[0] || {};
    const transcript = alt.transcript || "";
    const words = alt.words || [];

    // Compute using per-word timings for better precision
    const metrics = computeMetricsFromWords(words, recording.duration);
    // Prefer average word confidence if present
    let accuracy;
    if (Array.isArray(words) && words.length) {
      const conf = words
        .map((w) => (typeof w.confidence === "number" ? w.confidence : null))
        .filter((v) => v != null);
      if (conf.length) accuracy = conf.reduce((a, b) => a + b, 0) / conf.length;
    }
    if (typeof accuracy !== "number" && typeof alt?.confidence === "number") {
      accuracy = alt.confidence;
    }

    // Compute a simple overall score (placeholder formula)
    const pacingScore = Math.max(
      0,
      100 - Math.abs(metrics.speakingPace.averageWPM - 140),
    );
    const fillerPenalty = Math.min(30, metrics.fillerWords.count * 2);
    const pausePenalty = Math.min(30, Math.round(metrics.pauseAnalysis.totalPauses / 2));
    const overallScore = Math.max(
      10,
      Math.min(100, Math.round((pacingScore - fillerPenalty - pausePenalty))),
    );

    const analysisDoc = new PerformanceAnalysis({
      sessionId: recording._id, // using recording id as session identifier
      userId,
      basicAnalysis: {
        duration: metrics.duration,
        averagePace: metrics.speakingPace.averageWPM,
        totalPauses: metrics.pauseAnalysis.totalPauses,
        scriptCompletionRate: undefined,
        retakeCount: undefined,
      },
      advancedAnalysis: {
        speechAnalysis: {
          fillerWords: metrics.fillerWords,
          speakingPace: metrics.speakingPace,
          toneAnalysis: {
            averagePitch: undefined,
            pitchVariation: undefined,
            energyLevel: undefined,
            emotionDetected: [],
            recommendation: undefined,
          },
          pauseAnalysis: {
            totalPauses: metrics.pauseAnalysis.totalPauses,
            averagePauseLength: metrics.pauseAnalysis.averagePauseLength,
            longestPause: metrics.pauseAnalysis.longestPause,
            pauseFrequency: metrics.pauseAnalysis.pauseFrequency,
            recommendation: metrics.pauseAnalysis.recommendation,
          },
          articulation: {
            clarityScore: undefined,
            pronunciationIssues: [],
            recommendation: undefined,
          },
        },
        visualAnalysis: undefined,
        aiCoaching: undefined,
      },
      overallScore,
      categoryScores: {
        delivery: Math.max(10, 100 - fillerPenalty),
        pacing: Math.max(10, pacingScore),
        visual: undefined,
        engagement: undefined,
      },
      improvements: [],
      strengths: [],
      planFeatures: {
        hasAdvancedAnalysis: true,
        hasAICoaching: false,
        hasExportOptions: false,
      },
      processingStatus: "completed",
      processingTime: undefined,
      aiModelVersion: "deepgram:nova-2",
      completedAt: new Date(),
    });

    await analysisDoc.save();

    return res.status(200).json({
      message: "Analysis completed",
      transcript,
      metrics: { ...metrics, accuracy },
      analysisId: analysisDoc._id,
    });
  } catch (err) {
    console.error("Error analyzing recording:", err);
    return res
      .status(500)
      .json({ message: "Error analyzing recording", error: err.message });
  }
};


// Analyze a raw uploaded video blob directly, without saving the recording to DB
// Expects multipart/form-data with fields:
// - video: File (webm/mp4)
// - duration: optional numeric seconds (string acceptable)
// - transcript: optional precomputed transcript to include
exports.analyzeDirect = async (req, res) => {
  // Auth extract and verify (mirror other controllers)
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }
  const session_id = authHeader.split(" ")[1];
  let decoded;
  try {
    decoded = jwt.verify(session_id, process.env.JWT_SECRET);
    if (!decoded?.userId) throw new Error("Invalid token");
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  const deepgramKey = getDeepgramApiKey();
  if (!deepgramKey) {
    return res.status(500).json({ message: "Deepgram API key not configured" });
  }

  try {
    const file = req.file; // Provided by multer in the route layer
    if (!file || !file.buffer) {
      return res.status(400).json({ message: "No video file provided" });
    }

    // Optional metadata
    const durationSec = req.body?.duration
      ? Number(req.body.duration)
      : undefined;

    const deepgram = createClient(deepgramKey);

    // Transcribe the raw buffer directly
    const response = await deepgram.listen.prerecorded.transcribeFile(
      file.buffer,
      {
        // Help Deepgram parse container/codec properly
        mimetype: file.mimetype || undefined,
        model: "nova-2",
        smart_format: true,
        punctuate: true,
        diarize: false,
        filler_words: true,
        utterances: true,
        paragraphs: true,
      }
    );

    const alt = response?.result?.results?.channels?.[0]?.alternatives?.[0] || {};
    const transcript = alt.transcript || "";
    const words = alt.words || [];

    // Compute metrics using per-word timings for precision
    const metrics = computeMetricsFromWords(words, durationSec);

    // Prefer average word confidence if present
    let accuracy;
    if (Array.isArray(words) && words.length) {
      const conf = words
        .map((w) => (typeof w.confidence === "number" ? w.confidence : null))
        .filter((v) => v != null);
      if (conf.length) accuracy = conf.reduce((a, b) => a + b, 0) / conf.length;
    }
    if (typeof accuracy !== "number" && typeof alt?.confidence === "number") {
      accuracy = alt.confidence;
    }

    // Return analysis only; do NOT save recording entity
    return res.status(200).json({
      message: "Analysis completed",
      transcript,
      metrics: { ...metrics, accuracy },
    });
  } catch (err) {
    console.error("Error in analyze-direct:", err);
    return res
      .status(500)
      .json({ message: "Error analyzing video", error: err.message });
  }
};

