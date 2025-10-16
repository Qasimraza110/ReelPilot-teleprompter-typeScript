// hooks/useUserSettings.ts
import { useState, useEffect } from "react";
import { getCookie } from "@/actions/cookie";

interface TeleprompterSettings {
  fontSize: "small" | "medium" | "large";
  textColor: string;
  backgroundColor: string;
  lineHeight: number;
  scrollSpeed: number;
  showWordCount: boolean;
}

interface UserSettings {
  devTesting: boolean;
  teleprompterSettings: TeleprompterSettings;
  // Add other user settings here
}

const defaultSettings: UserSettings = {
  devTesting: false,
  teleprompterSettings: {
    fontSize: "medium",
    textColor: "#fff",
    backgroundColor: "transparent",
    lineHeight: 1.2,
    scrollSpeed: 1, // Example default, adjust as needed
    showWordCount: true,
  },
};

export const useUserSettings = () => {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      setLoadingSettings(true);
      try {
        const session_id = await getCookie("session_id");
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/settings`,
          {
            headers: {
              Authorization: session_id ? `Bearer ${session_id}` : "",
            },
          }
        );
        const data = await res.json();
        if (data.success && data.data) {
          setSettings({ ...defaultSettings, ...data.data }); // Merge with defaults
        } else {
          setSettings(defaultSettings); // Use defaults if fetch fails or no data
        }
      } catch (err) {
        console.warn("Failed to fetch user settings, using defaults.", err);
        setSettings(defaultSettings);
      } finally {
        setLoadingSettings(false);
      }
    };
    fetchSettings();
  }, []);

  return { settings, loadingSettings };
};
