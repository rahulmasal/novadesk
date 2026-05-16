/**
 * ============================================================================
 * SETTINGS CONTEXT - Global Settings State Management
 * ============================================================================
 *
 * This React Context provides a centralized way to manage application settings
 * throughout the app. It handles loading settings from the database, updating
 * them, and applying visual changes (theme, compact view) in real-time.
 *
 * WHAT IT PROVIDES:
 * - settings: Current settings object with all preferences
 * - updateSettings: Function to update a specific setting
 * - applyTheme: Function to apply theme to the HTML element
 * - applyCompactView: Function to toggle compact view mode
 * - saveSettingsToDb: Function to manually save settings
 *
 * BEGINNER NOTES:
 * - React Context is like a "global variable" that any component can access
 * - useSettings() hook gives components access to settings
 * - SettingsProvider wraps the app to provide settings everywhere
 * - Changes to theme automatically update the HTML class for dark/light mode
 *
 * @module /contexts/SettingsContext
 */

"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { useTicketStore } from "@/lib/store";

/**
 * Requests browser notification permission when push notifications are enabled
 * This uses the browser's Notification API to show desktop notifications
 *
 * @returns true if permission granted, false otherwise
 */
const requestNotificationPermission = async () => {
  // Check if we're in a browser environment and if Notification API exists
  if (typeof window !== "undefined" && "Notification" in window) {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }
  return false;
};

/**
 * Settings interface - defines all configurable options in the application
 * Each section groups related settings together
 */
export interface Settings {
  /** Notification preferences */
  notifications: {
    email: boolean;           // Receive email notifications
    push: boolean;           // Receive browser push notifications
    ticketAssignment: boolean; // Get notified when assigned a ticket
  };
  /** Visual appearance settings */
  appearance: {
    theme: "dark" | "light" | "system"; // Dark mode, light mode, or follow system
    compactView: boolean;              // Reduce spacing in tables
  };
  /** Backup configuration (admin only) */
  backup: {
    schedule: "daily" | "weekly" | "monthly"; // How often to backup
    retentionDays: number;                   // How many days to keep backups
  };
  /** Advanced settings */
  advanced: {
    timezone: string;          // User's timezone for displaying dates
    language: string;         // UI language code (e.g., "en")
    slaResponseHours: number; // Service Level Agreement - response time target
    slaResolutionHours: number; // Service Level Agreement - resolution target
  };
  /** Email / SMTP configuration (admin only) */
  email: {
    emailEnabled: boolean;      // Master toggle for email notifications
    smtpHost: string;           // SMTP server address
    smtpPort: number;           // SMTP port (587 for TLS, 465 for SSL)
    smtpUser: string;           // SMTP username/email
    smtpPass: string;           // SMTP password
    fromAddress: string;        // Sender email address
    reportRecipient: string;    // Where to send daily reports
  };
}

/**
 * Default settings used when no settings exist in database
 * These provide sensible defaults for a new installation
 */
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
  email: {
    emailEnabled: false,
    smtpHost: "",
    smtpPort: 587,
    smtpUser: "",
    smtpPass: "",
    fromAddress: "",
    reportRecipient: "",
  },
};

/**
 * Type definition for the SettingsContext - describes what the context provides
 */
interface SettingsContextType {
  settings: Settings;  // Current settings object
  updateSettings: (section: keyof Settings, key: string, value: unknown) => void; // Update a setting
  applyTheme: (theme: "dark" | "light" | "system") => void; // Apply theme to HTML
  applyCompactView: (enabled: boolean) => void; // Toggle compact view
  saveSettingsToDb: () => Promise<void>; // Manual save function
}

// Create the context with undefined type (will be set by Provider)
const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

