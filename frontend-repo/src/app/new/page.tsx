"use client";

import React, { useState, useRef, useEffect } from "react"; // Added useEffect
import {
  Play,
  Upload,
  FileText,
  ArrowRight,
  X,
  CheckCircle,
  ArrowLeft,
  Smartphone, // Added for phone icon
  Camera, // Added for camera icon
} from "lucide-react";
import { useRouter } from "next/navigation";
import { getCookie } from "@/actions/cookie";

const DO_NOT_SHOW_WEB_CAM_PROMPT = "doNotShowWebcamPrompt"; // Constant for local storage key

export default function NewScriptPage() {
  const [script, setScript] = useState("");
  const [scriptTitle, setScriptTitle] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showWebcamPrompt, setShowWebcamPrompt] = useState(false); // State for the new dialog
  const [doNotShowAgain, setDoNotShowAgain] = useState(false); // State for "do not show again" checkbox
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Effect to check local storage on component mount
  useEffect(() => {
    const storedPreference = localStorage.getItem(DO_NOT_SHOW_WEB_CAM_PROMPT);
    if (storedPreference === "true") {
      setDoNotShowAgain(true);
    }
  }, []);

  const showToast = (message: string, type = "success") => {
    const toast = document.createElement("div");
    toast.className = `fixed top-4 right-4 px-4 py-2 rounded-lg text-white z-50 transition-all duration-300 ${
      type === "error" ? "bg-red-500" : "bg-green-500"
    }`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    if (file.type !== "text/plain") {
      showToast("Please upload a .txt file", "error");
      return;
    }

    if (file.size > 1024 * 1024) {
      // 1MB limit
      showToast("File size should be less than 1MB", "error");
      return;
    }

    setIsLoading(true);
    try {
      const text = await file.text();
      setScript(text);
      setFileName(file.name);
      // Optionally, set the script title from the filename (without extension)
      setScriptTitle(file.name.replace(/\.[^/.]+$/, ""));
      showToast("Script uploaded successfully! 📄");
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      showToast("Error reading file", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    // Corrected type
    e.preventDefault();
    setIsDragging(false);
    const files: File[] = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    // Corrected type
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    // Corrected type
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Corrected type
    const file = e.target.files?.[0]; // Use optional chaining
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleClearScript = () => {
    setScript("");
    setFileName("");
    setScriptTitle(""); // Clear the title as well
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleProceedToRecording = async () => {
    if (!script.trim()) {
      showToast("Please enter or upload a script first", "error");
      return;
    }
    if (!scriptTitle.trim()) {
      showToast("Please enter a title for your script", "error");
      return;
    }

    // Check if the user has opted out of seeing the prompt again
    if (localStorage.getItem(DO_NOT_SHOW_WEB_CAM_PROMPT) === "true") {
      // Proceed directly if "do not show again" is checked
      await saveAndNavigateToRecording();
    } else {
      setShowWebcamPrompt(true); // Show the custom dialog
    }
  };

  const saveAndNavigateToRecording = async () => {
    showToast("Proceeding to recording studio! 🎬");
    console.log("Script content:", script);
    console.log("Script title:", scriptTitle);

    const session_id = await getCookie("session_id");

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/scripts/save`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: session_id ? `Bearer ${session_id}` : "",
          },
          body: JSON.stringify({
            script,
            title: scriptTitle,
            estimatedDuration: getEstimatedDuration(),
            wordCount: getWordCount(),
          }),
        }
      );
      const data = await response.json();
      const scriptId = data.data.scriptId;
      router.push(`/record?scriptId=${scriptId}`);
    } catch (err) {
      showToast("Failed to save script to server", "error");
      console.error("Error saving script:", err); // Log the actual error
    }
  };

  const handleConfirmWebcamPrompt = async () => {
    if (doNotShowAgain) {
      localStorage.setItem(DO_NOT_SHOW_WEB_CAM_PROMPT, "true");
    }
    setShowWebcamPrompt(false);
    await saveAndNavigateToRecording();
  };

  const handleCancelWebcamPrompt = () => {
    setShowWebcamPrompt(false);
  };

  const getWordCount = () => {
    return script
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
  };

  const getEstimatedDuration = () => {
    const words = getWordCount();
    const wordsPerMinute = 150; // Average speaking pace
    const minutes = Math.ceil(words / wordsPerMinute);
    return minutes;
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Animated Background */}
      <div className="fixed inset-0 opacity-20">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse animation-delay-2000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-2 mb-6">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Play className="w-8 h-8 text-white" />
            </div>
            <span className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              ReelPilot
            </span>
          </div>
          <h1 className="text-4xl font-bold mb-4">
            Create Your Next Viral Reel
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Start by adding your script. You can type it directly or upload a
            text file.
          </p>
          {/* Go Back Button */}
          <div className="relative z-20 container mx-auto px-6 pt-8 flex">
            <button
              onClick={() => router.back()}
              className="flex items-center space-x-2 bg-gray-800/70 hover:bg-gray-700/80 text-gray-200 px-4 py-2 rounded-full transition-colors shadow-md"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Go Back</span>
            </button>
          </div>
        </div>
        <div className="max-w-4xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Script Input Section */}
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/50 shadow-2xl">
                <div className="flex items-center space-x-3 mb-6">
                  <FileText className="w-6 h-6 text-purple-400" />
                  <h2 className="text-2xl font-bold">Your Script</h2>
                </div>

                {/* Script Title Input */}
                <div className="mb-6">
                  <label
                    htmlFor="scriptTitle"
                    className="block text-gray-300 text-sm font-bold mb-2"
                  >
                    Script Title
                  </label>
                  <input
                    type="text"
                    id="scriptTitle"
                    value={scriptTitle}
                    onChange={(e) => setScriptTitle(e.target.value)}
                    placeholder="Enter a catchy title for your script"
                    className="w-full p-3 bg-gray-800/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all duration-200 text-white placeholder-gray-400"
                    maxLength={200} // Optional: Limit title length
                  />
                  <div className="text-xs text-gray-400 text-right mt-1">
                    {scriptTitle.length} / 100
                  </div>
                </div>

                {/* File Upload Area */}
                <div
                  className={`border-2 border-dashed rounded-xl p-6 mb-6 transition-all duration-300 ${
                    isDragging
                      ? "border-purple-500 bg-purple-500/10"
                      : "border-gray-600 hover:border-gray-500"
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                >
                  <div className="text-center">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-300 mb-2">
                      Drag & drop a .txt file here, or{" "}
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-purple-400 hover:text-purple-300 underline"
                      >
                        browse files
                      </button>
                    </p>
                    <p className="text-sm text-gray-500">
                      Maximum file size: 1MB
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                </div>

                {fileName && (
                  <div className="flex items-center justify-between bg-gray-800/50 rounded-lg p-3 mb-4">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-sm text-gray-300">{fileName}</span>
                    </div>
                    <button
                      onClick={handleClearScript}
                      className="text-gray-400 hover:text-red-400 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-600"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-gray-800 text-gray-400">
                      Or type your script
                    </span>
                  </div>
                </div>

                {/* Textarea */}
                <div className="relative">
                  <textarea
                    value={script}
                    onChange={(e) => {
                      if (e.target.value.length <= 50000) {
                        setScript(e.target.value);
                      }
                    }}
                    maxLength={50000}
                    placeholder={`Enter your script here... 

For example:
Hey everyone! Today I'm going to show you an amazing life hack that will change the way you think about productivity.

First, let me tell you why this matters...

[Continue with your script]`}
                    className="w-full h-64 p-4 bg-gray-800/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all duration-200 text-white placeholder-gray-400 resize-none"
                  />
                  <div className="absolute bottom-3 right-4 text-xs text-gray-400">
                    {script.length} / 50000
                  </div>
                  {script && (
                    <button
                      onClick={handleClearScript}
                      className="absolute top-3 right-3 text-gray-400 hover:text-red-400 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Preview & Stats Section */}
            <div className="space-y-6">
              {/* Script Stats */}
              <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 shadow-2xl">
                <h3 className="text-xl font-bold mb-4">Script Analytics</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Word Count:</span>
                    <span className="text-white font-semibold">
                      {getWordCount()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Characters:</span>
                    <span className="text-white font-semibold">
                      {script.length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Estimated Duration:</span>
                    <span className="text-white font-semibold">
                      ~{getEstimatedDuration()} min
                      {getEstimatedDuration() !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Lines:</span>
                    <span className="text-white font-semibold">
                      {script.trim()
                        ? script
                            .trim()
                            .split("\n")
                            .filter((line) => line.trim().length > 0).length
                        : 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tips */}
              <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 shadow-2xl">
                <h3 className="text-xl font-bold mb-4 text-purple-400">
                  💡 Pro Tips
                </h3>
                <div className="space-y-3 text-sm text-gray-300">
                  <div className="flex items-start space-x-2">
                    <div className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                    <p>Keep sentences short and punchy for better flow</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                    <p>Add pauses between sections for natural delivery</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                    <p>Practice reading aloud before recording</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                    <p>Hook viewers in the first 3 seconds</p>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={handleProceedToRecording}
                disabled={!script.trim() || !scriptTitle.trim() || isLoading} // Disable if title is empty
                className="group w-full bg-gradient-to-r from-purple-500 to-pink-500 py-4 px-6 rounded-xl font-semibold text-white hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-3 disabled:opacity-50 disabled:transform-none disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span className="text-lg">Start Recording</span>
                    <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Dialog Box for Webcam Prompt */}
      {showWebcamPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={handleCancelWebcamPrompt}
          ></div>
          {/* Modal Content */}
          <div className="relative z-50 bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl shadow-xl p-8 w-full max-w-md text-center animate-fade-in">
            <h3 className="text-3xl font-bold text-white mb-4">
              Recording Options
            </h3>
            <p className="text-gray-300 mb-6 text-lg">
              Want to use your phone as a high-quality webcam or microphone?
            </p>
            <div className="flex flex-col space-y-4 mb-6">
              <div className="flex items-center justify-center space-x-3 bg-gray-700/50 p-3 rounded-lg border border-gray-600">
                <Smartphone className="w-6 h-6 text-purple-400" />
                <span className="text-white text-md">
                  Use your{" "}
                  <strong className="font-semibold">Phone&apos;s Mic</strong>{" "}
                  for superior audio.
                </span>
              </div>
              <div className="flex items-center justify-center space-x-3 bg-gray-700/50 p-3 rounded-lg border border-gray-600">
                <Camera className="w-6 h-6 text-pink-400" />
                <span className="text-white text-md">
                  Use your{" "}
                  <strong className="font-semibold">Phone&apos;s Camera</strong>{" "}
                  for better video.
                </span>
              </div>
            </div>
            <p className="text-gray-400 text-sm mb-6">
              Consider using{" "}
              <a
                href="https://iriun.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                Iriun Webcam
              </a>{" "}
              (a third-party app) to connect your phone. We have no affiliation
              with Iriun.
            </p>
            <div className="flex items-center justify-center mb-6">
              <input
                type="checkbox"
                id="doNotShowAgain"
                className="form-checkbox h-5 w-5 text-purple-600 rounded border-gray-500 focus:ring-purple-500 bg-gray-700"
                checked={doNotShowAgain}
                onChange={(e) => setDoNotShowAgain(e.target.checked)}
              />
              <label
                htmlFor="doNotShowAgain"
                className="ml-2 text-gray-300 text-sm cursor-pointer"
              >
                Don&apos;t show this again
              </label>
            </div>
            <div className="flex justify-center space-x-4">
              <button
                onClick={handleConfirmWebcamPrompt}
                className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-pink-600 py-3 px-6 rounded-full font-semibold text-white hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-lg"
              >
                <CheckCircle className="w-5 h-5" />
                <span>Continue</span>
              </button>
              <button
                onClick={handleCancelWebcamPrompt}
                className="flex items-center space-x-2 bg-gray-700/70 text-gray-200 py-3 px-6 rounded-full font-semibold hover:bg-gray-600/80 transition-colors shadow-lg"
              >
                <X className="w-5 h-5" />
                <span>Dismiss</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
