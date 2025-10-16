const User = require("../models/User");
const UsageTracking = require("../models/UsageTracking");


// Plan feature definitions
const PLAN_FEATURES = {
  free: {
    recordings: { limit: 5, duration: 300 }, // 5 recordings, 5 minutes each
    scripts: { limit: 3 },
    exports: { limit: 0 },
    aiAnalysisMinutes: { limit: 0 },
    maxVideoSize: 50, // MB
    features: {
      basicTeleprompter: true,
      basicRecording: true,
      realTimeFeedback: false,
      advancedAnalysis: false,
      aiCoaching: false,
      exportOptions: false,
      customBranding: false,
      organizationAccess: false,
      prioritySupport: false,
    },
    maxResolution: "720p",
    maxFrameRate: 30,
  },
  pro: {
    recordings: { limit: 50, duration: 1800 }, // 50 recordings, 30 minutes each
    scripts: { limit: 25 },
    exports: { limit: 10 },
    aiAnalysisMinutes: { limit: 120 },
    maxVideoSize: 200, // MB
    features: {
      basicTeleprompter: true,
      basicRecording: true,
      realTimeFeedback: true,
      advancedAnalysis: true,
      aiCoaching: true,
      exportOptions: true,
      customBranding: false,
      organizationAccess: false,
      prioritySupport: true,
    },
    maxResolution: "1080p",
    maxFrameRate: 60,
  },
  studio: {
    recordings: { limit: 500, duration: 3600 }, // 500 recordings, 60 minutes each
    scripts: { limit: 100 },
    exports: { limit: 100 },
    aiAnalysisMinutes: { limit: 500 },
    maxVideoSize: 1000, // MB
    features: {
      basicTeleprompter: true,
      basicRecording: true,
      realTimeFeedback: true,
      advancedAnalysis: true,
      aiCoaching: true,
      exportOptions: true,
      customBranding: true,
      organizationAccess: true,
      prioritySupport: true,
    },
    maxResolution: "4k",
    maxFrameRate: 60,
  },
};



// Check if subscription is active and valid
const checkSubscriptionStatus = async (req, res, next) => {
  try {
    const user = req.user;
    const now = new Date();

    // Check if subscription is expired
    if (user.subscription.status === "expired") {
      return res.status(403).json({
        success: false,
        message: "Your subscription has expired. Please renew to continue.",
        code: "SUBSCRIPTION_EXPIRED",
      });
    }

    // Check if trial has ended
    if (
      user.subscription.status === "trialing" &&
      user.subscription.trialEndsAt &&
      user.subscription.trialEndsAt < now
    ) {
      // Update status to expired
      user.subscription.status = "expired";
      await user.save();

      return res.status(403).json({
        success: false,
        message: "Your trial period has ended. Please upgrade to continue.",
        code: "TRIAL_EXPIRED",
      });
    }

    // Check if subscription end date has passed
    if (user.subscription.endDate && user.subscription.endDate < now) {
      user.subscription.status = "expired";
      await user.save();

      return res.status(403).json({
        success: false,
        message: "Your subscription has expired. Please renew to continue.",
        code: "SUBSCRIPTION_EXPIRED",
      });
    }

    // Check if subscription is canceled but still active
    if (
      user.subscription.status === "canceled" &&
      user.subscription.endDate &&
      user.subscription.endDate < now
    ) {
      return res.status(403).json({
        success: false,
        message: "Your subscription has been canceled and expired.",
        code: "SUBSCRIPTION_CANCELED",
      });
    }

    next();
  } catch (error) {
    console.error("Subscription status check error:", error);
    return res.status(500).json({
      success: false,
      message: "Error checking subscription status",
    });
  }
};

