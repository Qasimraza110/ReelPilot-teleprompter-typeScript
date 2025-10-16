require("dotenv").config();
const express = require("express");
const http = require("http"); // Import the http module
const WebSocket = require("ws"); // Import the ws library
const url = require("url"); // Import the url module for parsing WebSocket request URLs

const ConnectDB = require("../config/db.js");
var cors = require("cors");
const cookieParser = require("cookie-parser");
const authMiddleware = require("../middleware/authMiddleware.js");
// routes
const authRoutes = require("../routes/auth.js");
const userRoutes = require("../routes/user.js");
const scriptRoutes = require("../routes/script.js");
const recordingRoutes = require("../routes/recordings.js");
const webhookRoutes = require("../routes/webhooks.js");

// Ensure this is set in your .env or environment variables in the backend
const deepgramApiKey = process.env.DEEPRGRAM_KEY; // Make sure this env var is available in your backend

// Connect to MongoDB
ConnectDB();

// Init Express app + use CORS for security
const app = express();
const port = 5000; // Your existing Express port

// CORS for Express HTTP routes
const allowedOrigins = [
  "http://localhost:3000",
  "https://reelpilot.vercel.app",
  "https://pcw04dvz-3000.asse.devtunnels.ms",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        console.log(
          "Request with no Origin header (server-to-server or Postman)"
        );
        return callback(null, true); // allow
      }

      if (allowedOrigins.includes(origin)) {
        console.log(`✅ Allowed CORS request from: ${origin}`);
        return callback(null, true);
      } else {
        console.warn(`🚨 Blocked unauthorized CORS request from: ${origin}`);
        return callback(null, false); // reject but still logs
      }
    },
    credentials: true,
  })
);

app.use(cookieParser());

// Webhooks (raw body parsing)
app.use(
  "/api/webhooks/",
  express.raw({ type: "application/json" }),
  webhookRoutes
);

app.use(express.json()); // For parsing application/json

app.get("/", (req, res) => {
  res.send("Hello, World! (Express Backend)");
});

// Auth routes
app.use("/api/auth/", authRoutes);
// User routes
app.use("/api/user/", authMiddleware, userRoutes);
// Script routes
app.use("/api/scripts/", authMiddleware, scriptRoutes);
// Recording routes
app.use("/api/recordings/", authMiddleware, recordingRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error("Global error handler:", err);
  res
    .status(500)
    .json({ message: "Internal Server Error", error: err.message });
});

// --- WebSocket Integration ---
// --- WebSocket Integration ---
const server = http.createServer(app);
const wss = new WebSocket.Server({ noServer: true });

