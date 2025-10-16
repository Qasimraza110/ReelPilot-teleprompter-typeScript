const mongoose = require("mongoose");
const { Schema } = mongoose;

// Usage Tracking Schema - for monitoring plan limits
const usageTrackingSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  month: {
    type: String, // format: "2024-03"
    required: true,
  },
  year: {
    type: Number,
    required: true,
  },
  recordings: {
    count: {
      type: Number,
      default: 0,
    },
    limit: Number,
    totalDuration: {
      type: Number,
      default: 0, // in seconds
    },
  },
  scripts: {
    count: {
      type: Number,
      default: 0,
    },
    limit: Number,
  },
  exports: {
    count: {
      type: Number,
      default: 0,
    },
    limit: Number,
  },
  aiAnalysisMinutes: {
    used: {
      type: Number,
      default: 0,
    },
    limit: Number,
  },
  // Add bandwidth tracking for video uploads
  bandwidthUsed: {
    type: Number,
    default: 0, // in MB
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
});

// Compound index for efficient queries
usageTrackingSchema.index({ userId: 1, month: 1 }, { unique: true });
usageTrackingSchema.index({ year: 1, month: 1 });
module.exports = mongoose.model(
  "UsageTracking",
  usageTrackingSchema,
);
