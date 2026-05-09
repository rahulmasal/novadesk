"use client";

import { useState } from "react";
import { useTicketStore } from "@/lib/store";
import {
  Moon,
  Sun,
  Bell,
  Clock,
  Globe,
  Database,
  Key,
  Shield,
  Save,
} from "lucide-react";

interface SettingsData {
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

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Kolkata",
];

const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "es", name: "Español" },
  { code: "fr", name: "Français" },
  { code: "de", name: "Deutsch" },
  { code: "ja", name: "日本語" },
  { code: "zh", name: "中文" },
];

export function Settings() {
  const { currentUser, currentUserRole } = useTicketStore();
  const [settings, setSettings] = useState<SettingsData>({
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
  });
  const [saved, setSaved] = useState(false);

  const isAdmin = currentUserRole === "ADMINISTRATOR";

  const updateSettings = (section: keyof SettingsData, key: string, value: unknown) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="p-8 pl-6 pr-6 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold text-white tracking-tight">
          System Settings
        </h2>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Save className="w-4 h-4" />
          Save Changes
        </button>
        {saved && (
          <span className="text-emerald-400 text-sm ml-4">✓ Saved successfully</span>
        )}
      </div>

      <div className="space-y-6">
        {/* Notifications */}
        <div className="glass-dark rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-400" />
            Notifications
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white">Email Notifications</p>
                <p className="text-xs text-neutral-500">Receive updates via email</p>
              </div>
              <label className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                <input
                  type="checkbox"
                  checked={settings.notifications.email}
                  onChange={(e) => updateSettings("notifications", "email", e.target.checked)}
                  className="sr-only"
                />
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.notifications.email ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </label>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white">Push Notifications</p>
                <p className="text-xs text-neutral-500">Browser push notifications</p>
              </div>
              <label className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                <input
                  type="checkbox"
                  checked={settings.notifications.push}
                  onChange={(e) => updateSettings("notifications", "push", e.target.checked)}
                  className="sr-only"
                />
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.notifications.push ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </label>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white">Ticket Assignment Alerts</p>
                <p className="text-xs text-neutral-500">Notify when assigned to tickets</p>
              </div>
              <label className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                <input
                  type="checkbox"
                  checked={settings.notifications.ticketAssignment}
                  onChange={(e) => updateSettings("notifications", "ticketAssignment", e.target.checked)}
                  className="sr-only"
                />
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.notifications.ticketAssignment ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Appearance */}
        <div className="glass-dark rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Sun className="w-5 h-5 text-amber-400" />
            Appearance
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-neutral-400 mb-2">Theme</label>
              <div className="flex gap-2">
                {(["dark", "light", "system"] as const).map((theme) => (
                  <button
                    key={theme}
                    onClick={() => updateSettings("appearance", "theme", theme)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      settings.appearance.theme === theme
                        ? "bg-blue-500 text-white"
                        : "bg-black/40 text-neutral-400 hover:bg-black/60"
                    }`}
                  >
                    {theme.charAt(0).toUpperCase() + theme.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white">Compact View</p>
                <p className="text-xs text-neutral-500">Reduced spacing in tables</p>
              </div>
              <label className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                <input
                  type="checkbox"
                  checked={settings.appearance.compactView}
                  onChange={(e) => updateSettings("appearance", "compactView", e.target.checked)}
                  className="sr-only"
                />
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.appearance.compactView ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Backup Settings (Admin only) */}
        {isAdmin && (
          <div className="glass-dark rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-400" />
              Backup Configuration
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-neutral-400 mb-2">Backup Schedule</label>
                <select
                  value={settings.backup.schedule}
                  onChange={(e) => updateSettings("backup", "schedule", e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-neutral-400 mb-2">
                  Retention Period (days)
                </label>
                <input
                  type="number"
                  value={settings.backup.retentionDays}
                  onChange={(e) => updateSettings("backup", "retentionDays", parseInt(e.target.value))}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white"
                  min="1"
                  max="365"
                />
              </div>
            </div>
          </div>
        )}

        {/* Advanced Settings (Admin only) */}
        {isAdmin && (
          <div className="glass-dark rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-400" />
              Advanced Configuration
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-neutral-400 mb-2">Timezone</label>
                <select
                  value={settings.advanced.timezone}
                  onChange={(e) => updateSettings("advanced", "timezone", e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-neutral-400 mb-2">Language</label>
                <select
                  value={settings.advanced.language}
                  onChange={(e) => updateSettings("advanced", "language", e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>{lang.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-neutral-400 mb-2">SLA Response (hours)</label>
                  <input
                    type="number"
                    value={settings.advanced.slaResponseHours}
                    onChange={(e) => updateSettings("advanced", "slaResponseHours", parseInt(e.target.value))}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white"
                    min="1"
                    max="72"
                  />
                </div>
                <div>
                  <label className="block text-sm text-neutral-400 mb-2">SLA Resolution (hours)</label>
                  <input
                    type="number"
                    value={settings.advanced.slaResolutionHours}
                    onChange={(e) => updateSettings("advanced", "slaResolutionHours", parseInt(e.target.value))}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white"
                    min="1"
                    max="168"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Account Info */}
        <div className="glass-dark rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Account Information</h3>
          <div className="space-y-2">
            <p className="text-neutral-400">
              Name: <span className="text-white font-medium">{currentUser?.name}</span>
            </p>
            <p className="text-neutral-400">
              Email: <span className="text-white font-medium">{currentUser?.email}</span>
            </p>
            <p className="text-neutral-400">
              Role: <span className="text-blue-400 font-medium">{currentUserRole}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}