// WebSocket Connection Handling (Deepgram logic goes here)
wss.on("connection", (ws, req) => {
  const clientId = Math.random().toString(36).substring(2, 8); // Unique ID for this client connection
  console.log(`[Client-${clientId}] Client WebSocket connected to backend.`);

  // --- Parse query parameters from the WebSocket request URL ---
  const parsedUrl = url.parse(req.url, true);
  const { sampleRate } = parsedUrl.query;

  if (sampleRate) {
    console.log(`[Client-${clientId}] Detected sampleRate: ${sampleRate}`);
  }

  // --- Deepgram API Key Check ---
  if (!deepgramApiKey) {
    console.error(
      `[Client-${clientId}] ERROR: DEEPRGRAM_KEY is not set in backend environment variables. Cannot proceed with Deepgram.`
    );
    ws.send(
      JSON.stringify({
        type: "error",
        message: "Deepgram API key not configured on server.",
      })
    );
    ws.close(1011, "Deepgram API Key Missing");
    return;
  }
  console.log(
    `[Client-${clientId}] Deepgram API Key loaded. Key starts with: ${deepgramApiKey.substring(
      0,
      5
    )}...`
  );

  let deepgramWs; // Renamed from deepgramLive for clarity with raw ws package
  let keepAliveInterval;
  let deepgramConnectTimeout;

  try {
    console.log(
      `[Client-${clientId}] Attempting to establish Deepgram live connection using raw 'ws' package...`
    );

    // --- Deepgram WebSocket URL Construction ---
    // Parameters are passed as query string for raw WebSocket connections
const deepgramUrlParams = new URLSearchParams({
  model: "nova-2",
  language: "en-US",
  smart_format: "true",
  punctuate: "true",
  interim_results: "true",
  channels: "1",
  encoding: "linear16",
  sample_rate: sampleRate.toString(),
  endpointing: "2000", 
}).toString();

    const deepgramWsEndpoint = `wss://api.deepgram.com/v1/listen?${deepgramUrlParams}`;

    deepgramWs = new WebSocket(deepgramWsEndpoint, {
      headers: {
        Authorization: `Token ${deepgramApiKey}`,
      },
    });

    // Set a timeout for Deepgram connection
    deepgramConnectTimeout = setTimeout(() => {
      if (deepgramWs.readyState !== WebSocket.OPEN) {
        console.error(
          `[Client-${clientId}] ERROR: Deepgram connection timed out after 10 seconds. Current state: ${deepgramWs.readyState} (0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED).`
        );
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Deepgram connection failed to open within timeout.",
              code: "DG_TIMEOUT",
            })
          );
          ws.close(1011, "Deepgram Timeout");
        }
        if (deepgramWs.readyState === WebSocket.CONNECTING) {
          console.log(
            `[Client-${clientId}] Attempting to explicitly terminate timed-out Deepgram connection.`
          );
          deepgramWs.terminate(); // Use terminate for force-closing a connecting or stuck socket
        }
      }
    }, 10000); // 10 seconds timeout

    // --- Deepgram WebSocket Event Listeners ---
    deepgramWs.on("open", () => {
      console.log(
        `[Client-${clientId}] Deepgram WebSocket connected (backend to Deepgram) - READY TO RECEIVE AUDIO.`
      );
      if (deepgramConnectTimeout) clearTimeout(deepgramConnectTimeout); // Clear timeout on success

      // Optional: Notify client that backend-to-Deepgram connection is ready
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "deepgram_ready" }));
      }

      keepAliveInterval = setInterval(() => {
        if (deepgramWs && deepgramWs.readyState === WebSocket.OPEN) {
          deepgramWs.send(JSON.stringify({ type: "KeepAlive" })); // Send JSON for KeepAlive
          console.log(`[Client-${clientId}] Deepgram keepAlive sent.`); // Only uncomment if you need very verbose logs
        }
      }, 5000);
    });

    const DEFAULT_FILLERS = new Set([
      "um",
      "uh",
      "erm",
      "uhm",
      "ah",
      "hmm",
      "like",
      "you know",
      "actually",
      "basically",
      "literally",
      "right",
      "okay",
      "ok",
      "so",
    ]);

    function normalizeWordForFiller(w) {
      return (w || "").toLowerCase().replace(/[^a-z\s]/g, "");
    }

    function computeLiveMetrics(alt, isFinal) {
      // alt may contain: transcript, words[], confidence
      const transcript = alt?.transcript || "";
      const words = Array.isArray(alt?.words) ? alt.words : [];

      // Use per-word data for the most accurate metrics
      let fillerCount = 0;
      let wordCountForWpm = 0;
      let longPauses = 0;
      let firstStart = null;
      let lastEnd = null;
      let confidenceSum = 0;
      let confidenceN = 0;

      for (let i = 0; i < words.length; i++) {
        const w = words[i] || {};
        const raw = w.word || w.punctuated_word || w.text || "";
        const norm = normalizeWordForFiller(raw);
        if (norm && /[a-z]/.test(norm)) wordCountForWpm++;
        if (DEFAULT_FILLERS.has(norm)) fillerCount++;

        const s = typeof w.start === "number" ? w.start : null;
        const e = typeof w.end === "number" ? w.end : null;
        if (s != null && e != null) {
          if (firstStart == null) firstStart = s;
          lastEnd = e;
        }
        if (typeof w.confidence === "number") {
          confidenceSum += w.confidence;
          confidenceN++;
        }

        if (i > 0) {
          const prev = words[i - 1] || {};
          const prevEnd = typeof prev.end === "number" ? prev.end : null;
          const curStart = typeof w.start === "number" ? w.start : null;
          if (prevEnd != null && curStart != null) {
            const gap = curStart - prevEnd;
            if (gap >= 0.7) longPauses++;
          }
        }
      }

      let wpm;
      if (firstStart != null && lastEnd != null && lastEnd > firstStart) {
        const minutes = (lastEnd - firstStart) / 60;
        if (minutes > 0) wpm = Math.round(wordCountForWpm / minutes);
      }

      // Accuracy: prefer average word confidence, fallback to alternative-level confidence
      let accuracy = undefined;
      if (confidenceN > 0) accuracy = confidenceSum / confidenceN;
      else if (typeof alt?.confidence === "number") accuracy = alt.confidence;

      return {
        fillerCount,
        wpm,
        longPauses,
        accuracy,
        is_final: !!isFinal,
        transcript,
      };
    }

    deepgramWs.on("message", (data) => {
      let response;
      try {
        response = JSON.parse(data.toString()); // Convert Buffer to string before parsing
      } catch (e) {
        console.error(
          `[Client-${clientId}] Failed to parse Deepgram message as JSON: ${data
            .toString()
            .substring(0, 100)}...`,
          e.message
        );
        return;
      }

      if (response.type === "Results") {
        const alt = response.channel?.alternatives?.[0] || {};
        const transcript = alt.transcript;
        if (transcript) {
          console.log(
            `[Client-${clientId}] Deepgram Transcript (is_final: ${response.is_final}): "${transcript}"`
          ); // NEW: Added is_final

          // Optionally, log all alternatives or word details for debugging
          // console.log(`[Client-${clientId}] Deepgram Alternatives: ${JSON.stringify(response.channel.alternatives, null, 2)}`);

          const live = computeLiveMetrics(alt, response.is_final);
          ws.send(
            JSON.stringify({
              type: "transcript",
              is_final: response.is_final,
              transcript: transcript,
              fillerCount: live.fillerCount,
              wpm: live.wpm,
              longPauses: live.longPauses,
              accuracy: live.accuracy,
            })
          );
        } else {
          console.log(
            `[Client-${clientId}] Deepgram Results message received with no transcript. Is_final: ${response.is_final}`
          ); // NEW
          // console.log(response)
        }
      } else if (response.type === "Metadata") {
        console.log(
          `[Client-${clientId}] Deepgram Metadata received:`,
          JSON.stringify(response, null, 2)
        );
        ws.send(
          JSON.stringify({
            type: "metadata",
            ...response, // Forward entire metadata object
          })
        );
      } else if (response.type === "SpeechStarted") {
        console.log(
          `[Client-${clientId}] Deepgram Speech Started:`,
          JSON.stringify(response, null, 2)
        );
        ws.send(
          JSON.stringify({
            type: "speech_started",
            ...response,
          })
        );
      } else if (response.type === "UtteranceEnd") {
        console.log(
          `[Client-${clientId}] Deepgram Utterance End:`,
          JSON.stringify(response, null, 2)
        );
        ws.send(
          JSON.stringify({
            type: "utterance_end",
            ...response,
          })
        );
      } else if (response.type === "Error") {
        console.error(
          `[Client-${clientId}] Deepgram API Error (from Deepgram):`,
          JSON.stringify(response, null, 2)
        );
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: `Deepgram API Error: ${response.message || "Unknown error"
                }`,
              code: response.code,
              details: response.details,
            })
          );
          ws.close(1011, "Deepgram API Error"); // Close client if Deepgram sends an error
        }
      } else {
        // console.log(`[Client-${clientId}] Deepgram (other message type: ${response.type}):`, response);
      }
    });

    deepgramWs.on("close", (code, reason) => {
      console.log(
        `[Client-${clientId}] Deepgram WebSocket closed (backend to Deepgram). Code: ${code}, Reason: ${reason ? reason.toString() : "No reason"
        }.`
      );
      if (deepgramConnectTimeout) clearTimeout(deepgramConnectTimeout);
      if (keepAliveInterval) clearInterval(keepAliveInterval);
      if (ws.readyState === WebSocket.OPEN) {
        console.log(
          `[Client-${clientId}] Closing client WebSocket due to Deepgram closure.`
        );
        ws.send(
          JSON.stringify({
            type: "deepgram_closed",
            code,
            reason: reason ? reason.toString() : "No reason",
          })
        );
        ws.close(1000, "Deepgram connection closed");
      }
    });

    deepgramWs.on("error", (error) => {
      console.error(
        `[Client-${clientId}] ERROR: Deepgram WebSocket Error (backend to Deepgram - raw 'ws'):`,
        error.message,
        error.stack
      );
      if (deepgramConnectTimeout) clearTimeout(deepgramConnectTimeout);
      if (keepAliveInterval) clearInterval(keepAliveInterval);
      if (
        deepgramWs.readyState === WebSocket.CONNECTING ||
        deepgramWs.readyState === WebSocket.OPEN
      ) {
        // Attempt graceful close if still connecting or open
        deepgramWs.close(1011, "Backend Deepgram Error");
      }
      if (ws.readyState === WebSocket.OPEN) {
        console.log(
          `[Client-${clientId}] Sending error to client and closing client WebSocket.`
        );
        ws.send(
          JSON.stringify({
            type: "error",
            message: `Deepgram Connection Error (backend): ${error.message || "Unknown Deepgram connection error"
              }`,
            code: "WS_ERROR",
          })
        );
        ws.close(1011, "Deepgram WS Error");
      }
    });

    // --- Client WebSocket Event Listeners (from frontend) ---
    ws.on("message", (message) => {
      // const fs = require("fs");
      // const out = fs.createWriteStream("debug_audio.raw"); // not .webm!
      // out.write(message);
      // console.log(
      //   `[Client-${clientId}] Received message from client. Type: ${typeof message}, Size: ${
      //     message.length
      //   } bytes.`
      // ); // NEW: Added message type
      if (
        Buffer.isBuffer(message) &&
        deepgramWs &&
        deepgramWs.readyState === WebSocket.OPEN
      ) {
        // NEW: Confirming data forwarding
        // console.log(
        // `[Client-${clientId}] Forwarding ${message.length} bytes to Deepgram.`
        // );
        deepgramWs.send(message); // Forward raw audio buffer directly to Deepgram
      } else {
        console.warn(
          `[Client-${clientId}] Cannot send message to Deepgram. Deepgram WebSocket state: ${deepgramWs ? deepgramWs.readyState : "undefined"
          }. Message type: ${typeof message}.`
        );
        console.log(`[Client-${clientId}] Message:`, message);
        // Optionally, send an error back to the client if Deepgram isn't ready
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Backend-to-Deepgram connection not ready.",
            })
          );
        }
      }
    });

    ws.on("close", (code, reason) => {
      console.log(
        `[Client-${clientId}] Client WebSocket disconnected from backend. Code: ${code}, Reason: ${reason ? reason.toString() : "No reason"
        }`
      );
      if (deepgramWs && deepgramWs.readyState === WebSocket.OPEN) {
        console.log(
          `[Client-${clientId}] Flushing remaining audio to Deepgram before closing...`
        );

        // Send CloseStream message to Deepgram before closing
        deepgramWs.send(JSON.stringify({ type: "CloseStream" }));

        // IMPORTANT: Wait for Deepgram to send final transcripts
        setTimeout(() => {
          if (deepgramWs && deepgramWs.readyState === WebSocket.OPEN) {
            console.log(`[Client-${clientId}] Now closing Deepgram connection after flush delay.`);
            deepgramWs.close();
          }
        }, 1000); 
      } else if (deepgramWs && deepgramWs.readyState === WebSocket.CONNECTING) {
        console.log(
          `[Client-${clientId}] Client disconnected while Deepgram was connecting. Terminating Deepgram connection.`
        );
        deepgramWs.terminate();
      }
      if (keepAliveInterval) clearInterval(keepAliveInterval);
      if (deepgramConnectTimeout) clearTimeout(deepgramConnectTimeout);
    });

    ws.on("error", (error) => {
      console.error(
        `[Client-${clientId}] ERROR: Client WebSocket Error (from backend's 'ws' instance handling frontend connection):`,
        error.message,
        error.stack
      );
      if (deepgramWs && deepgramWs.readyState === WebSocket.OPEN) {
        console.log(
          `[Client-${clientId}] Finishing Deepgram connection due to client WebSocket error.`
        );
        deepgramWs.send(JSON.stringify({ type: "CloseStream" }));
        deepgramWs.close();
      } else if (deepgramWs && deepgramWs.readyState === WebSocket.CONNECTING) {
        console.log(
          `[Client-${clientId}] Client error while Deepgram was connecting. Terminating Deepgram connection.`
        );
        deepgramWs.terminate();
      }
      if (keepAliveInterval) clearInterval(keepAliveInterval);
      if (deepgramConnectTimeout) clearTimeout(deepgramConnectTimeout);
    });
  } catch (error) {
    // This catch block would only hit if `new WebSocket` throws synchronously (rare for invalid URL)
    console.error(
      `[Client-${clientId}] ERROR: Failed to initialize Deepgram WebSocket on backend (synchronous error):`,
      error.message,
      error.stack
    );
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "error",
          message: `Server Error (Deepgram WS initialization): ${error.message}`,
        })
      );
      ws.close(1011, "Deepgram WS Init Failed");
    }
  }
});

