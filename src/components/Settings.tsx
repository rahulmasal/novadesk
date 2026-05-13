"use client";

import { useState } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { useTicketStore } from "@/lib/store";
import {
  Sun,
  Bell,
  Database,
  Shield,
  Key,
  User,
  Loader2,
  Download,
  RefreshCw,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { toast } from "react-hot-toast";

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
  const { settings, updateSettings } = useSettings();
  const { currentUser, currentUserRole, authToken } = useTicketStore();

  const isAdmin = currentUserRole === "ADMINISTRATOR";
  const isLightTheme = settings.appearance.theme === "light";

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [profileForm, setProfileForm] = useState({
    hostname: currentUser?.hostname || "",
    laptopSerial: currentUser?.laptopSerial || "",
    department: currentUser?.department || "",
  });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  const [updateStatus, setUpdateStatus] = useState({
    checking: false,
    hasUpdate: false,
    currentVersion: "0.1.0",
    latestVersion: "",
    releaseNotes: "",
    releaseDate: "",
    error: null as string | null,
  });

  const checkForUpdates = async () => {
    if (!authToken || !isAdmin) return;
    setUpdateStatus(prev => ({ ...prev, checking: true, error: null }));
    try {
      const res = await fetch("/api/updates", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ action: "check" }),
      });
      const data = await res.json();
      setUpdateStatus(prev => ({
        ...prev,
        checking: false,
        hasUpdate: data.hasUpdate || false,
        currentVersion: data.currentVersion || "0.1.0",
        latestVersion: data.update?.version || "",
        releaseNotes: data.update?.releaseNotes || "",
        releaseDate: data.update?.releaseDate || "",
        error: data.error || null,
      }));
    } catch {
      setUpdateStatus(prev => ({ ...prev, checking: false, error: "Failed to check for updates" }));
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          oldPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Password changed successfully");
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        toast.error(data.error || "Failed to change password");
      }
    } catch {
      toast.error("Failed to change password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);

    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          id: currentUser?.id,
          hostname: profileForm.hostname,
          laptopSerial: profileForm.laptopSerial,
          department: profileForm.department,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Profile updated successfully");
      } else {
        toast.error(data.error || "Failed to update profile");
      }
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

return (
    <div className="p-8 pl-6 pr-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h2 className={`text-3xl font-bold tracking-tight ${isLightTheme ? "text-slate-800" : "text-white"}`}>
          Settings
        </h2>
      </div>

      <div className="space-y-6">
        {/* Profile Settings - Available to all users */}
        <div className={`rounded-2xl p-6 ${isLightTheme ? "bg-white border border-slate-200 shadow-md" : "glass-dark"}`}>
          <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${isLightTheme ? "text-slate-800" : "text-white"}`}>
            <User className={`w-5 h-5 ${isLightTheme ? "text-blue-600" : "text-blue-400"}`} />
            My Profile
          </h3>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm ${isLightTheme ? "text-slate-600" : "text-neutral-400"} mb-2`}>Hostname</label>
                <input
                  type="text"
                  value={profileForm.hostname}
                  onChange={(e) => setProfileForm({ ...profileForm, hostname: e.target.value })}
                  placeholder="LAPTOP-001"
                  className={`w-full rounded-lg px-4 py-2.5 ${isLightTheme ? "bg-slate-50 border border-slate-300 text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" : "bg-black/40 border border-white/10 text-white"}`}
                />
              </div>
              <div>
                <label className={`block text-sm ${isLightTheme ? "text-slate-600" : "text-neutral-400"} mb-2`}>Laptop Serial</label>
                <input
                  type="text"
                  value={profileForm.laptopSerial}
                  onChange={(e) => setProfileForm({ ...profileForm, laptopSerial: e.target.value })}
                  placeholder="SN12345678"
                  className={`w-full rounded-lg px-4 py-2.5 ${isLightTheme ? "bg-slate-50 border border-slate-300 text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" : "bg-black/40 border border-white/10 text-white"}`}
                />
              </div>
            </div>
            <div>
              <label className={`block text-sm ${isLightTheme ? "text-slate-600" : "text-neutral-400"} mb-2`}>Department</label>
              <input
                type="text"
                value={profileForm.department}
                onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}
                placeholder="Department"
                className={`w-full rounded-lg px-4 py-2.5 ${isLightTheme ? "bg-slate-50 border border-slate-300 text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" : "bg-black/40 border border-white/10 text-white"}`}
              />
            </div>
            <button
              type="submit"
              disabled={isUpdatingProfile}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${isLightTheme ? "bg-blue-500 hover:bg-blue-600 text-white" : "bg-blue-500 hover:bg-blue-600 text-white"}`}
            >
              {isUpdatingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Save Changes
            </button>
          </form>
        </div>

        {/* Password Change - Available to all users */}
        <div className={`rounded-2xl p-6 ${isLightTheme ? "bg-white border border-slate-200 shadow-md" : "glass-dark"}`}>
          <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${isLightTheme ? "text-slate-800" : "text-white"}`}>
            <Key className={`w-5 h-5 ${isLightTheme ? "text-amber-600" : "text-amber-400"}`} />
            Change Password
          </h3>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className={`block text-sm ${isLightTheme ? "text-slate-600" : "text-neutral-400"} mb-2`}>Current Password</label>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                className={`w-full rounded-lg px-4 py-2.5 ${isLightTheme ? "bg-slate-50 border border-slate-300 text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" : "bg-black/40 border border-white/10 text-white"}`}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm ${isLightTheme ? "text-slate-600" : "text-neutral-400"} mb-2`}>New Password</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className={`w-full rounded-lg px-4 py-2.5 ${isLightTheme ? "bg-slate-50 border border-slate-300 text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" : "bg-black/40 border border-white/10 text-white"}`}
                  required
                />
              </div>
              <div>
                <label className={`block text-sm ${isLightTheme ? "text-slate-600" : "text-neutral-400"} mb-2`}>Confirm New Password</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className={`w-full rounded-lg px-4 py-2.5 ${isLightTheme ? "bg-slate-50 border border-slate-300 text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" : "bg-black/40 border border-white/10 text-white"}`}
                  required
                />
              </div>
            </div>
            <p className={`text-xs ${isLightTheme ? "text-slate-500" : "text-neutral-500"}`}>Password must be at least 8 characters with uppercase, lowercase, and number.</p>
            <button
              type="submit"
              disabled={isChangingPassword}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${isLightTheme ? "bg-blue-500 hover:bg-blue-600 text-white" : "bg-blue-500 hover:bg-blue-600 text-white"}`}
            >
              {isChangingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Update Password
            </button>
          </form>
        </div>

        {/* Notifications - Available to all users */}
        <div className={`rounded-2xl p-6 ${isLightTheme ? "bg-white border border-slate-200 shadow-md" : "glass-dark"}`}>
          <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${isLightTheme ? "text-slate-800" : "text-white"}`}>
            <Bell className={`w-5 h-5 ${isLightTheme ? "text-blue-600" : "text-blue-400"}`} />
            Notifications
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={isLightTheme ? "text-slate-700" : "text-white"}>Email Notifications</p>
                <p className={`text-xs ${isLightTheme ? "text-slate-500" : "text-neutral-500"}`}>Receive updates via email</p>
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
                <p className={isLightTheme ? "text-slate-700" : "text-white"}>Push Notifications</p>
                <p className={`text-xs ${isLightTheme ? "text-slate-500" : "text-neutral-500"}`}>Browser push notifications</p>
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
                <p className={isLightTheme ? "text-slate-700" : "text-white"}>Ticket Assignment Alerts</p>
                <p className={`text-xs ${isLightTheme ? "text-slate-500" : "text-neutral-500"}`}>Notify when assigned to tickets</p>
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

        {/* Appearance - Available to all users */}
        <div className={`rounded-2xl p-6 ${isLightTheme ? "bg-white border border-slate-200 shadow-md" : "glass-dark"}`}>
          <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${isLightTheme ? "text-slate-800" : "text-white"}`}>
            <Sun className={`w-5 h-5 ${isLightTheme ? "text-amber-600" : "text-amber-400"}`} />
            Appearance
          </h3>
          <div className="space-y-4">
            <div>
              <label className={`block text-sm ${isLightTheme ? "text-slate-600" : "text-neutral-400"} mb-2`}>Theme</label>
              <div className="flex gap-2">
                {(["dark", "light", "system"] as const).map((theme) => (
                  <button
                    key={theme}
                    onClick={() => updateSettings("appearance", "theme", theme)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      settings.appearance.theme === theme
                        ? "bg-blue-500 text-white"
                        : isLightTheme
                          ? "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300"
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
                <p className={isLightTheme ? "text-slate-700" : "text-white"}>Compact View</p>
                <p className={`text-xs ${isLightTheme ? "text-slate-500" : "text-neutral-500"}`}>Reduced spacing in tables</p>
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

        {/* Timezone & Language - Available to all users */}
        <div className={`rounded-2xl p-6 ${isLightTheme ? "bg-white border border-slate-200 shadow-md" : "glass-dark"}`}>
          <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${isLightTheme ? "text-slate-800" : "text-white"}`}>
            <Shield className={`w-5 h-5 ${isLightTheme ? "text-purple-600" : "text-purple-400"}`} />
            Regional Settings
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm ${isLightTheme ? "text-slate-600" : "text-neutral-400"} mb-2`}>Timezone</label>
                <select
                  value={settings.advanced.timezone}
                  onChange={(e) => updateSettings("advanced", "timezone", e.target.value)}
                  className={`w-full rounded-lg px-4 py-2.5 ${isLightTheme ? "bg-slate-50 border border-slate-300 text-slate-800" : "bg-black/40 border border-white/10 text-white"}`}
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`block text-sm ${isLightTheme ? "text-slate-600" : "text-neutral-400"} mb-2`}>Language</label>
                <select
                  value={settings.advanced.language}
                  onChange={(e) => updateSettings("advanced", "language", e.target.value)}
                  className={`w-full rounded-lg px-4 py-2.5 ${isLightTheme ? "bg-slate-50 border border-slate-300 text-slate-800" : "bg-black/40 border border-white/10 text-white"}`}
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>{lang.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Backup Settings (Admin only) */}
        {isAdmin && (
          <div className={`rounded-2xl p-6 ${isLightTheme ? "bg-white border border-slate-200 shadow-md" : "glass-dark"}`}>
            <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${isLightTheme ? "text-slate-800" : "text-white"}`}>
              <Database className={`w-5 h-5 ${isLightTheme ? "text-emerald-600" : "text-emerald-400"}`} />
              Backup Configuration
            </h3>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm ${isLightTheme ? "text-slate-600" : "text-neutral-400"} mb-2`}>Backup Schedule</label>
                <select
                  value={settings.backup.schedule}
                  onChange={(e) => updateSettings("backup", "schedule", e.target.value)}
                  className={`w-full rounded-lg px-4 py-2.5 ${isLightTheme ? "bg-slate-50 border border-slate-300 text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" : "bg-black/40 border border-white/10 text-white"}`}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div>
                <label className={`block text-sm ${isLightTheme ? "text-slate-600" : "text-neutral-400"} mb-2`}>
                  Retention Period (days)
                </label>
                <input
                  type="number"
                  value={settings.backup.retentionDays}
                  onChange={(e) => updateSettings("backup", "retentionDays", parseInt(e.target.value))}
className={`w-full rounded-lg px-4 py-2.5 ${isLightTheme ? "bg-slate-50 border border-slate-300 text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" : "bg-black/40 border border-white/10 text-white"}`}
                  min="1"
                  max="365"
                />
              </div>
            </div>
          </div>
        )}

        {isAdmin && (
          <div className={`rounded-2xl p-6 ${isLightTheme ? "bg-white border border-slate-200 shadow-md" : "glass-dark"}`}>
            <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${isLightTheme ? "text-slate-800" : "text-white"}`}>
              <Download className={`w-5 h-5 ${isLightTheme ? "text-purple-600" : "text-purple-400"}`} />
              Software Updates
            </h3>
            <div className="space-y-4">
              <div className={`p-4 rounded-xl ${isLightTheme ? "bg-slate-50 border border-slate-200" : "bg-black/20 border border-white/10"}`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className={`text-sm font-medium ${isLightTheme ? "text-slate-700" : "text-neutral-300"}`}>Current Version</p>
                    <p className={`text-2xl font-bold ${isLightTheme ? "text-slate-800" : "text-white"}`}>{updateStatus.currentVersion}</p>
                  </div>
                  <button onClick={checkForUpdates} disabled={updateStatus.checking} className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-all disabled:opacity-50">
                    {updateStatus.checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    {updateStatus.checking ? "Checking..." : "Check Updates"}
                  </button>
                </div>
                {updateStatus.error && (
                  <div className={`flex items-center gap-2 p-3 rounded-lg ${isLightTheme ? "bg-red-50 text-red-700" : "bg-red-500/10 text-red-400"}`}>
                    <AlertCircle className="w-4 h-4" /><span className="text-sm">{updateStatus.error}</span>
                  </div>
                )}
                {updateStatus.hasUpdate && !updateStatus.error && (
                  <div className={`space-y-3 p-4 rounded-lg ${isLightTheme ? "bg-blue-50 border border-blue-200" : "bg-blue-500/10 border border-blue-500/20"}`}>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-blue-500" />
                      <span className={`font-medium ${isLightTheme ? "text-blue-800" : "text-blue-400"}`}>Update Available: {updateStatus.latestVersion}</span>
                    </div>
                    {updateStatus.releaseDate && <p className={`text-sm ${isLightTheme ? "text-slate-600" : "text-neutral-400"}`}>Released: {new Date(updateStatus.releaseDate).toLocaleDateString()}</p>}
                    {updateStatus.releaseNotes && <p className={`text-sm ${isLightTheme ? "text-slate-600" : "text-neutral-400"} whitespace-pre-wrap`}>{updateStatus.releaseNotes}</p>}
                    <button onClick={() => toast.success("Contact support for manual update")} className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium">
                      <Download className="w-4 h-4" /> Download Update
                    </button>
                  </div>
                )}
                {!updateStatus.hasUpdate && !updateStatus.error && !updateStatus.checking && (
                  <div className={`flex items-center gap-2 p-3 rounded-lg ${isLightTheme ? "bg-green-50 text-green-700" : "bg-green-500/10 text-green-400"}`}>
                    <CheckCircle className="w-4 h-4" /><span className="text-sm">You are on the latest version</span>
                  </div>
                )}
              </div>
              <p className={`text-xs ${isLightTheme ? "text-slate-500" : "text-neutral-500"}`}>Set UPDATE_SERVER_URL env variable to enable remote update checking.</p>
            </div>
          </div>
        )}

        {/* Account Info */}
        <div className={`rounded-2xl p-6 ${isLightTheme ? "bg-white border border-slate-200 shadow-md" : "glass-dark"}`}>
          <h3 className={`text-lg font-semibold mb-4 ${isLightTheme ? "text-slate-800" : "text-white"}`}>Account Information</h3>
          <div className="space-y-2">
            <p className={isLightTheme ? "text-slate-600" : "text-neutral-400"}>
              Name: <span className={`font-medium ${isLightTheme ? "text-slate-800" : "text-white"}`}>{currentUser?.name}</span>
            </p>
            <p className={isLightTheme ? "text-slate-600" : "text-neutral-400"}>
              Email: <span className={`font-medium ${isLightTheme ? "text-slate-800" : "text-white"}`}>{currentUser?.email}</span>
            </p>
            <p className={isLightTheme ? "text-slate-600" : "text-neutral-400"}>
              Role: <span className={`font-medium ${isLightTheme ? "text-blue-600" : "text-blue-400"}`}>{currentUserRole}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}