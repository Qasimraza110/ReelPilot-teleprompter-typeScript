const User = require("../models/User");
const UserSettings = require("../models/UserSettings");
const UsageTracking = require("../models/UsageTracking");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const { v4: uuidv4 } = require("uuid");
const authMiddleware = require("../middleware/authMiddleware"); // Using your simpler authMiddleware
const { PLAN_FEATURES } = require("../middleware/subscriptionMiddleware"); // Import PLAN_FEATURES
const sendEmail = require("../config/nodemailer");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Helper function to create default user settings
const createDefaultUserSettings = async (userId) => {
  const userSettings = new UserSettings({
    userId,
    teleprompterSettings: {
      fontSize: "medium",
      scrollSpeed: "medium",
      textColor: "#ffffff",
      backgroundColor: "transparent",
      enableVoiceSync: true,
      lineHeight: 1.5,
      showWordCount: false,
    },
    recordingSettings: {
      resolution: "720p",
      frameRate: 30,
      enableRealTimeFeedback: true,
      autoSave: true,
      countdownEnabled: true,
      countdownDuration: 3,
    },
  });

  await userSettings.save();
  return userSettings;
};

// Helper function to create initial usage tracking
const createInitialUsageTracking = async (userId, plan = "free") => {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}`;
  const year = now.getFullYear();

  // Use PLAN_FEATURES from subscriptionMiddleware
  const planLimits = PLAN_FEATURES[plan] || PLAN_FEATURES.free;

  const usageTracking = new UsageTracking({
    userId,
    month,
    year,
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

  await usageTracking.save();
  return usageTracking;
};

exports.logIn = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, msg: "Please enter all fields" });
    }

    // Check for existing session
    if (req.cookies.session_id) {
      try {
        const user = jwt.verify(req.cookies.session_id, process.env.JWT_SECRET);
        if (user) {
          // You might want to refresh the token or just return success
          return res
            .status(200) // Changed to 200 as they are already logged in
            .json({ success: true, msg: "You are already logged in" });
        }
      } catch (err) {
        // Token is invalid, continue with login
        res.clearCookie("session_id");
      }
    }

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (!existingUser) {
      return res
        .status(400)
        .json({ success: false, msg: "User does not exist" });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, existingUser.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, msg: "Invalid credentials" });
    }

    // Generate token
    const token = jwt.sign(
      {
        userId: existingUser._id,
        role: existingUser.role,
        subscription: existingUser.subscription,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    // Set cookie
    res.cookie("session_id", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000 * 7, // 7 days
    });

    // Get user settings
    let userSettings = await UserSettings.findOne({ userId: existingUser._id });
    if (!userSettings) {
      userSettings = await createDefaultUserSettings(existingUser._id);
    }

    // Get current usage tracking
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}`;
    let usageTracking = await UsageTracking.findOne({
      userId: existingUser._id,
      month: currentMonth,
    });

    if (!usageTracking) {
      usageTracking = await createInitialUsageTracking(
        existingUser._id,
        existingUser.subscription.plan
      );
    }

    res.status(200).json({
      success: true,
      message: "User logged in successfully.",
      data: {
        token,
        user: {
          _id: existingUser._id,
          name: existingUser.name,
          email: existingUser.email,
          role: existingUser.role,
          subscription: existingUser.subscription,
          avatar: existingUser.avatar,
          provider: existingUser.provider,
          isVerified: existingUser.isVerified,
          organization: existingUser.organization,
        },
        settings: userSettings,
        usage: usageTracking,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, msg: "Server error" });
    console.error(err);
  }
};