/**
 * SettingsProvider - Wraps the app to provide settings to all components
 *
 * This component:
 * 1. Loads settings from database on mount
 * 2. Applies theme and compact view on mount/change
 * 3. Provides functions to update settings
 * 4. Auto-saves to database when settings change
 *
 * @param children - All child components that need access to settings
 */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  /**
   * Load settings from database on component mount
   * This runs once when the app first loads
   */
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch("/api/settings");
        const data = await response.json();

        if (data.settings) {
          // Deep merge with defaults so new fields (like SLA) always exist
          setSettings({
            notifications: { ...defaultSettings.notifications, ...data.settings.notifications },
            appearance: { ...defaultSettings.appearance, ...data.settings.appearance },
            backup: { ...defaultSettings.backup, ...data.settings.backup },
            advanced: { ...defaultSettings.advanced, ...data.settings.advanced },
            email: { ...defaultSettings.email, ...data.settings.email },
          });
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
      }
    };
    loadSettings();
  }, []);

  /**
   * Apply theme by adding/removing CSS classes on the HTML element
   * This is what makes dark/light mode work
   *
   * @param theme - "dark", "light", or "system" (follow OS preference)
   */
  const applyTheme = useCallback((theme: "dark" | "light" | "system") => {
    const html = document.documentElement; // The <html> element

    // Remove any existing theme classes first
    html.classList.remove("dark", "light");

    // Handle each theme option
    if (theme === "system") {
      // Check if OS prefers dark mode
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (prefersDark) {
        html.classList.add("dark");
      } else {
        html.classList.add("light");
      }
    } else if (theme === "dark") {
      html.classList.add("dark");
    } else {
      html.classList.add("light");
    }
  }, []);

  /**
   * Apply compact view by toggling a CSS class on the body
   * Compact view reduces padding/spacing in tables and lists
   *
   * @param enabled - Whether compact view should be enabled
   */
  const applyCompactView = useCallback((enabled: boolean) => {
    if (enabled) {
      document.body.classList.add("compact-view");
    } else {
      document.body.classList.remove("compact-view");
    }
  }, []);

  /**
   * Apply theme and compact view whenever those settings change
   * This ensures the UI stays in sync with settings
   */
  useEffect(() => {
    applyTheme(settings.appearance.theme);
    applyCompactView(settings.appearance.compactView);
  }, [settings.appearance.theme, settings.appearance.compactView, applyTheme, applyCompactView]);

  /**
   * Update a specific setting and auto-save to database
   *
   * @param section - Which section to update (notifications, appearance, backup, advanced)
   * @param key - The specific setting key within that section
   * @param value - The new value to set
   *
   * @example
   * // Update theme to dark mode
   * updateSettings("appearance", "theme", "dark");
   *
   * // Enable push notifications
   * updateSettings("notifications", "push", true);
   */
  const updateSettings = (section: keyof Settings, key: string, value: unknown) => {
    setSettings((prev) => {
      const newSettings: Settings = {
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

  /**
   * Manually save current settings to database
   * Useful when you want to ensure settings are saved
   */
  const saveSettingsToDb = async () => {
    try {
      const token = useTicketStore.getState().authToken;
      if (!token) return;
      await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ settings }),
      });
    } catch (error) {
      console.error("Failed to save settings to DB:", error);
    }
  };

  /**
   * Internal function to save settings to database (debounced)
   * Called automatically whenever settings are updated
   */
  const saveToDb = useCallback(async (newSettings: Settings) => {
    const token = useTicketStore.getState().authToken;
    if (!token) return;
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ settings: newSettings }),
      });
      if (res.ok) {
        useTicketStore.getState().refreshTickets();
      }
    } catch (error) {
      console.error("Failed to save settings to DB:", error);
    }
  }, []);

  // Provide settings to all child components
  return (
    <SettingsContext.Provider value={{ settings, updateSettings, applyTheme, applyCompactView, saveSettingsToDb }}>
      {children}
    </SettingsContext.Provider>
  );
}

/**
 * Hook to access settings from any component
 *
 * @returns SettingsContextType with settings and functions
 * @throws Error if used outside of SettingsProvider
 *
 * @example
 * function MyComponent() {
 *   const { settings, updateSettings } = useSettings();
 *
 *   return (
 *     <button onClick={() => updateSettings("appearance", "theme", "dark")}>
 *       Switch to Dark Mode
 *     </button>
 *   );
 * }
 */
export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}