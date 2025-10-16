"use client";

import React, { useState } from "react";
import { Play, ArrowRight, Mail, CheckCircle, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsLoading(true);

    // Basic email validation
    if (!email || !email.includes("@") || !email.includes(".")) {
      setMessage({
        type: "error",
        text: "Please enter a valid email address.",
      });
      setIsLoading(false);
      return;
    }

    // Simulate API call
    try {
      // In a real application, you would make an API call here:
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/forgot-pwd`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }
      );
      const data = await response.json();

      if (data.success) {
        setMessage({
          type: "success",
          text: data.message,
        });
        setEmail(""); // Clear the input on success
      } else {
        setMessage({
          type: "error",
          text: data.message,
        });
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      setMessage({
        type: "error",
        text: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Animated Background - Consistent with Homepage & Login */}
      <div className="fixed inset-0 opacity-20">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse animation-delay-2000"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Header - Consistent with Login Page */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-6">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Play className="w-6 h-6 text-white" />
            </div>
            <span className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              ReelPilot
            </span>
          </div>
          <h1 className="text-3xl font-bold mb-2">Forgot Password?</h1>
          <p className="text-gray-400">
            Enter your email address and we&apos;ll send you a link to reset
            your password.
          </p>
        </div>

        {/* Form Container - Consistent with Login Page Form */}
        <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/50 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field - Consistent with Login Page Input */}
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
                  className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all duration-200 text-white placeholder-gray-400"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  aria-describedby="reset-message"
                />
              </div>
            </div>

            {/* Message Display - Consistent with Login Page Toast Style */}
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

            {/* Submit Button - Consistent with Login Page Primary Button */}
            <button
              type="submit"
              className="group w-full bg-gradient-to-r from-purple-500 to-pink-500 py-3 px-4 rounded-lg font-semibold text-white hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:transform-none disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Send Reset Link</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Return to Login Link - Consistent with Login Page Secondary Link */}
        <div className="text-center mt-8">
          <p className="text-gray-400">
            Remembered your password?{" "}
            <button
              type="button" // Use type="button" to prevent accidental form submission
              onClick={() => router.push("/login")}
              className="text-purple-400 hover:text-purple-300 font-semibold transition-colors"
            >
              Log in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
