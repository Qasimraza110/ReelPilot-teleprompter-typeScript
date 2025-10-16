const mongoose = require("mongoose");
const { Schema } = mongoose;

// Organization Schema - for Studio plan agencies
const organizationSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  ownerId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  // Member management
  members: [
    {
      userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
      role: {
        type: String,
        enum: ["owner", "admin", "member"],
        default: "member",
      },
      joinedAt: {
        type: Date,
        default: Date.now,
      },
      permissions: {
        canCreateScripts: {
          type: Boolean,
          default: true,
        },
        canManageMembers: {
          type: Boolean,
          default: false,
        },
        canExport: {
          type: Boolean,
          default: true,
        },
      },
    },
  ],

  subscription: {
    plan: {
      type: String,
      default: "studio",
    },
    status: {
      type: String,
      enum: ["active", "canceled", "expired", "trialing"],
      default: "active",
    },
    maxMembers: {
      type: Number,
      default: 10,
    },
    stripeCustomerId: String,
    stripeSubscriptionId: String,
  },

  settings: {
    brandColors: {
      primary: String,
      secondary: String,
    },
    logo: String,
    defaultExportSettings: {
      format: {
        type: String,
        enum: ["mp4", "mov", "avi"],
        default: "mp4",
      },
      quality: {
        type: String,
        enum: ["720p", "1080p", "4k"],
        default: "720p",
      },
      watermark: {
        type: Boolean,
        default: false,
      },
      customWatermark: String,
    },
    defaultTeleprompterSettings: {
      fontSize: String,
      scrollSpeed: String,
      textColor: String,
      backgroundColor: String,
    },
  },

  // Usage stats
  stats: {
    totalMembers: {
      type: Number,
      default: 1,
    },
    totalScripts: {
      type: Number,
      default: 0,
    },
    totalRecordings: {
      type: Number,
      default: 0,
    },
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Add indexes
organizationSchema.index({ slug: 1 });
organizationSchema.index({ ownerId: 1 });
organizationSchema.index({ "members.userId": 1 });

module.exports = mongoose.model(
  "Organization",
  organizationSchema,
);
