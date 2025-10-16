// app/reset-password/page.tsx
"use client";

import React, { useState, useEffect, Suspense } from "react"; // Added Suspense import
import {
  Play,
  ArrowRight,
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

// This is a wrapper component to hold the main logic that uses useSearchParams
// We extract it so Suspense can wrap it in the parent.
function ResetPasswordContent() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [isTokenMissing, setIsTokenMissing] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams(); // useSearchParams is here

  useEffect(() => {
    const urlToken = searchParams.get("token");
    if (urlToken) {
      setToken(urlToken);
      setIsTokenMissing(false);
    } else {
      setToken(null);
      setIsTokenMissing(true);
      setMessage({
        type: "error",
        text: "Invalid or missing password reset token. Please request a new link.",
      });
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsLoading(true);

    if (isTokenMissing || !token) {
      setMessage({
        type: "error",
        text: "Cannot reset password: No valid token found.",
      });
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setMessage({
        type: "error",
        text: "Password must be at least 6 characters long.",
      });
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match." });
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/reset-pwd`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ newPassword: password }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: "success",
          text: data.message || "Password reset successfully!",
        });
        setPassword("");
        setConfirmPassword("");
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      } else {
        setMessage({
          type: "error",
          text: data.message || "Failed to reset password. Please try again.",
        });
      }
    } catch (error) {
      console.error("Reset password error:", error);
      setMessage({
        type: "error",
        text: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
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
        <h1 className="text-3xl font-bold mb-2">Set New Password</h1>
        <p className="text-gray-400">Enter your new password below.</p>
      </div>

      {/* Form Container */}
      <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/50 shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* New Password Field */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              New Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                className="w-full pl-10 pr-12 py-3 bg-gray-800/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all duration-200 text-white placeholder-gray-400"
                placeholder="Enter your new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                aria-describedby="reset-message"
                disabled={isTokenMissing}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                disabled={isTokenMissing}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                )}
              </button>
            </div>
          </div>

          {/* Confirm Password Field */}
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Confirm New Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                id="confirmPassword"
                className="w-full pl-10 pr-12 py-3 bg-gray-800/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all duration-200 text-white placeholder-gray-400"
                placeholder="Confirm your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                aria-describedby="reset-message"
                disabled={isTokenMissing}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                disabled={isTokenMissing}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                )}
              </button>
            </div>
          </div>

          {/* Message Display */}
          {message && (
            <div
              className={`flex items-center space-x-2 p-3 rounded-lg text-sm ${
                message.type === "success"
                  ? "bg-green-500/20 text-green-300"
                  : "bg-red-500/20 text-red-300"
              }`}
              role={message.type === "error" ? "alert" : "status"}
              id="reset-message"
            >
              {message.type === "success" ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <XCircle className="w-5 h-5" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="group w-full bg-gradient-to-r from-purple-500 to-pink-500 py-3 px-4 rounded-lg font-semibold text-white hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:transform-none disabled:cursor-not-allowed"
            disabled={isLoading || isTokenMissing}
          >
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <span>Reset Password</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Return to Login Link */}
      <div className="text-center mt-8">
        <p className="text-gray-400">
          Remembered your password?{" "}
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="text-purple-400 hover:text-purple-300 font-semibold transition-colors"
          >
            Log in
          </button>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 opacity-20">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse animation-delay-2000"></div>
      </div>

      {/* Suspense Boundary */}
      <Suspense
        fallback={
          <div className="relative z-10 text-white text-lg">
            Loading password reset form...
          </div>
        }
      >
        <ResetPasswordContent />
      </Suspense>
    </div>
  );
}
