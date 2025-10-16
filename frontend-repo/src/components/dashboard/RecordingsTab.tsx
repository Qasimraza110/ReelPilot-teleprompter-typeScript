/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect } from "react";
import { getAllRecordings, deleteRecording } from "@/utils/indexedDB/recordings";
import Image from "next/image";
import VideoModal from "@/components/VideoModal";
import { getCookie } from "@/actions/cookie";
import { Cloud, Download, Trash2, Upload, Video } from "lucide-react";

const RecordingsTab = () => {

  type UnsavedRecording = {
    id: string;
    blob: Blob;
    duration: number;
    timestamp: number;
    scriptId?: string;
    transcript?: string;
    thumbnailUrl?: string;
    isImage?: boolean;
  };

  type SavedRecording = {
    url: string;
    _id: string;
    duration: number;
    savedDate: string | number | Date;
    thumbnailUrl?: string;
    isImage?: boolean;
  };

  const [unsavedRecordings, setUnsavedRecordings] = useState<UnsavedRecording[]>([]);
  const [savedRecordings, setSavedRecordings] = useState<SavedRecording[]>([]);
  const [loadingUnsaved, setLoadingUnsaved] = useState(true);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [errorUnsaved, setErrorUnsaved] = useState<string | null>(null);
  const [errorSaved, setErrorSaved] = useState<string | null>(null);
  const [activeRecordingsTab, setActiveRecordingsTab] = useState("unsaved");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecordingUrl, setSelectedRecordingUrl] = useState<string | null>(null);
  const [savingIds, setSavingIds] = useState<string[]>([]);
  


  // --- Fetch Unsaved Recordings ---
  const fetchUnsavedRecordings = async () => {
    setLoadingUnsaved(true);
    setErrorUnsaved(null);

    try {
      const recordings = await getAllRecordings();

      const recordingsWithThumbnails = await Promise.all(
        recordings
          .filter((rec: UnsavedRecording) => rec.blob && rec.blob.size > 0)
          .map(async (rec: UnsavedRecording) => {
            let thumbnailUrl: string | null = null;
            try {
              thumbnailUrl = await generateThumbnail(rec.blob);
            } catch (err) {
              console.error("Thumbnail generation failed:", err);
            }
            return { ...rec, thumbnailUrl };
          })
      );

      setUnsavedRecordings(recordingsWithThumbnails);
    } catch (err) {
      console.error("Failed to fetch unsaved recordings:", err);
      setErrorUnsaved("Failed to load unsaved recordings.");
    } finally {
      setLoadingUnsaved(false);
    }
  };

  // --- Fetch Saved Recordings ---
  const fetchSavedRecordings = async () => {
    setLoadingSaved(true);
    setErrorSaved(null);
    try {
      const session_id = await getCookie("session_id");
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/recordings/getAll`, {
        method: "GET",
        headers: { authorization: `Bearer ${session_id}` },
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();

      const savedRecordingsWithThumbnails: SavedRecording[] = await Promise.all(
        data.recordings.map(async (rec: any, index: number) => {
          let thumbnailUrl: string | undefined;
          if (rec.thumbnailUrl) {
            thumbnailUrl = rec.thumbnailUrl.startsWith("https://res.cloudinary.com")
              ? rec.thumbnailUrl
              : await generateThumbnailFromUrl(rec.thumbnailUrl);
          }
          return {
            ...rec,
            thumbnailUrl,
            url: rec.url ?? rec.thumbnailUrl,
            isImage: index >= 1,
          };
        })
      );

      setSavedRecordings(savedRecordingsWithThumbnails);
    } catch (err) {
      console.error("Failed to fetch saved recordings:", err);
      setErrorSaved("Failed to load saved recordings.");
    } finally {
      setLoadingSaved(false);
    }
  };

  // --- Thumbnail generation from Blob ---
  const generateThumbnail = (videoBlob: Blob, seekTo = 2.0): Promise<string> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject("Canvas context not available");

      video.preload = "metadata";
      video.muted = true;
      video.playsInline = true;
      video.src = URL.createObjectURL(videoBlob);

      video.onloadedmetadata = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        video.currentTime = Math.min(seekTo, video.duration - 0.1);
      };

      video.onseeked = () => {
        try {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.8));
        } catch (err) {
          reject(err);
        } finally {
          URL.revokeObjectURL(video.src);
        }
      };

      video.onerror = () => reject(video.error ?? new Error("Unknown video error"));
      video.load();
    });
  };

  // --- Thumbnail generation from URL ---
  const generateThumbnailFromUrl = (videoUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      video.crossOrigin = "anonymous";
      video.src = videoUrl;
      video.autoplay = false;
      video.muted = true;

      video.onloadedmetadata = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        video.currentTime = Math.min(1, video.duration - 0.1);
      };

      video.onseeked = () => {
        try {
          ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg"));
        } catch (err) {
          reject(err);
        }
      };

      video.onerror = (err) => reject(err);
    });
  };

  useEffect(() => {
    // Default to unsaved if query param tab=recordings present (from redirect)
    try {
      if (typeof window !== "undefined") {
        const qp = new URLSearchParams(window.location.search);
        const tab = qp.get("tab");
        if (tab === "recordings") setActiveRecordingsTab("unsaved");
      }
    } catch {}
    // Initial fetch
    fetchUnsavedRecordings();
  }, []);

  useEffect(() => {
    if (activeRecordingsTab === "unsaved") fetchUnsavedRecordings();
    else if (activeRecordingsTab === "saved") fetchSavedRecordings();
  }, [activeRecordingsTab]);

  // --- Actions ---
  const handleDeleteUnsaved = async (id: string) => {
    try {
      await deleteRecording(id);
      fetchUnsavedRecordings();
    } catch (err) {
      console.error(err);
      alert("Failed to delete recording.");
    }
  };

  const handleDownloadUnsaved = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveUnsaved = async (recording: UnsavedRecording) => {
  setSavingIds((prev) => [...prev, recording.id]); // start loading
  try {
    const formData = new FormData();
    formData.append("video", recording.blob, `recording-${recording.id}.webm`);
    formData.append("scriptId", recording.scriptId || "");
    formData.append("duration", recording.duration.toString());
    formData.append("transcript", recording.transcript || "");

    const session_id = await getCookie("session_id");
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/recordings/upload`, {
      method: "POST",
      body: formData,
      headers: { authorization: `Bearer ${session_id}` },
    });

    if (!res.ok) throw new Error("Upload failed");

    await deleteRecording(recording.id);
    fetchUnsavedRecordings();
    fetchSavedRecordings();
    alert("Recording saved successfully!");
  } catch (err) {
    console.error(err);
    alert("Failed to save recording.");
  } finally {
    setSavingIds((prev) => prev.filter((id) => id !== recording.id)); // stop loading
  }
};


  // --- Render ---
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">My Recordings</h1>
        <p className="text-gray-400">Manage your unsaved and cloud-saved video takes.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        <button
          className={`px-4 py-2 font-medium ${
            activeRecordingsTab === "unsaved"
              ? "text-purple-400 border-b-2 border-purple-500"
              : "text-gray-400 hover:text-white"
          }`}
          onClick={() => setActiveRecordingsTab("unsaved")}
        >
          Unsaved Takes
        </button>
        <button
          className={`px-4 py-2 font-medium ${
            activeRecordingsTab === "saved"
              ? "text-purple-400 border-b-2 border-purple-500"
              : "text-gray-400 hover:text-white"
          }`}
          onClick={() => setActiveRecordingsTab("saved")}
        >
          Saved Takes
        </button>
      </div>

      {/* Unsaved Recordings */}
      {activeRecordingsTab === "unsaved" && (
        <div className="p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl min-h-[520px]">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
            <Video className="w-5 h-5" /> <span>Unsaved Takes (Local)</span>
          </h2>

          {loadingUnsaved ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 bg-gray-700 rounded-xl h-48" />
              ))}
            </div>
          ) : errorUnsaved ? (
            <div className="p-4 bg-red-500/20 border border-red-400/30 rounded-xl text-red-400">
              {errorUnsaved}
              <button
                onClick={fetchUnsavedRecordings}
                className="ml-4 px-3 py-1 bg-red-500/30 rounded text-sm hover:bg-red-500/40 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : unsavedRecordings.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Video className="w-16 h-16 mx-auto mb-4" />
              <p>No unsaved recordings found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {unsavedRecordings.map((rec) => (
                <div
                  key={rec.id}
                  className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col min-h-[380px]"
                >
                  {/* Thumbnail */}
                  {rec.thumbnailUrl ? (
                    rec.thumbnailUrl.startsWith("https://res.cloudinary.com") ? (
                      <img
                        src={rec.thumbnailUrl}
                        alt={`Thumbnail for recording ${rec.id}`}
                        className="w-full h-32 object-cover rounded-md mb-3"
                      />
                    ) : (
                      <Image
                        src={rec.thumbnailUrl}
                        alt={`Thumbnail for recording ${rec.id}`}
                        className="w-full h-32 object-cover rounded-md mb-3"
                        width={1080}
                        height={720}
                      />
                    )
                  ) : (
                    <div className="w-full h-32 bg-gray-700 rounded-md mb-3 flex items-center justify-center text-gray-400">
                      No Thumbnail
                    </div>
                  )}
                  <h4 className="font-semibold text-white truncate">Recording {rec.id}</h4>
                  <p className="text-sm text-gray-400 mb-3">Duration: {rec.duration.toFixed(2)}s</p>
                  <p className="text-sm text-gray-400 mb-3">
                    Created: {new Date(rec.timestamp).toLocaleDateString()}{" "}
                    {new Date(rec.timestamp).toLocaleTimeString()}
                  </p>

                  <div className="flex flex-col gap-2 mt-auto sm:flex-row flex-wrap">
                    <button
                      onClick={() => handleDownloadUnsaved(rec.blob, `recording-${rec.id}.webm`)}
                      className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm flex items-center justify-center space-x-1"
                    >
                      <Download className="w-4 h-4" /> <span>Download</span>
                    </button>
                    <button
  onClick={() => handleSaveUnsaved(rec)}
  disabled={savingIds.includes(rec.id)}
  className={`flex-1 px-3 py-2 rounded-lg text-white text-sm flex items-center justify-center space-x-1 ${
    savingIds.includes(rec.id) ? "bg-purple-400 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700"
  }`}
>
  <Upload className="w-4 h-4" />
  <span>{savingIds.includes(rec.id) ? "Saving..." : "Save"}</span>
</button>

                    <button
                      onClick={() => handleDeleteUnsaved(rec.id)}
                      className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white text-sm flex items-center justify-center space-x-1"
                    >
                      <Trash2 className="w-4 h-4" /> <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Saved Recordings */}
      {activeRecordingsTab === "saved" && (
        <div className="p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl min-h-[520px]">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
            <Cloud className="w-5 h-5" /> <span>Saved Takes (Cloud)</span>
          </h2>

          {loadingSaved ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 bg-gray-700 rounded-xl h-48" />
              ))}
            </div>
          ) : errorSaved ? (
            <div className="p-4 bg-red-500/20 border border-red-400/30 rounded-xl text-red-400">
              {errorSaved}
              <button
                onClick={fetchSavedRecordings}
                className="ml-4 px-3 py-1 bg-red-500/30 rounded text-sm hover:bg-red-500/40 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : savedRecordings.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Cloud className="w-16 h-16 mx-auto mb-4" />
              <p>No saved recordings found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedRecordings.map((rec: SavedRecording) => {
                const savedDate = new Date(rec.savedDate);
                return (
                  <div
                    key={rec._id}
                    className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col min-h-[380px]"
                  >
                    {rec.thumbnailUrl ? (
                      rec.thumbnailUrl.startsWith("https://res.cloudinary.com") ? (
                        <img
                          src={rec.thumbnailUrl}
                          alt={`Thumbnail for recording ${rec._id}`}
                          className="w-full h-32 object-cover rounded-md mb-3"
                        />
                      ) : (
                        <Image
                          src={rec.thumbnailUrl}
                          alt={`Thumbnail for recording ${rec._id}`}
                          className="w-full h-32 object-cover rounded-md mb-3"
                          width={1080}
                          height={720}
                        />
                      )
                    ) : (
                      <div className="w-full h-32 bg-gray-700 rounded-md mb-3 flex items-center justify-center text-gray-400">
                        No Thumbnail
                      </div>
                    )}
                    <h4 className="font-semibold text-white truncate">
                      Saved Recording {rec._id.slice(0, 6)}
                    </h4>
                    <p className="text-sm text-gray-400 mb-3">
                      Duration: {rec.duration.toFixed(2)}s
                    </p>
                    <p className="text-sm text-gray-400 mb-3">
                      Saved:{" "}
                      {isNaN(savedDate.getTime())
                        ? "Unknown"
                        : `${savedDate.toLocaleDateString()} ${savedDate.toLocaleTimeString()}`}
                    </p>

                  <div className="flex space-x-2 mt-auto">
                      <button
                        className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm"
                        onClick={() => {
                          setSelectedRecordingUrl(rec.url);
                          setIsModalOpen(true);
                        }}
                      >
                        View
                      </button>
                      
                      <button
                        className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white text-sm"
                        onClick={async () => {
                          if (!window.confirm("Are you sure you want to delete this recording?")) return;
                          try {
                            const session_id = await getCookie("session_id");
                            const fileId = new URL(rec.url).searchParams.get("id");
                            const res = await fetch(
                              `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/recordings/delete`,
                              {
                                method: "DELETE",
                                headers: {
                                  "Content-Type": "application/json",
                                  authorization: `Bearer ${session_id}`,
                                },
                                body: JSON.stringify({ fileId, id: rec._id }),
                              }
                            );
                            if (!res.ok) throw new Error("Failed to delete recording");
                            fetchSavedRecordings();
                          } catch (err) {
                            alert("Failed to delete recording.");
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                    
                  </div>
                );
              })}
            </div>
          )}

          <VideoModal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setSelectedRecordingUrl(null);
            }}
            videoUrl={selectedRecordingUrl ?? ""}
          />
        </div>
      )}
    </div>
  );
};

export default RecordingsTab;
