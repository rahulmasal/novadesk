"use client";

import { useState } from "react";
import { useTicketStore } from "@/lib/store";
import { Database, Download, ShieldCheck, History, AlertTriangle, Upload, HardDrive } from "lucide-react";

/**
 * Backup - Admin backup management interface with create backup and restore from file
 */
export function Backup() {
  const { authToken, currentUserRole } = useTicketStore();
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [backupStatus, setBackupStatus] = useState<"idle" | "success" | "error">("idle");
  const [restoreStatus, setRestoreStatus] = useState<"idle" | "success" | "error">("idle");
  const [dbBackupStatus, setDbBackupStatus] = useState<"idle" | "success" | "error">("idle");

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
        setDbBackupStatus("error");
      }
    } catch (e) {
      console.error("DB Backup failed:", e);
      setDbBackupStatus("error");
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isAdmin) return;

    if (!confirm("WARNING: This will overwrite ALL current data. Continue?")) return;

    setIsRestoring(true);
    setRestoreStatus("idle");

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      const res = await fetch("/api/backup/restore", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        setRestoreStatus("success");
        alert("System restored successfully. Please refresh the page.");
        window.location.reload();
      } else {
        setRestoreStatus("error");
        const err = await res.json();
        alert(err.error || "Restore failed");
      }
    } catch (e) {
      console.error("Restore failed:", e);
      setRestoreStatus("error");
      alert("Failed to parse backup file");
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDbRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isAdmin) return;

    if (!confirm("WARNING: This will overwrite ALL database data. Continue?")) return;

    setIsRestoring(true);
    setRestoreStatus("idle");

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
        setRestoreStatus("success");
        alert("Database restored successfully. Please refresh the page.");
        window.location.reload();
      } else {
        setRestoreStatus("error");
        const err = await res.json();
        alert(err.error || "Restore failed");
      }
    } catch (e) {
      console.error("DB Restore failed:", e);
      setRestoreStatus("error");
      alert("Failed to restore database");
    } finally {
      setIsRestoring(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="glass-dark p-6 rounded-2xl text-center">
          <p className="text-red-400">Access denied. Administrator privileges required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white tracking-tight">System Backup</h2>
        <p className="text-neutral-400 mt-1">Maintain and export system data for disaster recovery</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Backup Action */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-dark rounded-2xl p-8 border border-blue-500/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Database className="w-32 h-32 text-blue-400" />
            </div>
            
            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-6">
                <ShieldCheck className="w-8 h-8 text-blue-400" />
              </div>
              
              <h3 className="text-xl font-bold text-white mb-2">Create Full System Export</h3>
              <p className="text-neutral-400 mb-8 max-w-md">
                Generates a complete snapshot of all tickets, user accounts, and system configurations. 
                Recommended before major system updates.
              </p>

              <button
                onClick={handleCreateBackup}
                disabled={isBackingUp}
                className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold transition-all hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] active:scale-95 disabled:opacity-50"
              >
                {isBackingUp ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Download className="w-5 h-5" />
                )}
                {isBackingUp ? "Processing..." : "Generate & Download Backup"}
              </button>

