 /* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import React, { useEffect, useState } from "react";
import {
  saveScriptsToDb,
  getScriptsFromDb,
} from "@/utils/indexedDB/scripts.js"; // Adjust path as needed
import {
  Play,
  FileText,
  Settings,
  CreditCard,
  Menu,
  LogOut,
  Video,
} from "lucide-react";

import { saveAuthToken } from "@/utils/indexedDB/auth"; // Import your helper
import { deleteCookie, getCookie } from "@/actions/cookie";
import ScriptsTab from "@/components/dashboard/ScriptsTab";
import PlanTab from "@/components/dashboard/PlanTab";
import SettingsTab from "@/components/dashboard/SettingsTab";
import RecordingsTab from "@/components/dashboard/RecordingsTab";
import { useRouter } from "next/navigation";
// import { DebugOverlay } from "../record/DebugOverlay";

// Improved getCookie utility: safer, supports URL-decoding, and returns string | undefined

export default function ReelPilotDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("scripts");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  type PlanLimits = {
    features?: Record<string, boolean>;
    maxResolution?: string;
    maxFrameRate?: number;
    // [key: string]: string; // Add more specific properties as needed
  };
  const [planLimits, setPlanLimits] = useState<PlanLimits | null>(null);
  // Inside your main Dashboard functional component (where activeTab is defined)
  // const [activeRecordingsTab, setActiveRecordingsTab] = useState("unsaved"); // 'unsaved' or 'saved'

  type Script = {
    _id: string;
    title: string;
    content: string;
    status: string;
    category: string;
    duration?: string;
    views?: number;
    likes?: number;
    created?: string;
    estimatedDuration?: number;
    templateType?: "custom" | "trending" | "ai_generated" | "batch_generated";
    isPublic?: boolean;
    aiGenerated: boolean;
    createdAt: Date;
  };

  const [scripts, setScripts] = useState<Script[]>([]);
  const [scriptsLoading, setScriptsLoading] = useState(true);
  const [scriptsError, setScriptsError] = useState<string | null>(null);

  // Updated userSettings state to match the new API structure
  const [userSettings, setUserSettings] = useState({
    teleprompterSettings: {
      fontSize: "medium",
      scrollSpeed: "medium",
      textColor: "#ffffff",
      backgroundColor: "",
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
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsError, setSettingsError] = useState(null);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [isFreePlan, setIsFreePlan] = useState(true);
  // MODIFIED: Updated planSettings state structure to match API response more closely
  const [planSettings, setPlanSettings] = useState({
    plan: "Free",
    status: "inactive", // Default status
    startDate: "",
    endDate: "", // This might represent next billing or expiry if present in API
    price: "$0", // Price will be derived from plan if not directly provided
    billingInterval: "Monthly", // Will be derived if needed
    usage: {
      scripts: { count: 0, limit: 0 }, // Changed 'used' to 'count'
      recordings: { count: 0, limit: 0, totalDuration: 0 }, // Changed 'used' to 'count'
      exports: { count: 0, limit: 0 }, // Added exports
      aiAnalysisMinutes: { used: 0, limit: 0 }, // Added aiAnalysisMinutes
      bandwidthUsed: 0, // Added bandwidthUsed
      storage: { used: 0, limit: 0 }, // Placeholder for storage, needs adjustment if API changes
    },
  });
  const [planLoading, setPlanLoading] = useState(true);
  const [planError, setPlanError] = useState(null);

  // NEW STATE for additional filters
  const [filterIsPublic, setFilterIsPublic] = useState("All"); // "All", "True", "False"
  const [filterMinDuration, setFilterMinDuration] = useState(""); // Minimum estimated duration
  const [filterMaxDuration, setFilterMaxDuration] = useState(""); // Maximum estimated duration
  const [filterAiGenerated, setFilterAiGenerated] = useState("All"); // "All", "True", "False"
  const [filterTemplateType, setFilterTemplateType] = useState("All"); // "All", "custom", "trending", etc.
  const [filterStartDate, setFilterStartDate] = useState(""); // Created after date
  const [filterEndDate, setFilterEndDate] = useState(""); // Created before date
  // NEW STATE for filter panel visibility
  const [showFilterPanel, setShowFilterPanel] = useState(false);
   useEffect(() => {
    const checkAuth = async () => {
      try {
        const session_id = await getCookie("session_id");
        if (!session_id) {
          router.replace("/"); // redirect to home
        } else {
          await saveAuthToken(session_id);
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        router.replace("/");
      }
    };
    checkAuth();
  }, [router]);
  // API Functions
  useEffect(() => {
    fetchScripts();
    fetchUserSettings();
    fetchPlanSettings();
  }, []);

  useEffect(() => {
    const processAuth = async () => {
      try {
        const session_id_from_cookie = await getCookie("session_id");

        if (session_id_from_cookie) {
          await saveAuthToken(session_id_from_cookie);
          console.log(
            "Session ID successfully saved to IndexedDB for Service Worker."
          );
        } else {
          console.warn("No session_id cookie found on dashboard page.");
          // Handle cases where session_id might be missing (e.g., user cleared cookies)
          // You might want to redirect to login if no auth is found.
        }
      } catch (error) {
        console.error("Error saving session ID to IndexedDB:", error);
        // Potentially show a user-facing error or log it
      }
    };

    processAuth();
  }, []); // Empty dependency array means this runs once on mount

  const handleLogOut = async () => {
    console.log("sigma");

    // Call the server action. It will handle deleting the cookie AND redirecting.
    // No need to await if you don't have further client-side logic dependent on its return.
    // However, awaiting is harmless and good practice for understanding flow.
    await deleteCookie("session_id"); // This will trigger the redirect

    // Optionally clear any local/session storage related to auth
    try {
      if (window.indexedDB && indexedDB.databases) {
        const dbs = await indexedDB.databases();
        for (const db of dbs) {
          if (db.name) {
            indexedDB.deleteDatabase(db.name);
          }
        }
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      // Type assertion for 'e' for better TypeScript safety
      console.error(e.message);
    }

    // IMPORTANT: Remove router.replace("/login"); from here
    // because the server action is already handling the redirect.
    // If you keep it, you might get an error about too many redirects
    // or a conflicting redirect.
  };

  const fetchScripts = async () => {
    setScriptsLoading(true); // Start loading
    setScriptsError(null);
    let scriptsLoadedFromCache = false;

    try {
      // 1. Attempt to load scripts from IndexedDB cache first
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cachedScripts: any[] = await getScriptsFromDb();
      if (cachedScripts && cachedScripts.length > 0) {
        setScripts(cachedScripts);
        scriptsLoadedFromCache = true;
        console.log(
          "Scripts loaded from IndexedDB cache for offline use. Setting loading to false."
        );
        // IMPORTANT: If we successfully load from cache, we can immediately turn off loading
        // assuming we don't *need* to wait for a network check to display cached data.
        setScriptsLoading(false); // <--- ADD/CONFIRM THIS LINE HERE
      } else {
        console.log(
          "No scripts found in IndexedDB cache. Attempting to fetch from network..."
        );
        // If no cache, we MUST remain in loading state until network call resolves
      }

      // Retrieve session_id from cookies

      const session_id = await getCookie("session_id");
      // 2. Always attempt to fetch the latest scripts from the network
      // Wrap the network request in a separate try/catch or conditional block
      // to handle its specific loading/error states without affecting the cache display.
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/scripts/getAll`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              authorization: `Bearer ${session_id}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch scripts from network."); // Throw error for network specific issue
        }

        const data = await response.json();
        const latestScripts = data.scripts || [];
        setScripts(latestScripts); // Update with latest network data

        // 3. Cache the newly fetched scripts to IndexedDB
        await saveScriptsToDb(latestScripts);
        console.log(
          "Scripts successfully fetched from network and updated in IndexedDB cache."
        );
      } catch (networkError) {
        console.error("Network fetch failed:", networkError);
        if (!scriptsLoadedFromCache) {
          // Only set a visible error if no scripts could be loaded at all
          setScriptsError(
            // @ts-expect-error idk
            networkError.message || "An unknown network error occurred."
          );
        } else {
          // If cached scripts are available, just log a warning for network failure
          console.warn(
            "Could not update scripts from network, continuing with cached data."
          );
        }
      } finally {
        // Ensure loading is off after network attempt, regardless of success/failure
        // This is crucial if loading state was still on because cache was empty.
        setScriptsLoading(false); // <--- ENSURE THIS IS THE FINAL loading=false trigger
      }
    } catch (initialLoadError) {
      // This outer catch block would primarily catch errors from getScriptsFromDb
      console.error(
        "Error during initial script load (cache or network setup):",
        initialLoadError
      );
      setScriptsError("An unexpected error occurred during script retrieval.");
      setScriptsLoading(false); // Ensure loading is off even for critical initial errors
    }
  };

  const handleBackgroundColorChange = (color: string) => {
    setUserSettings({
      ...userSettings,
      teleprompterSettings: {
        ...userSettings.teleprompterSettings,
        backgroundColor: color,
      },
    });
  };

  const handleTransparentClick = () => {
    setUserSettings({
      ...userSettings,
      teleprompterSettings: {
        ...userSettings.teleprompterSettings,
        backgroundColor: "transparent",
      },
    });
  };

  const fetchUserSettings = async () => {
    try {
      setSettingsLoading(true);
      setSettingsError(null);
      // Retrieve session_id from cookies

      const session_id = await getCookie("session_id");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/settings`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            authorization: `Bearer ${session_id}`,
          },
        }
      );
      if (!response.ok) {
        throw new Error("Failed to fetch user settings");
      }
      const result = await response.json();
      // Ensure that the structure matches the expected state
      if (result.success && result.data) {
        setUserSettings(result.data);
      } else {
        throw new Error(result.message || "Invalid data structure");
      }
    } catch (error) {
      console.error("Error fetching user settings:", error);
      // @ts-expect-error idk
      setSettingsError(error.message);
    } finally {
      setSettingsLoading(false);
    }
  };

  const fetchPlanSettings = async () => {
    try {
      setPlanLoading(true);
      setPlanError(null);

      const session_id = await getCookie("session_id");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/getPlan`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            authorization: `Bearer ${session_id}`,
          },
        }
      );
      if (!response.ok) {
        throw new Error("Failed to fetch plan settings");
      }
      const data = await response.json();

      if (data.success && data.data) {
        const { subscription, usage, limits } = data.data; // <-- get limits

        setIsFreePlan(subscription.plan === "free");

        setPlanLimits(limits); // <-- set limits state

        setPlanSettings({
          plan: subscription?.plan || "Free",
          status: subscription?.status || "inactive",
          startDate: subscription?.startDate || "",
          endDate: subscription?.endDate || "",
          price: "$0",
          billingInterval: "Monthly",
          usage: {
            scripts: {
              count: usage?.scripts?.count || 0,
              limit: usage?.scripts?.limit || 0,
            },
            recordings: {
              count: usage?.recordings?.count || 0,
              limit: usage?.recordings?.limit || 0,
              totalDuration: usage?.recordings?.totalDuration || 0,
            },
            exports: {
              count: usage?.exports?.count || 0,
              limit: usage?.exports?.limit || 0,
            },
            aiAnalysisMinutes: {
              used: usage?.aiAnalysisMinutes?.used || 0,
              limit: usage?.aiAnalysisMinutes?.limit || 0,
            },
            bandwidthUsed: usage?.bandwidthUsed || 0,
            storage: { used: 0, limit: 0 },
          },
        });
      } else {
        throw new Error(data.message || "Invalid plan data structure");
      }
    } catch (error) {
      console.error("Error fetching plan settings:", error);
      // @ts-expect-error idk
      setPlanError(error.message);
    } finally {
      setPlanLoading(false);
    }
  };

  const saveUserSettings = async () => {
    try {
      setSettingsSaving(true);

      const session_id = await getCookie("session_id");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/saveSettings`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            authorization: `Bearer ${session_id}`,
          },
          body: JSON.stringify({ settings: userSettings }), // Send the entire settings object
        }
      );
      if (!response.ok) {
        throw new Error("Failed to save user settings");
      }
      // You could add a success toast notification here
      console.log("Settings saved successfully!");
    } catch (error) {
      console.error("Error saving user settings:", error);
      // @ts-expect-error idk
      setSettingsError(error.message);
    } finally {
      setSettingsSaving(false);
    }
  };

  const deleteScript = async (scriptId: string) => {
    try {
      // Retrieve session_id from cookies

      const session_id = await getCookie("session_id");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/scripts/delete`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            authorization: `Bearer ${session_id}`,
          },
          body: JSON.stringify({ id: scriptId }),
        }
      );
      if (!response.ok) {
        throw new Error("Failed to delete script");
      }
      // Remove the script from local state
      setScripts(scripts.filter((script) => script._id !== scriptId));
    } catch (error) {
      console.error("Error deleting script:", error);
      // You could add an error toast notification here
    }
  };

  // const filteredScripts = scripts.filter(
  //   (script) =>
  //     script.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
  //     script.category.toLowerCase().includes(searchQuery.toLowerCase())
  // );

  const Sidebar = () => {
    const navItems = [
      {
        id: "scripts",
        label: "Scripts",
        icon: FileText,
        available: true,
      },
      {
        id: "recordings",
        label: "Recordings",
        icon: Video,
        available: true,
      },
      {
        id: "settings",
        label: "Settings",
        icon: Settings,
        available: true,
      },
      !isFreePlan ? { label: "Plan", icon: CreditCard, id: "plan" } : null,
    ].filter(Boolean); // Filter out false values if !isFreePlan is false

    return (
      <>
        {/* <DebugOverlay /> */}
        {/* Desktop and Mobile Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 w-64
    bg-gradient-to-b from-gray-950 to-black 
    border-r border-white/10 p-6 flex flex-col justify-between transition-transform duration-300 ease-in-out z-50 transform lg:translate-x-0 ${
      sidebarOpen ? "translate-x-0" : "-translate-x-full"
    }`}
        >
          {/* Top Section: Logo and Brand */}
          <div className="flex flex-col items-center mb-10 mt-4">
            {" "}
            {/* Added mt-4 for slight top padding */}
            <div className="flex items-center space-x-3 text-white">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-lg">
                <Play className="w-5 h-5" />
              </div>
              <span className="font-extrabold text-2xl bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                ReelPilot
              </span>
            </div>
            {/* Optional: Tagline or version */}
            <p className="text-gray-400 text-xs mt-2">Your AI Teleprompter</p>
          </div>

          {/* Main Navigation */}
          <nav className="flex-grow">
            <ul className="space-y-2">
              {navItems.map(
                (item) =>
                  item !== null && (
                    <li key={item.id}>
                      <button
                        onClick={() => {
                          setActiveTab(item.id);
                          setSidebarOpen(false); // Close sidebar on mobile after selection
                        }}
                        className={`w-full flex items-center space-x-3 p-3 rounded-lg text-lg font-medium transition-all duration-200 ease-in-out ${
                          activeTab === item.id
                            ? "bg-purple-600/30 text-white shadow-md"
                            : "text-gray-300 hover:bg-white/10 hover:text-white"
                        } group`}
                      >
                        {item?.icon && (
                          <item.icon
                            className={`w-5 h-5 transition-transform duration-200 ease-in-out group-hover:scale-110 ${
                              activeTab === item.id ? "text-purple-300" : ""
                            }`}
                          />
                        )}
                        <span>{item?.label}</span>
                      </button>
                    </li>
                  )
              )}
            </ul>
          </nav>

          {/* Sign Out Button */}
          <div className="mt-auto pt-6 border-t border-white/10">
            <button
              onClick={handleLogOut}
              className="w-full flex items-center space-x-3 p-3 rounded-lg text-lg font-medium text-red-400 hover:bg-white/10 hover:text-red-300 transition-all duration-200 ease-in-out group"
            >
              <LogOut className="w-5 h-5 transition-transform duration-200 ease-in-out group-hover:scale-110" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Sidebar Overlay (for mobile) */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300 ease-in-out will-change-opacity opacity-100"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </>
    );
  };

  // Add this component within your main Dashboard component, or in a separate file

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Animated Background */}
      <div className="fixed inset-0 opacity-20">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse animation-delay-2000"></div>
      </div>

      <Sidebar />

      {/* Mobile Header (modified) */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-black/90 backdrop-blur-xl border-b border-white/10 p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-white p-2 rounded-md hover:bg-white/10 transition-colors duration-200" // Added padding, border, hover
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded flex items-center justify-center">
              <Play className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              ReelPilot
            </span>
          </div>
          <div className="w-6" /> {/* Spacer */}
        </div>
      </div>

      {/* Main Content */}
      <main className="lg:ml-64 pt-20 lg:pt-0 p-6 relative z-10">
        <div className="max-w-7xl mx-auto pt-8">
          {activeTab === "scripts" && (
            <ScriptsTab
              scripts={scripts}
              filterIsPublic={filterIsPublic}
              filterMinDuration={filterMinDuration}
              filterMaxDuration={filterMaxDuration}
              filterAiGenerated={filterAiGenerated}
              filterTemplateType={filterTemplateType}
              filterStartDate={filterStartDate}
              filterEndDate={filterEndDate}
              scriptsError={scriptsError}
              fetchScripts={fetchScripts}
              deleteScript={deleteScript}
              showFilterPanel={showFilterPanel}
              setShowFilterPanel={setShowFilterPanel}
              scriptsLoading={scriptsLoading}
              setFilterIsPublic={setFilterIsPublic}
              setFilterMinDuration={setFilterMinDuration}
              setFilterMaxDuration={setFilterMaxDuration}
              setFilterAiGenerated={setFilterAiGenerated}
              setFilterTemplateType={setFilterTemplateType}
              setFilterStartDate={setFilterStartDate}
              setFilterEndDate={setFilterEndDate}
            />
          )}
          {activeTab === "settings" && (
            <SettingsTab
              planLimits={planLimits}
              settingsError={settingsError}
              settingsLoading={settingsLoading}
              userSettings={userSettings}
              setUserSettings={setUserSettings}
              fetchUserSettings={fetchUserSettings}
              handleBackgroundColorChange={handleBackgroundColorChange}
              handleTransparentClick={handleTransparentClick}
              saveUserSettings={saveUserSettings}
              settingsSaving={settingsSaving}
            />
          )}
          {activeTab === "plan" && <PlanTab />}
          {activeTab === "recordings" && <RecordingsTab />}
        </div>
      </main>
    </div>
  );
}

