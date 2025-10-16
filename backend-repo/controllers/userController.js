const User = require("../models/User");
const UserSettings = require("../models/UserSettings");
const { getCurrentUsage } = require("../middleware/subscriptionMiddleware"); // Import getCurrentUsage
const jwt = require("jsonwebtoken");
const { PLAN_FEATURES } = require("../middleware/subscriptionMiddleware");

// New endpoint to get user profile with all related data
exports.getUserProfile = async (req, res) => {
  try {
    // req.user is populated by authenticateToken from subscriptionMiddleware
     const authHeader = req.headers["authorization"];
     if (!authHeader || !authHeader.startsWith("Bearer ")) {
       return res.status(401).json({ message: "No token provided (users)" });
     }
     const session_id = authHeader.split(" ")[1];

     const decoded = await jwt.decode(session_id, process.env.JWT_SECRET);
     const userId = decoded.userId;

    // Get user data
    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get user settings
    const userSettings = await UserSettings.findOne({ userId });

    // Get current usage tracking using the helper from subscriptionMiddleware
    const usageTracking = await getCurrentUsage(userId);

    res.json({
      success: true,
      data: {
        user,
        settings: userSettings,
        usage: usageTracking,
      },
    });
  } catch (error) {
    console.error("Get user profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get user profile",
    });
  }
};
// New endpoint to update user settings
exports.updateUserSettings = async (req, res) => {
  try {
    // req.user is populated by authenticateToken from subscriptionMiddleware
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided (users)" });
    }
    const session_id = authHeader.split(" ")[1];

    const decoded = await jwt.decode(session_id, process.env.JWT_SECRET);
    const userId = decoded.userId;

    const { teleprompterSettings, recordingSettings } = req.body;

    let userSettings = await UserSettings.findOne({ userId });

    if (!userSettings) {
      // If no settings exist, create defaults. This shouldn't happen often if created on signup.
      userSettings = new UserSettings({ userId });
    }

    // Update settings
    if (teleprompterSettings) {
      userSettings.teleprompterSettings = {
        ...userSettings.teleprompterSettings,
        ...teleprompterSettings,
      };
    }

    if (recordingSettings) {
      userSettings.recordingSettings = {
        ...userSettings.recordingSettings,
        ...recordingSettings,
      };
    }

    userSettings.updatedAt = new Date();
    await userSettings.save();

    res.json({
      success: true,
      message: "Settings updated successfully",
      data: userSettings,
    });
  } catch (error) {
    console.error("Update user settings error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update settings",
    });
  }
};

exports.getUserSettings = async (req, res) => {
  try {
    // req.user is populated by authenticateToken from subscriptionMiddleware
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided (users)" });
    }
    const session_id = authHeader.split(" ")[1];

    const decoded = await jwt.decode(session_id, process.env.JWT_SECRET);
    const userId = decoded.userId;

    const userSettings = await UserSettings.findOne({ userId });

    res.json({
      success: true,
      message: "Settings fetched successfully",
      data: userSettings,
    });
  } catch (error) {
    console.error("Get user settings error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get settings",
    });
  }
};

exports.getUserPlan = async (req, res) => {
  try {
    // req.user is populated by authenticateToken from subscriptionMiddleware
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided (users)" });
    }
    const session_id = authHeader.split(" ")[1];

    const decoded = await jwt.decode(session_id, process.env.JWT_SECRET);
    const userId = decoded.userId;

    const user = await User.findOne({ _id: userId });

    // Include usage tracking
    const usageTracking = await getCurrentUsage(userId);
    const planLimits = PLAN_FEATURES[user.subscription.plan];
    res.json({
      success: true,
      message: "Plan fetched successfully",
      data: {
        subscription: user.subscription,
        usage: usageTracking,
        limits: planLimits,
      },
    });
  } catch (error) {
    console.error("Get user plan error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get plan",
    });
  }
};

exports.saveSettings = async (req, res) => {
  // get user scripts
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided (users)" });
  }
  const session_id = authHeader.split(" ")[1];
  const { settings } = req.body;

  const decoded = await jwt.decode(session_id, process.env.JWT_SECRET);
  const userId = decoded.userId;

  const userSettings = await UserSettings.findOne({ userId });
  userSettings.teleprompterSettings = settings.teleprompterSettings;
  userSettings.recordingSettings = settings.recordingSettings;
  await userSettings.save();
  res.json({ success: true, data: userSettings });
};

exports.getSavedRecordings = async (req, res) => {};
