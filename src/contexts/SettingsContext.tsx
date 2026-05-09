"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";

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
  saveSettingsToDb: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("app-settings");
      if (saved) {
        return JSON.parse(saved);
      }
    }
    return defaultSettings;
  });

  const applyTheme = useCallback((theme: "dark" | "light" | "system") => {
    const html = document.documentElement;
    if (theme === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (prefersDark) {
        html.classList.add("dark");
      } else {
        html.classList.remove("dark");
      }
    } else if (theme === "dark") {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
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
      localStorage.setItem("app-settings", JSON.stringify(newSettings));
      if (section === "appearance") {
        if (key === "theme") {
          applyTheme(value as "dark" | "light" | "system");
        } else if (key === "compactView") {
          applyCompactView(value as boolean);
        }
      }
      // Also save to DB for admin backup
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