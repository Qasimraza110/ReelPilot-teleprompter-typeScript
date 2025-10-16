const mongoose = require("mongoose");
const { Schema } = mongoose;

// Script Schema - enhanced with plan-specific features
const scriptSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  content: {
    type: String,
    required: true,
    maxlength: 50000, // reasonable limit
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: "Organization",
    default: null,
  },
  isPublic: {
    type: Boolean,
    default: false,
  },
  estimatedDuration: {
    type: Number, // in seconds
  },
  wordCount: {
    type: Number,
    default: 0,
  },

  // Pro/Studio features
  aiGenerated: {
    type: Boolean,
    default: false,
  },
  trendPrompt: {
    type: String,
    maxlength: 500,
  },
  templateType: {
    type: String,
    enum: ["custom", "trending", "batch_generated", "ai_generated"],
    default: "custom",
  },

  // Studio batch scripting
  batchId: {
    type: String,
    index: true,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },

});

// Add indexes for performance
scriptSchema.index({ userId: 1, createdAt: -1 });
scriptSchema.index({ organizationId: 1 });
scriptSchema.index({ tags: 1 });
scriptSchema.index({ isPublic: 1, createdAt: -1 });
scriptSchema.index({ templateType: 1 });

module.exports = mongoose.model("Script", scriptSchema);
