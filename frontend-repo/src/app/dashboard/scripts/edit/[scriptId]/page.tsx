// /scripts/edit/[scriptId]/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Play,
  FileText,
  ArrowRight,
  CheckCircle,
  X,
  Pencil,
  Save,
  Loader2,
  ArrowLeft,
  Smartphone, // Added for phone icon
  Camera, // Added for camera icon
} from "lucide-react";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";

// Import IndexedDB utility functions (adjust path as necessary)
import {
  getScriptFromDb,
  saveScriptToDb,
  addToSyncQueue,
} from "@/utils/indexedDB/scripts.js";
import { getCookie } from "@/actions/cookie";

const DO_NOT_SHOW_WEB_CAM_PROMPT = "doNotShowWebcamPrompt";

export default function ViewScriptPage() {
  const router = useRouter();
  const { scriptId } = useParams();
  const [scriptTitle, setScriptTitle] = useState("");
  const [scriptContent, setScriptContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditable, setIsEditable] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showWebcamPrompt, setShowWebcamPrompt] = useState(false); // State for the new dialog
  const [doNotShowAgain, setDoNotShowAgain] = useState(false); // State for "do not show again" checkbox
  const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

  const fetchScript = useCallback(async () => {
    if (!scriptId) {
      setIsLoading(false);
      setError("No script ID provided.");
      return;
    }

    setIsLoading(true);
    setError(null);
    let scriptLoadedFromCache = false;

    try {
      // 1. Attempt to load script from IndexedDB cache first
      const cachedScript = await getScriptFromDb(scriptId as string); // Cast scriptId to string
      if (cachedScript) {
        setScriptTitle(cachedScript.title);
        setScriptContent(cachedScript.content);
        scriptLoadedFromCache = true;
        console.log("Script loaded from IndexedDB cache for offline use.");
        setIsLoading(false); // Display cached data immediately
      } else {
        console.log(
          "Script not found in IndexedDB cache. Attempting to fetch from network..."
        );
      }

      // 2. Always attempt to fetch the latest script from the network
      const session_id = await getCookie("session_id");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/scripts/getOne?scriptId=${scriptId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            authorization: `Bearer ${session_id}`,
          },
        }
      );

      if (!response.ok) {
        if (!scriptLoadedFromCache) {
          // No cached data and network failed: critical error
          throw new Error(
            `Failed to fetch script from network: ${response.status}`
          );
        } else {
          // Network failed, but we have cached data: warn but proceed
          console.warn(
            "Network fetch failed, but script was loaded from cache. Displaying cached data."
          );
          return; // Stop here, use cached data
        }
      }

      const data = await response.json();
      if (data.success && data.script) {
        const fetchedScript = data.script;
        setScriptTitle(fetchedScript.title);
        setScriptContent(fetchedScript.content);
        // 3. Cache the newly fetched script to IndexedDB
        await saveScriptToDb(fetchedScript); // This will add or update the script
        console.log(
          "Script successfully fetched from network and updated in IndexedDB cache."
        );
      } else {
        // Even if cached, if network returns 'not found' or 'unsuccessful', it's an issue
        if (!scriptLoadedFromCache) {
          setError(
            "Failed to fetch script: " + (data.message || "Unknown error")
          );
        } else {
          console.warn(
            "Network returned no script, but cached data is present."
          );
        }
      }
    } catch (e) {
      console.error("Error fetching or caching script:", e);
      if (!scriptLoadedFromCache) {
        // Only set error if no data could be displayed at all
        // @ts-expect-error idk
        setError(e.message || "Could not load script. Please try again.");
      } else {
        // If cached data is shown, just warn about network update failure
        console.warn("Network update failed, displaying cached script data.");
      }
    } finally {
      // Ensure loading is off after all attempts
      setIsLoading(false);
    }
  }, [scriptId]); // Depend on scriptId

  useEffect(() => {
    fetchScript();
    // Check local storage for the "do not show again" preference on mount
    const storedPreference = localStorage.getItem(DO_NOT_SHOW_WEB_CAM_PROMPT);
    if (storedPreference === "true") {
      setDoNotShowAgain(true);
    }
  }, [fetchScript]); // Call fetchScript when it changes (which is only on mount due to useCallback)

  const handleSaveScript = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    setError(null);

    // Prepare the script data to be saved/synced
    const scriptToSave = {
      _id: scriptId as string, // Ensure this matches your keyPath
      title: scriptTitle,
      content: scriptContent,
      wordCount: getWordCount(),
      estimatedDuration: getEstimatedDuration(),
      // Include any other properties of your script you want to save/sync
    };

    try {
      // 1. Immediately save/update the script in local IndexedDB
      await saveScriptToDb(scriptToSave);
      console.log("Script saved to IndexedDB locally.");
      setSaveSuccess(true); // Show local success immediately
      setIsEditable(false); // Exit edit mode

      // 2. Attempt to sync with the server IF ONLINE
      if (isOnline) {
        console.log("Online: Attempting to sync with server...");
        const session_id = await getCookie("session_id"); // Get cookie for API call

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/scripts/update`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              authorization: `Bearer ${session_id}`,
            },
            body: JSON.stringify(scriptToSave), // Send the same data
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (data.success) {
          console.log("Script successfully synced with server.");
          // If successful, there's no need to add to sync queue (or remove if it was there)
          // For simplicity, we assume immediate success means it won't be queued.
        } else {
          // Server returned an error even with 200 OK, potentially add to queue with error info
          console.warn(
            "Server reported non-success for save, but network OK. Queueing for retry.",
            data.message
          );
          await addToSyncQueue({
            type: "UPDATE_SCRIPT",
            data: scriptToSave,
            timestamp: Date.now(),
            attempts: 0,
            lastError: data.message || "Server reported failure",
          });
          setError(
            "Save failed on server, queued for retry: " +
              (data.message || "Unknown error")
          );
          setSaveSuccess(false); // No success if server reported error
        }
      } else {
        // 3. IF OFFLINE: Add to sync queue
        console.log("Offline: Adding script update to sync queue.");
        await addToSyncQueue({
          type: "UPDATE_SCRIPT",
          data: scriptToSave,
          timestamp: Date.now(),
          attempts: 0,
          status: "pending",
        });
        setError("You are offline. Script saved locally and queued for sync.");
        // We already set saveSuccess to true earlier for local save
      }
    } catch (e) {
      console.error("Error saving/syncing script:", e);
      // This catch block handles network errors if online, or general errors
      // If a network error, and we are offline (which would cause a fetch error)
      // the `else` block above would have queued it.
      // This `catch` primarily handles unexpected errors or network failures when online
      // that weren't caught by `!response.ok`.
      setError(
        "Could not save script. Please try again. (Details: " +
          (e as Error).message +
          ")"
      );
      setSaveSuccess(false); // No success if an error occurred during primary flow
      // If we got here due to a network error while online, we might also want to queue it.
      if (isOnline) {
        // If it failed while online, queue it for retry
        console.warn("Network request failed while online, queuing for retry.");
        await addToSyncQueue({
          type: "UPDATE_SCRIPT",
          data: scriptToSave,
          timestamp: Date.now(),
          attempts: 0,
          status: "failed_online_attempt",
          lastError: (e as Error).message,
        });
      }
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveSuccess(false), 3000); // Hide success message after 3 seconds
    }
  };

  const getWordCount = () => {
    return scriptContent.trim().split(/\s+/).filter(Boolean).length;
  };

  const getEstimatedDuration = () => {
    const wordsPerMinute = 150;
    return Math.ceil(getWordCount() / wordsPerMinute);
  };

  const handleProceedToRecording = () => {
    // Check if the user has opted out of seeing the prompt again
    if (localStorage.getItem(DO_NOT_SHOW_WEB_CAM_PROMPT) === "true") {
      router.push(`/record?scriptId=${scriptId}`);
    } else {
      setShowWebcamPrompt(true); // Show the custom dialog
    }
  };

  const handleConfirmWebcamPrompt = () => {
    if (doNotShowAgain) {
      localStorage.setItem(DO_NOT_SHOW_WEB_CAM_PROMPT, "true");
    }
    setShowWebcamPrompt(false);
    router.push(`/record?scriptId=${scriptId}`);
  };

  const handleCancelWebcamPrompt = () => {
    setShowWebcamPrompt(false);
  };

  // --- JSX REMAINS LARGELY THE SAME ---
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-purple-400" />
        <p className="ml-4 text-xl">Loading script...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-red-500">
        <X className="w-12 h-12 mb-4" />
        <p className="text-xl text-center">{error}</p>
        <button
          onClick={() => router.back()}
          className="mt-6 bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 rounded-full font-semibold hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
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
          <h1 className="text-4xl font-bold mb-4">View & Edit Your Script</h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Review and make changes to your script content and title.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Script Input Section */}
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/50 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-6 h-6 text-purple-400" />
                    <h2 className="text-2xl font-bold">Your Script</h2>
                  </div>
                  <button
                    onClick={() => setIsEditable(!isEditable)}
                    className="flex items-center space-x-2 px-4 py-2 bg-purple-600/30 text-purple-200 rounded-full hover:bg-purple-600/50 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                    <span>{isEditable ? "Viewing" : "Edit"}</span>
                  </button>
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
                    maxLength={200}
                    disabled={!isEditable}
                  />
                  <div className="text-xs text-gray-400 text-right mt-1">
                    {scriptTitle.length} / 200
                  </div>
                </div>

                {/* Textarea */}
                <div className="relative">
                  <textarea
                    value={scriptContent}
                    onChange={(e) => {
                      if (e.target.value.length <= 50000) {
                        setScriptContent(e.target.value);
                      }
                    }}
                    maxLength={50000}
                    placeholder={`Enter your script here... \n\nFor example:\nHey everyone! Today I'm going to show you an amazing life hack that will change the way you think about productivity.\n\nFirst, let me tell you why this matters...\n\n[Continue with your script]`}
                    className="w-full h-64 p-4 bg-gray-800/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all duration-200 text-white placeholder-gray-400 resize-none"
                    disabled={!isEditable}
                  />
                  <div className="absolute bottom-3 right-4 text-xs text-gray-400">
                    {scriptContent.length} / 50000
                  </div>
                  {isEditable && scriptContent && (
                    <button
                      onClick={() => setScriptContent("")}
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
                      {scriptContent.length}
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
                      {scriptContent.trim()
                        ? scriptContent
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

              {/* Action Buttons */}
              {isEditable ? (
                <button
                  onClick={handleSaveScript}
                  disabled={
                    !scriptContent.trim() || !scriptTitle.trim() || isSaving
                  }
                  className="group w-full bg-gradient-to-r from-purple-500 to-pink-500 py-4 px-6 rounded-xl font-semibold text-white hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-3 disabled:opacity-50 disabled:transform-none disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <>
                      <span className="text-lg">Save Changes</span>
                      <Save className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleProceedToRecording}
                  disabled={!scriptContent.trim() || !scriptTitle.trim()}
                  className="group w-full bg-gradient-to-r from-purple-500 to-pink-500 py-4 px-6 rounded-xl font-semibold text-white hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-3 disabled:opacity-50 disabled:transform-none disabled:cursor-not-allowed"
                >
                  <span className="text-lg">Proceed to Recording</span>
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </button>
              )}

              {saveSuccess && (
                <div className="flex items-center justify-center space-x-2 text-green-400 mt-4">
                  <CheckCircle className="w-5 h-5" />
                  <span>Script saved successfully!</span>
                </div>
              )}
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