exports.signUp = async (req, res) => {
  try {
    const { name, email, password, plan = "free", customerId = null } = req.body;

    // Basic validation
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ success: false, msg: "Please enter all fields" });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res
        .status(400)
        .json({ success: false, msg: "Please enter a valid email" });
    }

    // Password validation
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        msg: "Password must be at least 8 characters long",
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, msg: "User already exists" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    // Create new user with subscription info
    
    const subscriptionData = {
      plan: plan,
      status: "active",
      startDate: new Date(),
    };
    if (customerId) {
      subscriptionData.stripeCustomerId = customerId;
    }

    // Add trial period for pro/studio plans
    if (plan === "pro" || plan === "studio") {
      subscriptionData.status = "trialing";
      subscriptionData.trialEndsAt = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000
      ); // 7 days
    }

    const newUser = new User({
      name,
      email: email.toLowerCase(),
      password: hash,
      role: "user",
      provider: "local",
      subscription: subscriptionData,
    });

    await newUser.save();

    // Create default user settings
    const userSettings = await createDefaultUserSettings(newUser._id);

    // Create initial usage tracking
    const usageTracking = await createInitialUsageTracking(newUser._id, plan);

    // Generate token
    const token = jwt.sign(
      {
        userId: newUser._id,
        role: newUser.role,
        subscription: newUser.subscription,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    // Set cookie
    res.cookie("session_id", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000 * 7, // 7 days
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        token,
        user: {
          _id: newUser._id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
          subscription: newUser.subscription,
          avatar: newUser.avatar,
          provider: newUser.provider,
          isVerified: newUser.isVerified,
        },
        settings: userSettings,
        usage: usageTracking,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, msg: "Server error" });
    console.error(err);
  }
};

// Log out now uses authMiddleware to ensure a user is logged in
exports.logOut = [
  authMiddleware, // Ensure user is authenticated to log out
  async (req, res) => {
    // Email and password are not strictly needed if we are just clearing the cookie based on session
    // However, if you want to verify the user before logging out, you can re-add that logic.
    // For now, I'm assuming if the authMiddleware passed, the user is authenticated.
    try {
      res.clearCookie("session_id");
      return res.status(200).json({
        success: true,
        message: "Logged out successfully.",
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        success: false,
        message: "Server error.",
      });
    }
  },
];

exports.verifyJWT = [
  authMiddleware, // Use the simpler authMiddleware for initial token verification
  async (req, res) => {
    try {
      // req.user is populated by authMiddleware
      const decoded = req.user;

      // Verify user exists and get full user data
      const user = await User.findOne({ _id: decoded.userId });
      if (!user) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized: User not found" });
      }

      // Check subscription status
      const now = new Date();
      let subscriptionValid = true;

      if (
        user.subscription.status === "trialing" &&
        user.subscription.trialEndsAt < now
      ) {
        user.subscription.status = "expired";
        await user.save();
        subscriptionValid = false;
      } else if (user.subscription.endDate && user.subscription.endDate < now) {
        user.subscription.status = "expired";
        await user.save();
        subscriptionValid = false;
      }

      // Return full user object
      return res.status(200).json({
        success: true,
        message: "Authorized",
        data: {
          user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            subscription: user.subscription,
            avatar: user.avatar,
            provider: user.provider,
            isVerified: user.isVerified,
            organization: user.organization,
          },
          subscriptionValid,
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: "Server error" });
      console.error(err);
    }
  },
];

exports.googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        success: false,
        message: "Google credential is required",
      });
    }

    // Verify the Google token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    // Check if user exists with Google ID
    let user = await User.findOne({ googleId });

    // Generate random password for Google users
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(uuidv4(), salt);

    if (!user) {
      // Check if user exists with same email (link accounts)
      user = await User.findOne({ email: email.toLowerCase() });

      if (user) {
        // Link Google account to existing user
        user.googleId = googleId;
        user.avatar = picture || user.avatar;
        user.isVerified = true;
        user.provider = user.provider === "local" ? "local" : "google"; // Keep 'local' if it was local
        await user.save();
      } else {
        // Create new user
        user = new User({
          googleId,
          name,
          email: email.toLowerCase(),
          avatar: picture || "",
          provider: "google",
          isVerified: true,
          role: "user",
          password: hash, // Storing a dummy hash since Google handles auth
          subscription: {
            plan: "free",
            status: "active",
            startDate: new Date(),
          },
        });
        await user.save();

        // Create default settings and usage tracking for new user
        await createDefaultUserSettings(user._id);
        await createInitialUsageTracking(user._id, "free");
      }
    }

    // Generate token
    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
        subscription: user.subscription,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    // Set cookie
    res.cookie("session_id", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000 * 7, // 7 days
    });

    // Get user settings and usage
    // We can rely on getCurrentUsage from subscriptionMiddleware for this
    const { getCurrentUsage } = require("../middleware/subscriptionMiddleware");
    const userSettings = await UserSettings.findOne({ userId: user._id });
    const usageTracking = await getCurrentUsage(user._id);

    res.json({
      success: true,
      message: "Google login successful",
      data: {
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          provider: user.provider,
          role: user.role,
          subscription: user.subscription,
          isVerified: user.isVerified,
          organization: user.organization,
        },
        settings: userSettings,
        usage: usageTracking,
      },
    });
  } catch (error) {
    console.error("Google login error:", error);
    res.status(500).json({
      success: false,
      message: "Google authentication failed",
    });
  }
};

