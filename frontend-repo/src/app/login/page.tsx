"use client";
import React, { useState, useEffect } from "react";
import { Play, Eye, EyeOff, Mail, Lock, ArrowRight } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useRouter } from "next/navigation";

// Declare global window.google for TypeScript
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google?: any;
  }
}

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true); // Track online status
  const router = useRouter();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Type definition for Google's credential response
  interface GoogleCredentialResponse {
    credential: string;
    select_by?: string;
    clientId?: string;
  }

  // Handler for Google One Tap credential response
  const handleGoogleCredentialResponse = async (
    response: GoogleCredentialResponse
  ): Promise<void> => {
    if (!isOnline) {
      toast.error(
        "You are offline. Please connect to the internet to sign in with Google."
      );
      return;
    }
    setIsLoading(true); // Show loading state while processing Google sign-in
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/google`, // Replace with your actual backend endpoint
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
        const hostname =
          typeof window !== "undefined" ? window.location.hostname : "";
        let cookieString = `session_id=${data.data.token}; path=/; SameSite=Lax`;
        if (hostname && hostname !== "localhost" && hostname !== "127.0.0.1") {
          cookieString += `; domain=${hostname}`;
        }
        document.cookie = cookieString;
        toast.success(data.msg || "Google Sign-in successful!");
        console.log("Google Sign-in successful:", data);
        router.push("/dashboard");
      } else {
        toast.error(data.message || "Google Sign-in failed. Please try again.");
      }
    } catch (error) {
      console.error("Google sign-in error:", error);
      toast.error(
        "Google Sign-in failed. Please check your connection and try again."
      );
    } finally {
      setIsLoading(false); // Hide loading state
    }
  };

  // Effect to load the Google GSI script and initialize One Tap
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id:
            "824710700234-sem7cjar8m7elnoef508jj52t7jq91e4.apps.googleusercontent.com", // Your Google Client ID
          callback: handleGoogleCredentialResponse, // Callback function for credential response
          auto_select: false, // Keep as is if you want user to manually select
          cancel_on_tap_outside: false, // Keep as is
          // --- NEW: Enable FedCM ---
          use_fedcm_for_prompt: true,
        });

        // --- MODIFIED: Simplified prompt handling for FedCM ---
        // With FedCM, the browser has more control. The detailed `notification` checks
        // for `isNotDisplayed()` are often no longer needed or behave differently.
        // Google recommends simply calling prompt(). If you need a fallback (e.g., a button),
        // you'd typically render it unconditionally or based on a direct user action,
        // rather than trying to detect if One Tap failed to show through notification properties.
        window.google.accounts.id.prompt();
      }
    };
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
      if (window.google) {
        window.google.accounts.id.cancel();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Depend on handleGoogleCredentialResponse if it's not stable, but it is here

  // Effect to track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Set initial status
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []); // Run once on mount

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
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    if (!isOnline) {
      toast.error("You are offline. Please connect to the internet to log in.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
          }),
        }
      );
      const data = await res.json();
      if (data.success === true) {
        toast.success(data.msg || "Logged in!");
        console.log("API response:", data);
        toast.success("Welcome back to ReelPilot! 🎬");
        console.log("Login successful:", formData);
        if (data.data.token) {
          const hostname =
            typeof window !== "undefined" ? window.location.hostname : "";
          let cookieString = `session_id=${data.data.token}; path=/; SameSite=Lax`;
          if (
            hostname &&
            hostname !== "localhost" &&
            hostname !== "127.0.0.1"
          ) {
            cookieString += `; domain=${hostname}`;
          }
          document.cookie = cookieString;
          localStorage.setItem("authToken", data.data.token);
        }
        router.push("/dashboard");
      } else if (data.success === false) {
        toast.error(data.msg || "Login failed. Please try again.");
      }
    } catch (error) {
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        toast.error("Network error. Please check your internet connection.");
      } else {
        toast.error("Login failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
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
          <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
          <p className="text-gray-400">
            Sign in to continue creating viral content
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/50 shadow-2xl">
          <div className="space-y-6">
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
                  className="w-full pl-10 pr-12 py-3 bg-gray-800/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all duration-200 text-white placeholder-gray-400"
                  placeholder="Enter your password"
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
            </div>

            {/* Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center cursor-pointer select-none relative">
                <input
                  name="remember-me"
                  type="checkbox"
                  className="appearance-none h-4 w-4 border border-gray-600 rounded bg-gray-800 checked:bg-gradient-to-br checked:from-purple-500 checked:to-pink-500 checked:border-transparent focus:ring-2 focus:ring-purple-500 transition-all duration-200"
                />
                {/* Custom checkmark with SVG tick */}
                <span className="peer pointer-events-none absolute left-0 top-0 w-4 h-4 flex items-center justify-center">
                  <svg
                    className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity"
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="3 7 5.5 9.5 9 4" />
                  </svg>
                </span>
                <span className="ml-2 block text-sm text-gray-400">
                  Remember me
                </span>
              </label>
              <button
                type="button"
                className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
                onClick={() => router.push("/forgot-pwd")}
              >
                Forgot password?
              </button>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={isLoading || !isOnline}
              className="group w-full bg-gradient-to-r from-purple-500 to-pink-500 py-3 px-4 rounded-lg font-semibold text-white hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:transform-none"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
            {!isOnline && ( // Visual indicator when offline
              <p className="text-red-400 text-center text-sm mt-4">
                You are offline. Login requires an internet connection.
              </p>
            )}
          </div>
        </div>

        {/* Sign Up Link */}
        <div className="text-center mt-8">
          <p className="text-gray-400">
            Don&apos;t have an account?{" "}
            <button
              onClick={() => router.push("/signup")}
              className="text-purple-400 hover:text-purple-300 font-semibold transition-colors"
            >
              Sign up for free
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
