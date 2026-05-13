"use client";

import { useState } from "react";
import { useTicketStore } from "@/lib/store";
import { useSettings } from "@/contexts/SettingsContext";
import { Database, Download, ShieldCheck, History, AlertTriangle, Upload, HardDrive } from "lucide-react";

/**
 * Backup - Admin backup management interface with create backup and restore from file
 */
export function Backup() {
  const { authToken, currentUserRole } = useTicketStore();
  const { settings } = useSettings();
  const isLightTheme = settings.appearance.theme === "light";
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isJsonRestoring, setIsJsonRestoring] = useState(false);
  const [isSqlRestoring, setIsSqlRestoring] = useState(false);
  const [backupStatus, setBackupStatus] = useState<"idle" | "success" | "error">("idle");
  const [jsonRestoreStatus, setJsonRestoreStatus] = useState<"idle" | "success" | "error">("idle");
  const [sqlRestoreStatus, setSqlRestoreStatus] = useState<"idle" | "success" | "error">("idle");
  const [dbBackupStatus, setDbBackupStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isAdmin = currentUserRole === "ADMINISTRATOR";

  const handleCreateBackup = async () => {
    if (!isAdmin) return;
    setIsBackingUp(true);
    setBackupStatus("idle");

    try {
      const res = await fetch("/api/backup", {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `novadesk-backup-${new Date().toISOString().split("T")[0]}.json`;
        a.click();
        setBackupStatus("success");
      } else {
        setBackupStatus("error");
      }
    } catch (e) {
      console.error("Backup failed:", e);
      setBackupStatus("error");
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleDbBackup = async () => {
    if (!isAdmin) return;
    setIsBackingUp(true);
    setDbBackupStatus("idle");
    setErrorMessage(null);

    try {
      const res = await fetch("/api/backup/database", {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `novadesk-db-${new Date().toISOString().split("T")[0]}.sql`;
        a.click();
        setDbBackupStatus("success");
      } else {
        const err = await res.json();
        setErrorMessage(err.error || "Database backup failed");
        setDbBackupStatus("error");
      }
    } catch (e) {
      console.error("DB Backup failed:", e);
      setErrorMessage("Network error during backup");
      setDbBackupStatus("error");
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isAdmin) return;

    if (!confirm("WARNING: This will overwrite ALL current data. Continue?")) return;

    setIsJsonRestoring(true);
    setJsonRestoreStatus("idle");

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      const res = await fetch("/api/backup/restore", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(data.data || data),
      });

      if (res.ok) {
        setJsonRestoreStatus("success");
        alert("System restored successfully. Please refresh the page.");
        window.location.reload();
      } else {
        setJsonRestoreStatus("error");
        const err = await res.json();
        setErrorMessage(err.error || "Restore failed");
      }
    } catch (e) {
      console.error("Restore failed:", e);
      setJsonRestoreStatus("error");
      setErrorMessage("Failed to parse backup file");
    } finally {
      setIsJsonRestoring(false);
    }
  };

  const handleDbRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isAdmin) return;

    if (!confirm("WARNING: This will overwrite ALL database data. Continue?")) return;

    setIsSqlRestoring(true);
    setSqlRestoreStatus("idle");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/backup/database", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      });

      if (res.ok) {
        setSqlRestoreStatus("success");
        alert("Database restored successfully. Please refresh the page.");
        window.location.reload();
      } else {
        setSqlRestoreStatus("error");
        const err = await res.json();
        setErrorMessage(err.error || "Restore failed");
      }
    } catch (e) {
      console.error("DB Restore failed:", e);
      setSqlRestoreStatus("error");
      setErrorMessage("Failed to restore database");
    } finally {
      setIsSqlRestoring(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className={`${isLightTheme ? "glass-card" : "glass-dark"} p-6 rounded-2xl text-center`}>
          <p className="text-red-500">Access denied. Administrator privileges required.</p>
        </div>
      </div>
    );
  }

  const backupHistory = [
    { date: "2 hours ago", label: "System Export", status: "Success" },
    { date: "1 day ago", label: "Database Backup", status: "Success" },
    { date: "2 days ago", label: "System Export", status: "Success" },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h2 className={`text-3xl font-bold tracking-tight ${isLightTheme ? "text-heading" : "text-white"}`}>System Backup</h2>
        <p className={`mt-1 ${isLightTheme ? "text-body" : "text-neutral-400"}`}>Maintain and export system data for disaster recovery</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Backup Action */}
        <div className="lg:col-span-2 space-y-6">
          <div className={`${isLightTheme ? "glass-card border-blue-200" : "glass-dark"} p-8 border border-blue-500/10 relative overflow-hidden`}>
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Database className={`w-32 h-32 ${isLightTheme ? "text-blue-600" : "text-blue-400"}`} />
            </div>
            
            <div className="relative z-10">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${isLightTheme ? "bg-blue-100" : "bg-blue-500/20"}`}>
                <ShieldCheck className={`w-8 h-8 ${isLightTheme ? "text-blue-600" : "text-blue-400"}`} />
              </div>
              
              <h3 className={`text-xl font-bold mb-2 ${isLightTheme ? "text-heading" : "text-white"}`}>Create Full System Export</h3>
              <p className={`mb-8 max-w-md ${isLightTheme ? "text-body" : "text-neutral-400"}`}>
                Generates a complete snapshot of all tickets, user accounts, and system configurations. 
                Recommended before major system updates.
              </p>

              <button
                onClick={handleCreateBackup}
                disabled={isBackingUp}
                className={`flex items-center gap-2 text-white px-6 py-3 rounded-xl font-semibold transition-all active:scale-95 disabled:opacity-50 ${isLightTheme ? "bg-gradient-to-r from-blue-500 to-blue-600 hover:shadow-lg hover:shadow-blue-500/30" : "bg-blue-500 hover:bg-blue-600 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]"}`}
              >
                {isBackingUp ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Download className="w-5 h-5" />
                )}
                {isBackingUp ? "Processing..." : "Generate & Download Backup"}
              </button>

              {backupStatus === "success" && (
                <p className={`mt-4 text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2 ${isLightTheme ? "text-emerald-600" : "text-emerald-400"}`}>
                  ✓ Backup generated and downloaded successfully.
                </p>
              )}
            </div>
          </div>

          {/* Database Backup Action */}
          <div className={`${isLightTheme ? "glass-card border-emerald-200" : "glass-dark"} p-8 border border-emerald-500/10 relative overflow-hidden`}>
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <HardDrive className={`w-32 h-32 ${isLightTheme ? "text-emerald-600" : "text-emerald-400"}`} />
            </div>
            
            <div className="relative z-10">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${isLightTheme ? "bg-emerald-100" : "bg-emerald-500/20"}`}>
                <HardDrive className={`w-8 h-8 ${isLightTheme ? "text-emerald-600" : "text-emerald-400"}`} />
              </div>
              
              <h3 className={`text-xl font-bold mb-2 ${isLightTheme ? "text-heading" : "text-white"}`}>Create Database Backup</h3>
              <p className={`mb-8 max-w-md ${isLightTheme ? "text-body" : "text-neutral-400"}`}>
                Generates a PostgreSQL SQL dump file for direct database restoration.
                Use this for full database recovery or migration to another server.
              </p>

              <button
                onClick={handleDbBackup}
                disabled={isBackingUp}
                className={`flex items-center gap-2 text-white px-6 py-3 rounded-xl font-semibold transition-all active:scale-95 disabled:opacity-50 ${isLightTheme ? "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:shadow-lg hover:shadow-emerald-500/30" : "bg-emerald-500 hover:bg-emerald-600 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]"}`}
              >
                {isBackingUp ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <HardDrive className="w-5 h-5" />
                )}
                {isBackingUp ? "Processing..." : "Generate SQL Dump"}
              </button>

              {dbBackupStatus === "success" && (
                <p className={`mt-4 text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2 ${isLightTheme ? "text-emerald-600" : "text-emerald-400"}`}>
                  ✓ SQL dump generated and downloaded successfully.
                </p>
              )}

              {errorMessage && (
                <div className={`mt-4 p-3 rounded-lg text-sm font-mono max-h-32 overflow-y-auto ${isLightTheme ? "bg-red-50 text-red-700 border border-red-200" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
                  {errorMessage}
                </div>
              )}
            </div>
          </div>

          {/* Restore Action */}
          <div className={`${isLightTheme ? "glass-card border-purple-200" : "glass-dark"} p-8 border border-purple-500/10`}>
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isLightTheme ? "bg-purple-100" : "bg-purple-500/20"}`}>
                <History className={`w-6 h-6 ${isLightTheme ? "text-purple-600" : "text-purple-400"}`} />
              </div>
              <div>
                <h3 className={`text-xl font-bold ${isLightTheme ? "text-heading" : "text-white"}`}>Restore JSON Backup</h3>
                <p className={`text-sm ${isLightTheme ? "text-body" : "text-neutral-400"}`}>Upload a JSON backup file to restore system state</p>
              </div>
            </div>

            <div className="relative group">
<input
                 type="file"
                 accept=".json"
                 onChange={handleRestore}
                 disabled={isJsonRestoring}
                 className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
               />
              <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${isLightTheme ? "border-slate-300 group-hover:border-purple-400" : "border-white/10 group-hover:border-purple-500/30"}`}>
                <Upload className={`w-8 h-8 mx-auto mb-3 ${isLightTheme ? "text-slate-400 group-hover:text-purple-500" : "text-neutral-500 group-hover:text-purple-400"}`} />
<p className={`font-medium ${isLightTheme ? "text-heading" : "text-white"}`}>
                   {isJsonRestoring ? "Restoring System..." : "Click or drag JSON backup file here"}
                 </p>
                <p className={`text-xs mt-1 ${isLightTheme ? "text-muted" : "text-neutral-500"}`}>Accepts .json backup files</p>
              </div>
            </div>

{jsonRestoreStatus === "error" && (
               <p className="mt-4 text-red-500 text-sm flex items-center gap-2">
                 <AlertTriangle className="w-4 h-4" />
                 Restore failed. Ensure the file is a valid NovaDesk backup.
               </p>
             )}
           </div>

          {/* Database Restore Action */}
          <div className={`${isLightTheme ? "glass-card border-amber-200" : "glass-dark"} p-8 border border-amber-500/10`}>
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isLightTheme ? "bg-amber-100" : "bg-amber-500/20"}`}>
                <HardDrive className={`w-6 h-6 ${isLightTheme ? "text-amber-600" : "text-amber-400"}`} />
              </div>
              <div>
                <h3 className={`text-xl font-bold ${isLightTheme ? "text-heading" : "text-white"}`}>Restore SQL Backup</h3>
                <p className={`text-sm ${isLightTheme ? "text-body" : "text-neutral-400"}`}>Upload a SQL dump file to restore database directly</p>
              </div>
            </div>

            <div className="relative group">
<input
                 type="file"
                 accept=".sql"
                 onChange={handleDbRestore}
                 disabled={isSqlRestoring}
                 className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
               />
              <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${isLightTheme ? "border-slate-300 group-hover:border-amber-400" : "border-white/10 group-hover:border-amber-500/30"}`}>
                <HardDrive className={`w-8 h-8 mx-auto mb-3 ${isLightTheme ? "text-slate-400 group-hover:text-amber-500" : "text-neutral-500 group-hover:text-amber-400"}`} />
<p className={`font-medium ${isLightTheme ? "text-heading" : "text-white"}`}>
                   {isSqlRestoring ? "Restoring Database..." : "Click or drag SQL backup file here"}
                 </p>
                <p className={`text-xs mt-1 ${isLightTheme ? "text-muted" : "text-neutral-500"}`}>Accepts .sql database dump files</p>
              </div>
            </div>

{sqlRestoreStatus === "error" && (
               <p className="mt-4 text-red-500 text-sm flex items-center gap-2">
                 <AlertTriangle className="w-4 h-4" />
                 Restore failed. Ensure the file is a valid PostgreSQL dump.
               </p>
             )}
           </div>

          {/* Backup Strategy Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`${isLightTheme ? "glass-card border-slate-200" : "glass-dark"} p-6 border border-white/5`}>
              <h4 className={`font-semibold mb-2 ${isLightTheme ? "text-heading" : "text-white"}`}>Automated Backups</h4>
              <p className={`text-sm ${isLightTheme ? "text-body" : "text-neutral-500"}`}>
                Daily snapshots are automatically taken at 02:00 AM UTC and stored in 
                the local <code className={`px-1 rounded ${isLightTheme ? "bg-slate-100" : "bg-white/5"}`}>/backups</code> directory.
              </p>
            </div>
            <div className={`${isLightTheme ? "glass-card border-slate-200" : "glass-dark"} p-6 border border-white/5`}>
              <h4 className={`font-semibold mb-2 ${isLightTheme ? "text-heading" : "text-white"}`}>Retention Policy</h4>
              <p className={`text-sm ${isLightTheme ? "text-body" : "text-neutral-500"}`}>
                Local backups are retained for 30 days. Off-site cloud replication 
                can be configured in System Settings.
              </p>
            </div>
          </div>
        </div>

        {/* Recent History Sidebar */}
        <div className={`${isLightTheme ? "glass-card border-slate-200" : "glass-dark"} p-6 border border-white/5`}>
          <div className={`flex items-center gap-2 mb-6 ${isLightTheme ? "" : ""}`}>
            <History className={`w-5 h-5 ${isLightTheme ? "text-slate-500" : "text-neutral-400"}`} />
            <h3 className={`font-semibold ${isLightTheme ? "text-heading" : "text-white"}`}>Backup History</h3>
          </div>
          
          <div className="space-y-4">
            {backupHistory.map((item, i) => (
              <div key={i} className={`p-3 rounded-lg ${isLightTheme ? "bg-slate-50 border border-slate-200" : "bg-white/5 border border-white/5"}`}>
                <p className={`text-sm font-medium ${isLightTheme ? "text-heading" : "text-white"}`}>{item.label}</p>
                <div className="flex justify-between items-center mt-1">
                  <span className={`text-[10px] ${isLightTheme ? "text-slate-400" : "text-neutral-500"}`}>{item.date}</span>
                  <span className={`text-[10px] ${isLightTheme ? "text-emerald-600" : "text-emerald-500"}`}>{item.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}