// Get current month's usage tracking
const getCurrentUsage = async (userId) => {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}`;

  let usage = await UsageTracking.findOne({
    userId,
    month: currentMonth,
  });

  if (!usage) {
    // Create new usage tracking for current month
    const user = await User.findById(userId);
    const planLimits =
      PLAN_FEATURES[user.subscription.plan] || PLAN_FEATURES.free;

    usage = new UsageTracking({
      userId,
      month: currentMonth,
      year: now.getFullYear(),
      recordings: {
        count: 0,
        limit: planLimits.recordings.limit,
        totalDuration: 0,
      },
      scripts: {
        count: 0,
        limit: planLimits.scripts.limit,
      },
      exports: {
        count: 0,
        limit: planLimits.exports.limit,
      },
      aiAnalysisMinutes: {
        used: 0,
        limit: planLimits.aiAnalysisMinutes.limit,
      },
      bandwidthUsed: 0,
    });

    await usage.save();
  }

  return usage;
};

// Check if user has access to specific feature
const checkFeatureAccess = (requiredFeature) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      const planFeatures =
        PLAN_FEATURES[user.subscription.plan] || PLAN_FEATURES.free;

      if (!planFeatures.features[requiredFeature]) {
        return res.status(403).json({
          success: false,
          message: `This feature requires a ${
            requiredFeature === "advancedAnalysis" ? "Pro" : "higher"
          } plan subscription.`,
          code: "FEATURE_NOT_AVAILABLE",
          requiredFeature,
          currentPlan: user.subscription.plan,
          availableIn: getPlansWithFeature(requiredFeature),
        });
      }

      next();
    } catch (error) {
      console.error("Feature access check error:", error);
      return res.status(500).json({
        success: false,
        message: "Error checking feature access",
      });
    }
  };
};

// Check usage limits for specific resource
const checkUsageLimit = (resourceType, amount = 1) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      const usage = await getCurrentUsage(user._id);
      const planLimits =
        PLAN_FEATURES[user.subscription.plan] || PLAN_FEATURES.free;

      let currentUsage, limit;

      switch (resourceType) {
        case "recordings":
          currentUsage = usage.recordings.count;
          limit = planLimits.recordings.limit;
          break;
        case "scripts":
          currentUsage = usage.scripts.count;
          limit = planLimits.scripts.limit;
          break;
        case "exports":
          currentUsage = usage.exports.count;
          limit = planLimits.exports.limit;
          break;
        case "aiAnalysisMinutes":
          currentUsage = usage.aiAnalysisMinutes.used;
          limit = planLimits.aiAnalysisMinutes.limit;
          break;
        default:
          return res.status(400).json({
            success: false,
            message: "Invalid resource type",
          });
      }

      if (currentUsage + amount > limit) {
        return res.status(403).json({
          success: false,
          message: `You have reached your monthly limit for ${resourceType}. Current: ${currentUsage}/${limit}`,
          code: "USAGE_LIMIT_EXCEEDED",
          resourceType,
          currentUsage,
          limit,
          currentPlan: user.subscription.plan,
          upgradeRequired: true,
        });
      }

      // Add usage info to request for later use
      req.usage = usage;
      req.planLimits = planLimits;
      next();
    } catch (error) {
      console.error("Usage limit check error:", error);
      return res.status(500).json({
        success: false,
        message: "Error checking usage limits",
      });
    }
  };
};

// Check file size limits
const checkFileSizeLimit = (req, res, next) => {
  try {
    const user = req.user;
    const planLimits =
      PLAN_FEATURES[user.subscription.plan] || PLAN_FEATURES.free;
    const maxSizeMB = planLimits.maxVideoSize;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    // Check if file size is provided in request
    const fileSize = req.headers["content-length"] || req.body.fileSize;

    if (fileSize && parseInt(fileSize) > maxSizeBytes) {
      return res.status(413).json({
        success: false,
        message: `File size exceeds limit. Maximum allowed: ${maxSizeMB}MB`,
        code: "FILE_SIZE_EXCEEDED",
        maxSizeMB,
        currentPlan: user.subscription.plan,
      });
    }

    next();
  } catch (error) {
    console.error("File size check error:", error);
    return res.status(500).json({
      success: false,
      message: "Error checking file size limits",
    });
  }
};

// Check recording quality limits
const checkRecordingQuality = (req, res, next) => {
  try {
    const user = req.user;
    const planLimits =
      PLAN_FEATURES[user.subscription.plan] || PLAN_FEATURES.free;
    const { resolution, frameRate } = req.body;

    // Check resolution limit
    if (resolution) {
      const maxResolution = planLimits.maxResolution;
      const resolutionHierarchy = { "720p": 1, "1080p": 2, "4k": 3 };

      if (
        resolutionHierarchy[resolution] > resolutionHierarchy[maxResolution]
      ) {
        return res.status(403).json({
          success: false,
          message: `Recording resolution ${resolution} not available on ${user.subscription.plan} plan. Maximum: ${maxResolution}`,
          code: "RESOLUTION_NOT_AVAILABLE",
          maxResolution,
          currentPlan: user.subscription.plan,
        });
      }
    }

    // Check frame rate limit
    if (frameRate && frameRate > planLimits.maxFrameRate) {
      return res.status(403).json({
        success: false,
        message: `Frame rate ${frameRate}fps not available on ${user.subscription.plan} plan. Maximum: ${planLimits.maxFrameRate}fps`,
        code: "FRAMERATE_NOT_AVAILABLE",
        maxFrameRate: planLimits.maxFrameRate,
        currentPlan: user.subscription.plan,
      });
    }

    next();
  } catch (error) {
    console.error("Recording quality check error:", error);
    return res.status(500).json({
      success: false,
      message: "Error checking recording quality limits",
    });
  }
};

// Increment usage after successful operation
const incrementUsage = (resourceType, amount = 1) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      const usage = req.usage || (await getCurrentUsage(user._id));

      switch (resourceType) {
        case "recordings":
          usage.recordings.count += amount;
          if (req.body.duration) {
            usage.recordings.totalDuration += req.body.duration;
          }
          break;
        case "scripts":
          usage.scripts.count += amount;
          break;
        case "exports":
          usage.exports.count += amount;
          break;
        case "aiAnalysisMinutes":
          usage.aiAnalysisMinutes.used += amount;
          break;
      }

      // Update bandwidth if file size is provided
      if (req.body.fileSize) {
        usage.bandwidthUsed += Math.round(req.body.fileSize / (1024 * 1024)); // Convert to MB
      }

      usage.lastUpdated = new Date();
      await usage.save();

      req.updatedUsage = usage;
      next();
    } catch (error) {
      console.error("Usage increment error:", error);
      // Don't fail the request, just log the error
      next();
    }
  };
};

// Helper function to get plans that include a specific feature
const getPlansWithFeature = (feature) => {
  const plans = [];
  for (const [planName, planData] of Object.entries(PLAN_FEATURES)) {
    if (planData.features[feature]) {
      plans.push(planName);
    }
  }
  return plans;
};

// Get user's plan limits and usage
const getUserPlanInfo = async (req, res, next) => {
  try {
    const user = req.user;
    const usage = await getCurrentUsage(user._id);
    const planLimits =
      PLAN_FEATURES[user.subscription.plan] || PLAN_FEATURES.free;

    req.planInfo = {
      plan: user.subscription.plan,
      limits: planLimits,
      usage,
      features: planLimits.features,
    };

    next();
  } catch (error) {
    console.error("Get plan info error:", error);
    return res.status(500).json({
      success: false,
      message: "Error getting plan information",
    });
  }
};

// Combined middleware for common checks
const requireAuth = [checkSubscriptionStatus];
const requirePlan = (minPlan) => [
  ...requireAuth,
  (req, res, next) => {
    const planHierarchy = { free: 1, pro: 2, studio: 3 };
    const userPlanLevel = planHierarchy[req.user.subscription.plan] || 0;
    const requiredLevel = planHierarchy[minPlan] || 0;

    if (userPlanLevel < requiredLevel) {
      return res.status(403).json({
        success: false,
        message: `This feature requires a ${minPlan} plan or higher.`,
        code: "PLAN_UPGRADE_REQUIRED",
        currentPlan: req.user.subscription.plan,
        requiredPlan: minPlan,
      });
    }
    next();
  },
];

module.exports = {

  checkSubscriptionStatus,
  checkFeatureAccess,
  checkUsageLimit,
  checkFileSizeLimit,
  checkRecordingQuality,
  incrementUsage,
  getUserPlanInfo,
  requireAuth,
  requirePlan,
  PLAN_FEATURES,
  getCurrentUsage,
};