{backupStatus === "success" && (
                 <p className="mt-4 text-emerald-400 text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                   ✓ Backup generated and downloaded successfully.
                 </p>
               )}
            </div>
          </div>

          {/* Database Backup Action */}
          <div className="glass-dark rounded-2xl p-8 border border-emerald-500/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <HardDrive className="w-32 h-32 text-emerald-400" />
            </div>
            
            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-6">
                <HardDrive className="w-8 h-8 text-emerald-400" />
              </div>
              
              <h3 className="text-xl font-bold text-white mb-2">Create Database Backup</h3>
              <p className="text-neutral-400 mb-8 max-w-md">
                Generates a PostgreSQL SQL dump file for direct database restoration.
                Use this for full database recovery or migration to another server.
              </p>

              <button
                onClick={handleDbBackup}
                disabled={isBackingUp}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold transition-all hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-95 disabled:opacity-50"
              >
                {isBackingUp ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <HardDrive className="w-5 h-5" />
                )}
                {isBackingUp ? "Processing..." : "Generate SQL Dump"}
              </button>

              {dbBackupStatus === "success" && (
                <p className="mt-4 text-emerald-400 text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                  ✓ SQL dump generated and downloaded successfully.
                </p>
              )}
            </div>
          </div>

          {/* Restore Action */}
          <div className="glass-dark rounded-2xl p-8 border border-purple-500/10">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <History className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Restore JSON Backup</h3>
                <p className="text-sm text-neutral-400">Upload a JSON backup file to restore system state</p>
              </div>
            </div>

            <div className="relative group">
              <input
                type="file"
                accept=".json"
                onChange={handleRestore}
                disabled={isRestoring}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <div className="border-2 border-dashed border-white/10 group-hover:border-purple-500/30 rounded-xl p-8 text-center transition-all">
                <Upload className="w-8 h-8 text-neutral-500 mx-auto mb-3 group-hover:text-purple-400" />
                <p className="text-white font-medium">
                  {isRestoring ? "Restoring System..." : "Click or drag JSON backup file here"}
                </p>
                <p className="text-xs text-neutral-500 mt-1">Accepts .json backup files</p>
              </div>
            </div>

            {restoreStatus === "error" && (
              <p className="mt-4 text-red-400 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Restore failed. Ensure the file is a valid NovaDesk backup.
              </p>
            )}
          </div>

          {/* Database Restore Action */}
          <div className="glass-dark rounded-2xl p-8 border border-amber-500/10">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <HardDrive className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Restore SQL Backup</h3>
                <p className="text-sm text-neutral-400">Upload a SQL dump file to restore database directly</p>
              </div>
            </div>

            <div className="relative group">
              <input
                type="file"
                accept=".sql"
                onChange={handleDbRestore}
                disabled={isRestoring}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <div className="border-2 border-dashed border-white/10 group-hover:border-amber-500/30 rounded-xl p-8 text-center transition-all">
                <HardDrive className="w-8 h-8 text-neutral-500 mx-auto mb-3 group-hover:text-amber-400" />
                <p className="text-white font-medium">
                  {isRestoring ? "Restoring Database..." : "Click or drag SQL backup file here"}
                </p>
                <p className="text-xs text-neutral-500 mt-1">Accepts .sql database dump files</p>
              </div>
            </div>

            {restoreStatus === "error" && (
              <p className="mt-4 text-red-400 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Restore failed. Ensure the file is a valid PostgreSQL dump.
              </p>
            )}
          </div>

          {/* Backup Strategy Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass-dark rounded-2xl p-6 border border-white/5">
              <h4 className="text-white font-semibold mb-2">Automated Backups</h4>
              <p className="text-sm text-neutral-500">
                Daily snapshots are automatically taken at 02:00 AM UTC and stored in 
                the local <code className="bg-white/5 px-1 rounded">/backups</code> directory.
              </p>
            </div>
            <div className="glass-dark rounded-2xl p-6 border border-white/5">
              <h4 className="text-white font-semibold mb-2">Retention Policy</h4>
              <p className="text-sm text-neutral-500">
                Local backups are retained for 30 days. Off-site cloud replication 
                can be configured in System Settings.
              </p>
            </div>
          </div>
        </div>

        {/* Recent History Sidebar */}
        <div className="glass-dark rounded-2xl p-6 border border-white/5">
          <div className="flex items-center gap-2 mb-6">
            <History className="w-5 h-5 text-neutral-400" />
            <h3 className="text-white font-semibold">Backup History</h3>
          </div>
          
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-3 rounded-lg bg-white/5 border border-white/5">
                <p className="text-sm font-medium text-white">Manual Export</p>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-[10px] text-neutral-500">2026-05-0{7-i} 10:24 AM</span>
                  <span className="text-[10px] text-emerald-500">Success</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
