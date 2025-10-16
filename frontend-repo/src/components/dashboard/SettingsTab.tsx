import { useState } from "react";
import { Type, Webcam } from "lucide-react";
import Range from "../Range";

interface UserSettings {
  teleprompterSettings: {
    fontSize: string;
    scrollSpeed: string;
    textColor: string;
    backgroundColor: string;
    lineHeight: number;
    showWordCount: boolean;
  };
  recordingSettings: {
    resolution: string;
    frameRate: number;
    enableRealTimeFeedback: boolean;
    autoSave: boolean;
    countdownEnabled: boolean;
    countdownDuration: number;
  };
}

interface SettingsTabProps {
  planLimits: {
    features?: Record<string, boolean>;
    maxResolution?: string;
    maxFrameRate?: number;
  } | null;
  settingsError: null | string;
  userSettings: UserSettings;
  settingsLoading: boolean;
  settingsSaving: boolean;
  setUserSettings: (str: UserSettings) => void;
  fetchUserSettings: () => void;
  handleBackgroundColorChange: (s: string) => void;
  handleTransparentClick: () => void;
  saveUserSettings: () => void;
}

const SettingsTab = ({
  planLimits,
  settingsError,
  settingsLoading,
  userSettings,
  setUserSettings,
  fetchUserSettings,
  handleBackgroundColorChange,
  handleTransparentClick,
  saveUserSettings,
  settingsSaving,
}: SettingsTabProps) => {
  // Feature/limit checks
  const features = planLimits?.features || {};
  const maxResolution = planLimits?.maxResolution || "4k";
  const maxFrameRate = planLimits?.maxFrameRate || 60;

  // Local state to force minimum 2s saving spinner
  const [localSaving, setLocalSaving] = useState(false);

  // Helper: disables select options above plan limit
  const isResolutionDisabled = (value: string) => {
    const order = ["720p", "1080p", "4k"];
    return order.indexOf(value) > order.indexOf(maxResolution);
  };
  const isFrameRateDisabled = (value: number) => value > maxFrameRate;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-gray-400">Customize your ReelPilot experience</p>
      </div>

      {settingsError && (
        <div className="p-4 bg-red-500/20 border border-red-400/30 rounded-xl text-red-400">
          Error loading settings: {settingsError}
          <button
            onClick={fetchUserSettings}
            className="ml-4 px-3 py-1 bg-red-500/30 rounded text-sm hover:bg-red-500/40 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {settingsLoading ? (
        // ...existing skeleton code...
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* ...existing skeletons... */}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Teleprompter Settings */}
          <div className="p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
              <Type className="w-5 h-5" />
              <span>Teleprompter Settings</span>
            </h2>

            <div className="space-y-6">
              {/* Font Size */}
              <div>
                <label
                  htmlFor="fontSize"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Font Size
                </label>
                <select
                  id="fontSize"
                  value={userSettings.teleprompterSettings.fontSize}
                  onChange={(e) =>
                    setUserSettings({
                      ...userSettings,
                      teleprompterSettings: {
                        ...userSettings.teleprompterSettings,
                        fontSize: e.target.value,
                      },
                    })
                  }
                  className="w-full px-4 py-3 bg-gray-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 appearance-none pr-8 transition-all"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%23a0aec0'%3E%3Cpath fill-rule='evenodd' d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z' clip-rule='evenodd'/%3E%3C/svg%3E")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 0.75rem center",
                    backgroundSize: "1.5em 1.5em",
                  }}
                  disabled={!features.basicTeleprompter}
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
                {!features.basicTeleprompter && (
                  <div className="text-xs text-yellow-400 mt-1">
                    Upgrade to enable teleprompter customization.
                  </div>
                )}
              </div>

              {/* Scroll Speed */}
              <div>
                <label
                  htmlFor="scrollSpeed"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Scroll Speed
                </label>
                <select
                  id="scrollSpeed"
                  value={userSettings.teleprompterSettings.scrollSpeed}
                  onChange={(e) =>
                    setUserSettings({
                      ...userSettings,
                      teleprompterSettings: {
                        ...userSettings.teleprompterSettings,
                        scrollSpeed: e.target.value,
                      },
                    })
                  }
                  className="w-full px-4 py-3 bg-gray-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 appearance-none pr-8 transition-all"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%23a0aec0'%3E%3Cpath fill-rule='evenodd' d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z' clip-rule='evenodd'/%3E%3C/svg%3E")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 0.75rem center",
                    backgroundSize: "1.5em 1.5em",
                  }}
                  disabled={!features.basicTeleprompter}
                >
                  <option value="slow">Slow</option>
                  <option value="medium">Medium</option>
                  <option value="fast">Fast</option>
                </select>
              </div>

              {/* Text Color */}
              <div>
                <label
                  htmlFor="textColor"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Text Color
                </label>
                <input
                  type="color"
                  id="textColor"
                  value={userSettings.teleprompterSettings.textColor}
                  onChange={(e) =>
                    setUserSettings({
                      ...userSettings,
                      teleprompterSettings: {
                        ...userSettings.teleprompterSettings,
                        textColor: e.target.value,
                      },
                    })
                  }
                  className="w-full h-12 rounded-xl border border-white/10 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 cursor-pointer p-1 bg-gray-800"
                  title={userSettings.teleprompterSettings.textColor}
                  disabled={!features.basicTeleprompter}
                />
              </div>

              {/* Background Color */}
              <div>
                <label
                  htmlFor="backgroundColor"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Background Color
                </label>
                <input
                  type="color"
                  id="backgroundColor"
                  value={userSettings.teleprompterSettings.backgroundColor}
                  onChange={(e) => handleBackgroundColorChange(e.target.value)}
                  className="w-full h-12 rounded-xl border border-white/10 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 cursor-pointer p-1 bg-gray-800"
                  title={userSettings.teleprompterSettings.backgroundColor}
                  disabled={!features.basicTeleprompter}
                />
                <button
                  onClick={handleTransparentClick}
                  className="mt-5 bg-gradient-to-r from-purple-500 to-pink-500 px-8 py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  title="Make background transparent"
                >
                  Transparent
                </button>
              </div>

              {/* Line Height */}
              <div>
                <label
                  htmlFor="lineHeight"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Line Height ({userSettings.teleprompterSettings.lineHeight})
                </label>

                <Range
                  min={1.0}
                  max={3.0}
                  step={0.05}
                  value={userSettings.teleprompterSettings.lineHeight}
                  onChange={(newValue) =>
                    setUserSettings({
                      ...userSettings,
                      teleprompterSettings: {
                        ...userSettings.teleprompterSettings,
                        lineHeight: newValue,
                      },
                    })
                  }
                  disabled={!features.basicTeleprompter}
                  showValue={true}
                  formatValue={(val) => val.toFixed(2)}
                  aria-label="Line height adjustment"
                  className="w-full"
                />
              </div>

              {/* Show Word Count */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-medium">Show Word Count</div>
                  <div className="text-sm text-gray-400">
                    Displays word count during teleprompting
                  </div>
                </div>
                <button
                  onClick={() =>
                    setUserSettings({
                      ...userSettings,
                      teleprompterSettings: {
                        ...userSettings.teleprompterSettings,
                        showWordCount:
                          !userSettings.teleprompterSettings.showWordCount,
                      },
                    })
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    userSettings.teleprompterSettings.showWordCount
                      ? "bg-purple-500"
                      : "bg-gray-600"
                  }`}
                  disabled={!features.basicTeleprompter}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      userSettings.teleprompterSettings.showWordCount
                        ? "translate-x-6"
                        : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Recording Settings */}
          <div className="p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
              <Webcam className="w-5 h-5" />
              <span>Recording Settings</span>
            </h2>

            <div className="space-y-6">
              {/* Resolution */}
              <div>
                <label
                  htmlFor="resolution"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Resolution
                </label>
                <select
                  id="resolution"
                  value={userSettings.recordingSettings.resolution}
                  onChange={(e) =>
                    setUserSettings({
                      ...userSettings,
                      recordingSettings: {
                        ...userSettings.recordingSettings,
                        resolution: e.target.value,
                      },
                    })
                  }
                  className="w-full px-4 py-3 bg-gray-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 appearance-none pr-8 transition-all"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%23a0aec0'%3E%3Cpath fill-rule='evenodd' d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z' clip-rule='evenodd'/%3E%3C/svg%3E")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 0.75rem center",
                    backgroundSize: "1.5em 1.5em",
                  }}
                >
                  <option value="720p" disabled={isResolutionDisabled("720p")}>
                    720p
                  </option>
                  <option
                    value="1080p"
                    disabled={isResolutionDisabled("1080p")}
                  >
                    1080p
                  </option>
                  <option value="4k" disabled={isResolutionDisabled("4k")}>
                    4K
                  </option>
                </select>
                {maxResolution === "720p" && (
                  <div className="text-xs text-yellow-400 mt-1">
                    Upgrade to unlock higher resolutions.
                  </div>
                )}
              </div>

              {/* Frame Rate */}
              <div>
                <label
                  htmlFor="frameRate"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Frame Rate
                </label>
                <select
                  id="frameRate"
                  value={userSettings.recordingSettings.frameRate}
                  onChange={(e) =>
                    setUserSettings({
                      ...userSettings,
                      recordingSettings: {
                        ...userSettings.recordingSettings,
                        frameRate: parseInt(e.target.value),
                      },
                    })
                  }
                  className="w-full px-4 py-3 bg-gray-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 appearance-none pr-8 transition-all"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%23a0aec0'%3E%3Cpath fill-rule='evenodd' d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z' clip-rule='evenodd'/%3E%3C/svg%3E")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 0.75rem center",
                    backgroundSize: "1.5em 1.5em",
                  }}
                >
                  <option value={24} disabled={isFrameRateDisabled(24)}>
                    24 FPS
                  </option>
                  <option value={30} disabled={isFrameRateDisabled(30)}>
                    30 FPS
                  </option>
                  <option value={60} disabled={isFrameRateDisabled(60)}>
                    60 FPS
                  </option>
                </select>
                {maxFrameRate === 30 && (
                  <div className="text-xs text-yellow-400 mt-1">
                    Upgrade to unlock higher frame rates.
                  </div>
                )}
              </div>

              {/* Real-Time Feedback */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-medium">
                    Real-Time Feedback
                  </div>
                  <div className="text-sm text-gray-400">
                    Get instant feedback on your delivery
                  </div>
                </div>
                <button
                  onClick={() =>
                    setUserSettings({
                      ...userSettings,
                      recordingSettings: {
                        ...userSettings.recordingSettings,
                        enableRealTimeFeedback:
                          !userSettings.recordingSettings
                            .enableRealTimeFeedback,
                      },
                    })
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    userSettings.recordingSettings.enableRealTimeFeedback
                      ? "bg-purple-500"
                      : "bg-gray-600"
                  }`}
                  disabled={!features.realTimeFeedback}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      userSettings.recordingSettings.enableRealTimeFeedback
                        ? "translate-x-6"
                        : "translate-x-1"
                    }`}
                  />
                </button>
                {!features.realTimeFeedback && (
                  <div className="text-xs text-yellow-400 ml-2">
                    Upgrade to enable real-time feedback.
                  </div>
                )}
              </div>

              {/* Auto Save */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-medium">
                    Auto Save Recordings
                  </div>
                  <div className="text-sm text-gray-400">
                    Automatically save your recordings
                  </div>
                </div>
                <button
                  onClick={() =>
                    setUserSettings({
                      ...userSettings,
                      recordingSettings: {
                        ...userSettings.recordingSettings,
                        autoSave: !userSettings.recordingSettings.autoSave,
                      },
                    })
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    userSettings.recordingSettings.autoSave
                      ? "bg-purple-500"
                      : "bg-gray-600"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      userSettings.recordingSettings.autoSave
                        ? "translate-x-6"
                        : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Countdown Enabled */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-medium">Enable Countdown</div>
                  <div className="text-sm text-gray-400">
                    Show a countdown before recording starts
                  </div>
                </div>
                <button
                  onClick={() =>
                    setUserSettings({
                      ...userSettings,
                      recordingSettings: {
                        ...userSettings.recordingSettings,
                        countdownEnabled:
                          !userSettings.recordingSettings.countdownEnabled,
                      },
                    })
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    userSettings.recordingSettings.countdownEnabled
                      ? "bg-purple-500"
                      : "bg-gray-600"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      userSettings.recordingSettings.countdownEnabled
                        ? "translate-x-6"
                        : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Countdown Duration */}
              {userSettings.recordingSettings.countdownEnabled && (
                <div>
                  <label
                    htmlFor="countdownDuration"
                    className="block text-sm font-medium text-gray-300 mb-2"
                  >
                    Countdown Duration (seconds)
                  </label>
                  <input
                    type="number"
                    id="countdownDuration"
                    min="1"
                    max="10"
                    value={userSettings.recordingSettings.countdownDuration}
                    onChange={(e) =>
                      setUserSettings({
                        ...userSettings,
                        recordingSettings: {
                          ...userSettings.recordingSettings,
                          countdownDuration: parseInt(e.target.value),
                        },
                      })
                    }
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50 transition-all"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => {
            if (localSaving) return;
            setLocalSaving(true);
            saveUserSettings();
            setTimeout(() => {
              setLocalSaving(false);
            }, 2000); // force at least 2 sec
          }}
          disabled={localSaving || settingsSaving}
          className="bg-gradient-to-r from-purple-500 to-pink-500 px-8 py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {localSaving || settingsSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
};

export default SettingsTab;