// Manual upgrade handler (this part remains the same)
server.on("upgrade", function upgrade(request, socket, head) {
  const origin = request.headers.origin;
  const allowedOrigins = [
    "http://localhost:3000",
    "https://reelpilot.vercel.app",
    "https://pcw04dvz-3000.asse.devtunnels.ms",
    undefined,
    // Add your production frontend URL here when deploying
  ];

  console.log(`[Upgrade] WebSocket upgrade request for URL: ${request.url}`);
  console.log(`[Upgrade] Request Origin: ${origin}`);
  console.log(`[Upgrade] Allowed Origins: ${JSON.stringify(allowedOrigins)}`);

  if (allowedOrigins.includes(origin)) {
    if (request.url.startsWith("/transcribe")) {
      wss.handleUpgrade(request, socket, head, function done(ws) {
        wss.emit("connection", ws, request);
        console.log(
          `[Upgrade] Handled upgrade for /transcribe from origin: ${origin}`
        );
      });
    } else {
      console.warn(
        `[Upgrade] Rejected: WebSocket upgrade request to unexpected path: ${request.url}`
      );
      socket.destroy(); // Not the expected WS path, destroy the socket
    }
  } else {
    console.warn(
      `[Upgrade] Rejected: WebSocket connection blocked from disallowed origin: ${origin}`
    );
    socket.destroy(); // Forbidden origin
  }
});

// Start the combined HTTP and WebSocket server
server.listen(port, () => {
  console.log(`Express HTTP and WebSocket Server is listening on port ${port}`);
  console.log(
    `Deepgram API Key Check on Startup: ${deepgramApiKey ? "Loaded" : "NOT LOADED"
    }`
  );
  if (deepgramApiKey) {
    console.log(
      `Deepgram API Key begins with: ${deepgramApiKey.substring(0, 5)}...`
    );
  }
});

module.exports = app; // Export app for testing or other modules if needed
