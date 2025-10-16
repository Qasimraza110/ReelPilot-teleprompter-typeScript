const mongoose = require("mongoose");
const { Schema } = mongoose;

// User Schema (enhanced with subscription data)
const userSchema = new Schema({
  // Remove custom 'id' field - MongoDB's _id is sufficient
  name: {
    type: String,
    required: true,
    trim: true,
  },
  password: {
    type: String,
    required: function () {
      return this.provider === "local";
    },
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },
  googleId: {
    type: String,
  },
  avatar: {
    type: String,
    default: "",
  },
  provider: {
    type: String,
    enum: ["local", "google"], // be explicit about providers
    default: "local",
  },
  isVerified: {
    type: Boolean,
    default: false,
  },

  // Subscription information
  subscription: {
    stripeCustomerId: { type: String, default: "" },
    latestInvoice: {
      type: Object,
      default: null,
    },
    plan: {
      type: String,
      enum: ["free", "pro", "studio"],
      default: "free",
    },
    status: {
      type: String,
      enum: ["active", "canceled", "expired", "trialing", "past_due"],
      default: "active",
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: Date,
    stripeCustomerId: String,
    stripeSubscriptionId: String,
    trialEndsAt: Date,
  },

  // REMOVED currentUsage - moved to separate UsageTracking schema

  // Studio plan specific (for agencies)
  organization: {
    name: String,
    isOwner: {
      type: Boolean,
      default: false,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
    },
  },
});

// Add indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ googleId: 1 });
userSchema.index({ "subscription.plan": 1 });
userSchema.index({ "organization.organizationId": 1 });


module.exports = mongoose.model("User", userSchema);
