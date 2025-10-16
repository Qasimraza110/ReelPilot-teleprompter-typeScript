const mongoose = require("mongoose");
const { Schema } = mongoose;

// User Settings Schema - for app preferences
const userSettingsSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,

  },
  teleprompterSettings: {
    fontSize: {
      type: String,
      enum: ["small", "medium", "large", "xlarge"],
      default: "medium",
    },
    scrollSpeed: {
      type: String,
      enum: ["slow", "medium", "fast", "auto"], // add auto for voice sync
      default: "medium",
    },
    textColor: {
      type: String,
      default: "#ffffff",
      validate: {
        validator: function (v) {
            return /^#[0-9A-F]{6}$/i.test(v) || v === "transparent";
          },
          message: "Invalid color format: must be hex or 'transparent'",
          },
        },
        backgroundColor: {
          type: String,
          default: "transparent",
          validate: {
          validator: function (v) {
            return /^#[0-9A-F]{6}$/i.test(v) || v === "transparent";
          },
          message: "Invalid color format: must be hex or 'transparent'",
          },
        },
        enableVoiceSync: {
          type: Boolean,
          default: true,
        },
    // Add more teleprompter options
    lineHeight: {
      type: Number,
      default: 1.5,
      min: 1,
      max: 3,
    },
    showWordCount: {
      type: Boolean,
      default: false,
    },
  },
  recordingSettings: {
    resolution: {
      type: String,
      enum: ["720p", "1080p", "4k"],
      default: "720p",
    },
    frameRate: {
      type: Number,
      enum: [24, 30, 60],
      default: 30,
    },
    enableRealTimeFeedback: {
      type: Boolean,
      default: true,
    },
    autoSave: {
      type: Boolean,
      default: true,
    },
    // Add countdown timer
    countdownEnabled: {
      type: Boolean,
      default: true,
    },
    countdownDuration: {
      type: Number,
      default: 3,
      min: 0,
      max: 10,
    },
  },
  
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

userSettingsSchema.index({ userId: 1 });
module.exports = mongoose.model(
  "UserSettings",
  userSettingsSchema,
);
