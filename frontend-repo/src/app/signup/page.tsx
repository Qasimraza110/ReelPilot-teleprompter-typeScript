"use client";
import React, { useState, useEffect } from "react";
import {
  Play,
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  ArrowRight,
  CheckCircle,
  X,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast"; // Import toast and Toaster
import { useRouter } from "next/navigation";

// Declare global window.google for TypeScript
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google?: any;
  }
}

export default function SignupPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordFocus, setPasswordFocus] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isOnline, setIsOnline] = useState(true); // Track online status
  const router = useRouter();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  interface PasswordCriteria {
    test: (pwd: string) => boolean;
    text: string;
  }

  const passwordCriteria: PasswordCriteria[] = [
    { test: (pwd: string) => pwd.length >= 8, text: "At least 8 characters" },
    { test: (pwd: string) => /[A-Z]/.test(pwd), text: "One uppercase letter" },
    { test: (pwd: string) => /[a-z]/.test(pwd), text: "One lowercase letter" },
    { test: (pwd: string) => /\d/.test(pwd), text: "One number" },
    {
      test: (pwd: string) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
      text: "One special character",
    },
  ];

  // Replaced custom showToast with react-hot-toast
  // const showToast = (message: string, type = "success") => {
  //   // ... (removed custom toast implementation)
  // };

  const handleInputChange = (e: {
    target: { name: string; value: string };
  }) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error("Full name is required");
      return false;
    }
    if (formData.name.trim().length < 2) {
      toast.error("Name must be at least 2 characters");
      return false;
    }
    if (!formData.email.trim()) {
      toast.error("Email is required");
      return false;
    }
    if (!emailRegex.test(formData.email)) {
      toast.error("Please enter a valid email address");
      return false;
    }
    if (!formData.password) {
      toast.error("Password is required");
      return false;
    }

    const failedCriteria = passwordCriteria.filter(
      (criteria) => !criteria.test(formData.password)
    );
    if (failedCriteria.length > 0) {
      toast.error("Password does not meet requirements");
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return false;
    }

    if (!acceptTerms) {
      toast.error("Please accept the Terms & Conditions");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    if (!isOnline) {
      // Check online status before making the request
      toast.error(
        "You are offline. Please connect to the internet to create an account."
      );
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/signup`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            password: formData.password,
          }),
        }
      );

      const data = await res.json();

      if (res.ok) {
        toast.success(data.msg || "Account created successfully! 🚀");
        console.log("Signup successful:", data);
        if (data.data.token) {
          document.cookie = `session_id=${data.data.token}; path=/; SameSite=Lax`;
          console.log("Storing session_id as cookie:", data.data.token);
        }
        router.push("/dashboard");
      } else {
        toast.error(data.msg || "Signup failed. Please try again.");
        console.error("Signup failed:", data);
      }
    } catch (error) {
      console.error("Signup error:", error);
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        toast.error("Network error. Please check your internet connection.");
      } else {
        toast.error("Signup failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  interface GoogleCredentialResponse {
    credential: string;
    select_by?: string;
    clientId?: string;
  }

  const handleGoogleCredentialResponse = async (
    response: GoogleCredentialResponse
  ): Promise<void> => {
    if (!isOnline) {
      // Check online status before making the request
      toast.error(
        "You are offline. Please connect to the internet to sign up with Google."
      );
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/google`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            credential: response.credential,
          }),
        }
      );

      const data = await res.json();

      if (res.ok) {
        document.cookie = `session_id=${data.data.token}; path=/; SameSite=Lax`;
        console.log("Storing session_id as cookie:", data.data.token);
        toast.success(data.msg || "Google Sign-up successful!");
        console.log("Google Sign-up successful:", data);
        router.push("/dashboard");
      } else {
        toast.error(data.message || "Google Sign-up failed. Please try again.");
      }
    } catch (error) {
      console.error("Google sign-up error:", error);
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        toast.error("Network error. Please check your internet connection.");
      } else {
        toast.error("Google Sign-up failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id:
            "824710700234-sem7cjar8m7elnoef508jj52t7jq91e4.apps.googleusercontent.com",
          callback: handleGoogleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: false,
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        window.google.accounts.id.prompt((notification: any) => {
          if (
            notification.isNotDisplayed()
            // notification.isNotDisplayedInNthInstance()
          ) {
            console.log(
              "Google One Tap not displayed or skipped:",
              notification
            );
          }
        });
      }
    };
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
      if (window.google) {
        window.google.accounts.id.cancel();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Effect to track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    setIsOnline(navigator.onLine); // Set initial status

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const getPasswordStrength = () => {
    const passedCriteria = passwordCriteria.filter((criteria) =>
      criteria.test(formData.password)
    ).length;
    if (passedCriteria <= 2)
      return { strength: "weak", color: "bg-red-500", width: "33%" };
    if (passedCriteria <= 4)
      return { strength: "medium", color: "bg-yellow-500", width: "66%" };
    return { strength: "strong", color: "bg-green-500", width: "100%" };
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#1f2937",
            color: "#fff",
            border: "1px solid #374151",
          },
        }}
      />

      {/* Animated Background */}
      <div className="fixed inset-0 opacity-20">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse animation-delay-2000"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-6">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Play className="w-6 h-6 text-white" />
            </div>
            <span className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              ReelPilot
            </span>
          </div>
          <h1 className="text-3xl font-bold mb-2">Create Your Account</h1>
          <p className="text-gray-400">
            Join thousands of creators making viral content
          </p>
        </div>

        {/* Signup Form */}
        <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/50 shadow-2xl">
          <div className="space-y-6">
            {/* Name Field */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all duration-200 text-white placeholder-gray-400"
                  placeholder="Your full name"
                />
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all duration-200 text-white placeholder-gray-400"
                  placeholder="creator@example.com"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  onFocus={() => setPasswordFocus(true)}
                  onBlur={() => setPasswordFocus(false)}
                  className="w-full pl-10 pr-12 py-3 bg-gray-800/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all duration-200 text-white placeholder-gray-400"
                  placeholder="Create a strong password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                  )}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="mt-2">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="flex-1 bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          getPasswordStrength().color
                        }`}
                        style={{ width: getPasswordStrength().width }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-400 capitalize">
                      {getPasswordStrength().strength}
                    </span>
                  </div>
                </div>
              )}

              {/* Password Criteria */}
              {(passwordFocus || formData.password) && (
                <div className="mt-3 space-y-1">
                  {passwordCriteria.map((criteria, index) => {
                    const isPassed = criteria.test(formData.password);
                    return (
                      <div
                        key={index}
                        className="flex items-center space-x-2 text-xs"
                      >
                        {isPassed ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <X className="w-4 h-4 text-red-500" />
                        )}
                        <span
                          className={
                            isPassed ? "text-green-400" : "text-gray-400"
                          }
                        >
                          {criteria.text}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-12 py-3 bg-gray-800/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all duration-200 text-white placeholder-gray-400"
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                  )}
                </button>
              </div>
              {formData.confirmPassword && (
                <div className="mt-2 flex items-center space-x-2">
                  {formData.password === formData.confirmPassword ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-xs text-green-400">
                        Passwords match
                      </span>
                    </>
                  ) : (
                    <>
                      <X className="w-4 h-4 text-red-500" />
                      <span className="text-xs text-red-400">
                        Passwords don&apos;t match
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Terms & Conditions */}
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="terms"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-600 rounded bg-gray-800 mt-1"
              />
              <label
                htmlFor="terms"
                className="text-sm text-gray-400 leading-relaxed"
              >
                I agree to the{" "}
                <button
                  type="button"
                  className="text-purple-400 hover:text-purple-300 underline"
                  onClick={() => toast("Terms & Conditions page coming soon!")}
                >
                  Terms & Conditions
                </button>{" "}
                and{" "}
                <button
                  type="button"
                  className="text-purple-400 hover:text-purple-300 underline"
                  onClick={() => toast("Privacy Policy page coming soon!")}
                >
                  Privacy Policy
                </button>
              </label>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={isLoading || !isOnline} // Disable if offline
              className="group w-full bg-gradient-to-r from-purple-500 to-pink-500 py-3 px-4 rounded-lg font-semibold text-white hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:transform-none"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
            {!isOnline && ( // Visual indicator when offline
              <p className="text-red-400 text-center text-sm mt-4">
                You are offline. Account creation requires an internet
                connection.
              </p>
            )}
          </div>
        </div>

        {/* Sign In Link */}
        <div className="text-center mt-8">
          <p className="text-gray-400">
            Already have an account?{" "}
            <button
              onClick={() => router.push("/login")}
              className="text-purple-400 hover:text-purple-300 font-semibold transition-colors"
            >
              Sign in here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
