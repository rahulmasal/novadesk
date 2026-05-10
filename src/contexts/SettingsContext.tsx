"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";

// Request notification permission
const requestNotificationPermission = async () => {
  if (typeof window !== "undefined" && "Notification" in window) {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }
  return false;
};

export interface Settings {
  notifications: {
    email: boolean;
    push: boolean;
    ticketAssignment: boolean;
  };
  appearance: {
    theme: "dark" | "light" | "system";
    compactView: boolean;
  };
  backup: {
    schedule: "daily" | "weekly" | "monthly";
    retentionDays: number;
  };
  advanced: {
    timezone: string;
    language: string;
    slaResponseHours: number;
    slaResolutionHours: number;
  };
}

const defaultSettings: Settings = {
  notifications: {
    email: true,
    push: true,
    ticketAssignment: true,
  },
  appearance: {
    theme: "dark",
    compactView: false,
  },
  backup: {
    schedule: "daily",
    retentionDays: 30,
  },
  advanced: {
    timezone: "UTC",
    language: "en",
    slaResponseHours: 4,
    slaResolutionHours: 24,
  },
};

interface SettingsContextType {
  settings: Settings;
  updateSettings: (section: keyof Settings, key: string, value: unknown) => void;
  applyTheme: (theme: "dark" | "light" | "system") => void;
  applyCompactView: (enabled: boolean) => void;
  saveSettingsToDb: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  // Load settings from DB on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch("/api/settings");
        const data = await response.json();
        if (data.settings) {
          setSettings(data.settings);
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
      }
    };
    loadSettings();
  }, []);

  const applyTheme = useCallback((theme: "dark" | "light" | "system") => {
    const html = document.documentElement;
    html.classList.remove("dark", "light");
    if (theme === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (prefersDark) {
        html.classList.add("dark");
      }
    } else if (theme === "dark") {
      html.classList.add("dark");
    } else {
      html.classList.add("light");
    }
  }, []);

  const applyCompactView = useCallback((enabled: boolean) => {
    if (enabled) {
      document.body.classList.add("compact-view");
    } else {
      document.body.classList.remove("compact-view");
    }
  }, []);

  // Apply settings on mount and when they change
  useEffect(() => {
    applyTheme(settings.appearance.theme);
    applyCompactView(settings.appearance.compactView);
  }, [settings.appearance.theme, settings.appearance.compactView, applyTheme, applyCompactView]);

  const updateSettings = (section: keyof Settings, key: string, value: unknown) => {
    setSettings((prev) => {
      const newSettings = {
        ...prev,
        [section]: {
          ...prev[section],
          [key]: value,
        },
      };
      if (section === "appearance") {
        if (key === "theme") {
          applyTheme(value as "dark" | "light" | "system");
        } else if (key === "compactView") {
          applyCompactView(value as boolean);
        }
      }
      if (section === "notifications" && key === "push" && value === true) {
        requestNotificationPermission();
      }
      saveToDb(newSettings);
      return newSettings;
    });
  };

  const saveSettingsToDb = async () => {
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
    } catch (error) {
      console.error("Failed to save settings to DB:", error);
    }
  };

  const saveToDb = async (newSettings: Settings) => {
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: newSettings }),
      });
    } catch (error) {
      console.error("Failed to save settings to DB:", error);
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, applyTheme, applyCompactView, saveSettingsToDb }}>{children}</SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}