exports.forgotPWD = async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email presence
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }

    // Check if user exists
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // For security, it's often better to send a generic success message
      // even if the user isn't found, to prevent email enumeration.
      // However, your current frontend expects a specific message.
      // Consider if you want to change this behavior for security.
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Generate reset token (consider adding this to the user model or a separate collection
    // with an expiry, so it's only valid once and can be revoked).
    // For a real-world scenario, you'd typically generate a cryptographically strong,
    // single-use token and save it to the user record in the database with an expiry.
    // Example: user.resetPasswordToken = crypto.randomBytes(32).toString('hex');
    //          user.resetPasswordExpire = Date.now() + 3600000; // 1 hour
    //          await user.save();
    const resetToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    // Construct the reset URL for the user to click
    // Prefer explicit FRONTEND_URL, then Origin header, then host fallback
    const originHeader = req.get("origin");
    const configuredFrontend = process.env.FRONTEND_URL;
    const hostFallback = `${req.protocol}://${req.get("host")}`;
    const baseUrl = (configuredFrontend || originHeader || hostFallback).replace(/\/$/, "");
    const resetUrl = `${baseUrl}/reset-pwd?token=${resetToken}`;

    // Send email with reset token
    await sendEmail({
      to: email,
      subject: "ReelPilot Password Reset Request",
      html: `
        <!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Reset Your ReelPilot Password</title>
<!--[if mso]>
<noscript>
    <xml>
        <o:OfficeDocumentSettings>
            <o:AllowPNG/>
            <o:PixelsPerInch>96</o:PixelsPerInch>
        </o:OfficeDocumentSettings>
    </xml>
</noscript>
<![endif]-->
<style>
body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
img { -ms-interpolation-mode: bicubic; }
img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
table { border-collapse: collapse !important; }
body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; }
.gmail-fix { display: none; display: none !important; }
@media screen and (max-width: 600px) {
    .mobile-padding { padding: 20px !important; }
    .mobile-center { text-align: center !important; }
    .mobile-width { width: 100% !important; max-width: 100% !important; }
    .mobile-hide { display: none !important; }
}
</style>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: Arial, sans-serif;">
<!-- Outer wrapper -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0f172a;">
    <tr>
        <td align="center" style="padding: 40px 20px;">
            <!-- Main container -->
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #1e293b; border-radius: 16px; overflow: hidden;" class="mobile-width">
                <!-- Header -->
                <tr>
                    <td style="background: linear-gradient(135deg, #581c87 0%, #be185d 100%); padding: 40px 30px; text-align: center;" class="mobile-padding">
                        <!-- Logo -->
                        <div style="text-align: center; padding-bottom: 20px;">
                            <span style="color: #c084fc; font-size: 32px; font-weight: bold; font-family: Arial, sans-serif;">ReelPilot</span>
                        </div>
                        <h1 style="color: #ffffff; font-size: 28px; font-weight: bold; margin: 0 0 10px 0; font-family: Arial, sans-serif;">Reset Your Password</h1>
                        <p style="color: #d1d5db; font-size: 16px; margin: 0; font-family: Arial, sans-serif;">We received a request to reset your password</p>
                    </td>
                </tr>
                <!-- Content -->
                <tr>
                    <td style="padding: 40px 30px; background-color: #1e293b;" class="mobile-padding">
                        <p style="color: #ffffff; font-size: 18px; margin: 0 0 25px 0; font-family: Arial, sans-serif;">Hi there! 👋</p>
                        <p style="color: #d1d5db; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0; font-family: Arial, sans-serif;">
                            We received a request to reset the password for your ReelPilot account associated with <strong style="color: #ffffff;">${user.email}</strong>.
                        </p>
                        <p style="color: #d1d5db; font-size: 16px; line-height: 1.6; margin: 0 0 35px 0; font-family: Arial, sans-serif;">
                            If you requested this password reset, click the button below to create a new password. This link will expire in an hour for security reasons.
                        </p>
                        <!-- Button -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                                <td align="center" style="padding: 20px 0;">
                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                        <tr>
                                            <td style="background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%); border-radius: 50px; padding: 16px 32px;">
                                                <a href="${resetUrl}" style="color: #ffffff; text-decoration: none; font-weight: bold; font-size: 16px; font-family: Arial, sans-serif; display: block;">Reset My Password</a>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>
                        <!-- Security Notice -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 30px 0;">
                            <tr>
                                <td style="background-color: #dc2626; background-color: rgba(220, 38, 38, 0.1); border: 1px solid #dc2626; border-radius: 12px; padding: 20px;">
                                    <p style="color: #fca5a5; font-size: 16px; font-weight: bold; margin: 0 0 10px 0; font-family: Arial, sans-serif;">
                                        🛡️ Security Notice
                                    </p>
                                    <p style="color: #d1d5db; font-size: 14px; margin: 0; font-family: Arial, sans-serif;">
                                        If you didn't request this password reset, please ignore this email. Your account remains secure, and no changes will be made.
                                    </p>
                                </td>
                            </tr>
                        </table>
                        <!-- Divider -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                                <td style="padding: 30px 0;">
                                    <div style="height: 1px; background-color: #374151;"></div>
                                </td>
                            </tr>
                        </table>
                        <p style="color: #d1d5db; font-size: 16px; line-height: 1.6; margin: 0; font-family: Arial, sans-serif;">
                            <strong style="color: #ffffff;">Need help?</strong> Our support team is here to assist you. Contact us at <a href="mailto:support@reelpilot.com" style="color: #c084fc; text-decoration: none;">support@reelpilot.com</a>
                        </p>
                    </td>
                </tr>
                <!-- Footer -->
                <tr>
                    <td style="background-color: #0f172a; padding: 30px; text-align: center; border-top: 1px solid #374151;" class="mobile-padding">
                        <!-- Logo -->
                        <div style="text-align: center; padding-bottom: 20px;">
                            <span style="color: #c084fc; font-size: 24px; font-weight: bold; font-family: Arial, sans-serif;">ReelPilot</span>
                        </div>
                        <p style="color: #9ca3af; font-size: 14px; margin: 0 0 15px 0; font-family: Arial, sans-serif;">
                            This email was sent to ${user.email}
                        </p>
                        <p style="color: #9ca3af; font-size: 14px; margin: 0 0 20px 0; font-family: Arial, sans-serif;">
                            <a href="#" style="color: #c084fc; text-decoration: none;">Unsubscribe</a> | 
                            <a href="#" style="color: #c084fc; text-decoration: none;">Privacy Policy</a> | 
                            <a href="#" style="color: #c084fc; text-decoration: none;">Terms of Service</a>
                        </p>
                        <p style="color: #6b7280; font-size: 14px; margin: 0; font-family: Arial, sans-serif;">
                            © 2025 ReelPilot. All rights reserved. Create. Share. Go Viral.
                        </p>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>
</body>
</html>
      `,
    });

    res
      .status(200)
      .json({ success: true, message: "Password reset email sent" });
  } catch (error) {
    console.error("Forgot password error:", error);
    // Be careful not to expose too much internal error detail to the client
    res.status(500).json({
      success: false,
      message: "Failed to send password reset email. Please try again later.",
    });
  }
};

exports.resetPWD = async (req, res) => {
  try {
    // 1. Get the token from the Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization token missing or malformed.",
      });
    }
    const token = authHeader.split(" ")[1];

    // 2. Get the new password from the request body
    const { newPassword } = req.body;

    // 3. Validate new password presence and length
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long.",
      });
    }

    // 4. Verify the JWT
    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(403).json({
          success: false,
          message: "Password reset link has expired.",
        });
      }
      return res.status(401).json({
        success: false,
        message: "Invalid or unauthorized reset token.",
      });
    }

    // 5. Find the user by ID from the decoded token
    const user = await User.findById(decodedToken.userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found for this token." });
    }

    // 6. Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // 7. Update the user's password
    user.password = hashedPassword;
    // If you implemented a more robust token system (e.g., storing a token in DB),
    // you would also clear or invalidate that token here:
    // user.resetPasswordToken = undefined;
    // user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password has been reset successfully.",
    });
  } catch (error) {
    console.error("Reset password backend error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error during password reset." });
  }
};
