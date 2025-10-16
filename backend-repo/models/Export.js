const mongoose = require("mongoose");
const { Schema } = mongoose;

// Export Data Schema - for Pro/Studio export features
const exportSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  sessionId: {
    type: Schema.Types.ObjectId,
    ref: "RecordingSession",
    required: true,
  },
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: "Organization",
  },

  exportType: {
    type: String,
    enum: [
      "video",
      "analysis_pdf",
      "transcript",
      "performance_data",
      "highlights_reel",
    ],
    required: true,
  },

  format: {
    type: String,
    enum: ["mp4", "mov", "avi", "pdf", "txt", "json", "csv", "docx"],
    required: true,
  },

  settings: {
    quality: String, // for video exports
    includeAnalysis: Boolean, // overlay analysis on video
    customBranding: Boolean, // Studio feature
    watermark: Boolean,
    includeTranscript: Boolean,
    timestamped: Boolean,
    highlightIssues: Boolean,
  },

  status: {
    type: String,
    enum: ["pending", "processing", "completed", "failed", "cancelled"],
    default: "pending",
  },

  fileUrl: String, // URL to download exported file
  fileName: String,
  fileSize: Number, // in bytes

  // Processing info
  processingStartedAt: Date,
  processingCompletedAt: Date,
  processingError: String,

  downloadCount: {
    type: Number,
    default: 0,
  },

  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Add indexes
exportSchema.index({ userId: 1, createdAt: -1 });
exportSchema.index({ sessionId: 1 });
exportSchema.index({ status: 1 });
exportSchema.index({ expiresAt: 1 }); // for cleanup jobs
module.exports = mongoose.model("Export", exportSchema);
