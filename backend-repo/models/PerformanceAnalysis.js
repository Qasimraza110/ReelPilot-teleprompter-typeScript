const mongoose = require("mongoose");
const { Schema } = mongoose;

// Performance Analysis Schema - enhanced with plan-specific features
const performanceAnalysisSchema = new Schema({
  sessionId: {
    type: Schema.Types.ObjectId,
    ref: "Recording", // Link analysis to the specific recording document
    required: true,
    unique: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  // Basic analysis (available to all plans)
  basicAnalysis: {
    duration: Number,
    averagePace: Number, // words per minute
    totalPauses: Number,
    scriptCompletionRate: Number, // percentage of script completed
    retakeCount: Number,
  },

  // Pro/Studio AI coaching features
  advancedAnalysis: {
    speechAnalysis: {
      fillerWords: {
        count: Number,
        words: [String],
        timestamps: [Number],
        frequency: Number, // per minute
      },
      speakingPace: {
        averageWPM: Number,
        minWPM: Number,
        maxWPM: Number,
        paceVariability: Number,
        recommendation: String,
      },
      toneAnalysis: {
        averagePitch: Number,
        pitchVariation: Number,
        energyLevel: {
          type: String,
          enum: ["low", "medium", "high"],
        },
        emotionDetected: [String],
        recommendation: String,
      },
      pauseAnalysis: {
        totalPauses: Number,
        averagePauseLength: Number,
        longestPause: Number,
        pauseFrequency: Number,
        recommendation: String,
      },
      articulation: {
        clarityScore: Number,
        pronunciationIssues: [String],
        recommendation: String,
      },
    },

    visualAnalysis: {
      framingScore: Number,
      lightingScore: Number,
      eyeContactScore: Number,
      gestureAnalysis: {
        handMovements: String,
        bodyLanguage: String,
        facialExpressions: String,
      },
      backgroundScore: Number,
      overallVisualScore: Number,
    },

    aiCoaching: {
      personalizedTips: [String],
      improvementPlan: String,
      nextStepsRecommendation: String,
      progressTracking: {
        comparedToPrevious: String,
        trendAnalysis: String,
        improvementAreas: [String],
        strengthsIdentified: [String],
      },
    },
  },

  // Scoring system
  overallScore: {
    type: Number,
    min: 0,
    max: 100,
  },
  categoryScores: {
    delivery: Number,
    pacing: Number,
    visual: Number,
    engagement: Number,
  },

  improvements: [String],
  strengths: [String],

  // Plan feature flags
  planFeatures: {
    hasAdvancedAnalysis: {
      type: Boolean,
      default: false,
    },
    hasAICoaching: {
      type: Boolean,
      default: false,
    },
    hasExportOptions: {
      type: Boolean,
      default: false,
    },
  },

  processingStatus: {
    type: String,
    enum: ["pending", "processing", "completed", "failed"],
    default: "pending",
  },

  // Processing metadata
  processingTime: Number, // seconds taken to analyze
  aiModelVersion: String,

  createdAt: {
    type: Date,
    default: Date.now,
  },
  completedAt: Date,
});

// Add indexes
performanceAnalysisSchema.index({ sessionId: 1 });
performanceAnalysisSchema.index({ userId: 1, createdAt: -1 });
performanceAnalysisSchema.index({ processingStatus: 1 });

module.exports = mongoose.model(
  "PerformanceAnalysis",
  performanceAnalysisSchema,
);
