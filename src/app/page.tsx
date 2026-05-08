"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Scorecards } from "@/components/Scorecards";
import { Charts } from "@/components/Charts";
import { TicketTable } from "@/components/TicketTable";
import { ActivityFeed } from "@/components/ActivityFeed";
import { TicketForm } from "@/components/TicketForm";
import { Login } from "@/components/Login";
import { UserManagement } from "@/components/UserManagement";
import { Reports } from "@/components/Reports";
import { Backup } from "@/components/Backup";
import { SetupWizard } from "@/components/SetupWizard";
import { useTicketStore } from "@/lib/store";
import { Plus, LogOut, Lock, CheckCircle, XCircle } from "lucide-react";

export default function Dashboard() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const {
    currentUserRole,
    currentView,
    setTickets,
    isAuthenticated,
    authToken,
    currentUser,
    checkAuth,
    logout,
  } = useTicketStore();

  useEffect(() => {
    const checkSetupStatus = async () => {
      try {
        const res = await fetch("/api/setup/status");
        const data = await res.json();
        setNeedsSetup(data.needsSetup);
      } catch {
        setNeedsSetup(false);
      }
    };
    checkSetupStatus();
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (isAuthenticated && authToken) {
      fetch("/api/tickets", {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      })
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setTickets(data);
          }
        })
        .catch((e) => console.error("Failed to load tickets:", e));
    }
  }, [isAuthenticated, authToken, setTickets]);

  const handleLogout = () => {
    logout();
  };

  const renderContent = () => {
    switch (currentView) {
      case "Customers":
        return (
          <div className="p-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-white tracking-tight">User Management</h2>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white px-4 py-2.5 rounded-xl font-medium transition-all border border-white/10"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
            <UserManagement />
          </div>
        );
      case "Reports":
        return (
          <div className="p-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-white tracking-tight">Reports</h2>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white px-4 py-2.5 rounded-xl font-medium transition-all border border-white/10"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
            <Reports />
          </div>
        );
      case "Settings":
        return (
          <div className="p-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-white tracking-tight">
                System Settings
              </h2>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white px-4 py-2.5 rounded-xl font-medium transition-all border border-white/10"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass-dark p-6 rounded-2xl">
                <h3 className="text-lg font-semibold text-white mb-4">
                  General Configuration
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-neutral-400 mb-1">
                      Company Name
                    </label>
                    <input
                      type="text"
                      defaultValue="NovaDesk IT"
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-neutral-400 mb-1">
                      Support Email
                    </label>
                    <input
                      type="text"
                      defaultValue="support@novadesk.it"
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white"
                    />
                  </div>
                </div>
              </div>
              <div className="glass-dark p-6 rounded-2xl">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Role Management
                </h3>
                <p className="text-sm text-neutral-400 mb-4">
                  Logged in as:{" "}
                  <span className="text-blue-400 font-bold">
                    {currentUser?.name || "Unknown"}
                  </span>
                </p>
                <p className="text-sm text-neutral-400 mb-2">
                  Role:{" "}
                  <span
                    className={`font-bold ${
                      currentUserRole === "ADMINISTRATOR"
                        ? "text-emerald-400"
                        : currentUserRole === "AGENT"
                          ? "text-purple-400"
                          : "text-blue-400"
                    }`}
                  >
                    {currentUserRole}
                  </span>
                </p>
                <p className="text-xs text-neutral-500">
                  Administrators can manage all system parameters, while Agents
                  handle the ticket queue.
                </p>
              </div>
              <div className="glass-dark p-6 rounded-2xl">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-blue-400" />
                  Change Password
                </h3>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (newPassword !== confirmPassword) {
                      setPasswordMsg({ type: "error", text: "Passwords do not match" });
                      return;
                    }
                    setPasswordMsg(null);
                    setIsChangingPassword(true);
                    try {
                      const res = await fetch("/api/auth/password", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${authToken}`,
                        },
                        body: JSON.stringify({ oldPassword, newPassword }),
                      });
                      const data = await res.json();
                      if (res.ok) {
                        setPasswordMsg({ type: "success", text: data.message });
                        setOldPassword("");
                        setNewPassword("");
                        setConfirmPassword("");
                      } else {
                        setPasswordMsg({ type: "error", text: data.error || "Failed to change password" });
                      }
                    } catch {
                      setPasswordMsg({ type: "error", text: "Network error. Please try again." });
                    } finally {
                      setIsChangingPassword(false);
                    }
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm text-neutral-400 mb-1">
                      Current Password
                    </label>
                    <input
                      type="password"
                      required
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-neutral-400 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white"
                      placeholder="Min 8 chars, uppercase, lowercase, number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-neutral-400 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white"
                    />
                  </div>
                  {passwordMsg && (
                    <div className={`flex items-center gap-2 text-sm ${passwordMsg.type === "success" ? "text-green-400" : "text-red-400"}`}>
                      {passwordMsg.type === "success" ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      {passwordMsg.text}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={isChangingPassword}
                    className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white px-4 py-2 rounded-lg font-medium transition-all"
                  >
                    {isChangingPassword ? "Changing..." : "Update Password"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        );
      case "Backup":
        return (
          <div className="p-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-white tracking-tight">Backup</h2>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white px-4 py-2.5 rounded-xl font-medium transition-all border border-white/10"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
            <Backup />
          </div>
        );
      case "Tickets":
        return (
          <div className="p-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-white tracking-tight">
                  All Tickets
                </h2>
                <p className="text-neutral-400 mt-1">
                  Manage and track all support requests
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsFormOpen(true)}
                  className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium transition-all hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]"
                >
                  <Plus className="w-5 h-5" />
                  New Ticket
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white px-4 py-2.5 rounded-xl font-medium transition-all border border-white/10"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </div>
            <div className="glass-dark rounded-2xl overflow-hidden">
              <TicketTable />
            </div>
          </div>
        );
      case "Dashboard":
      default:
        return (
          <div className="p-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-white tracking-tight">
                  {currentUserRole === "END_USER"
                    ? "My Tickets"
                    : currentUserRole === "AGENT"
                      ? "Agent Dashboard"
                      : "Admin Console"}
                </h2>
                <p className="text-neutral-400 mt-1">
                  {currentUserRole === "END_USER"
                    ? "Track and manage your IT support requests."
                    : "Comprehensive overview of the support landscape."}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsFormOpen(true)}
                  className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium transition-all hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] active:scale-95"
                >
                  <Plus className="w-5 h-5" />
                  New Ticket
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white px-4 py-2.5 rounded-xl font-medium transition-all border border-white/10"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </div>

            {(currentUserRole === "AGENT" ||
              currentUserRole === "ADMINISTRATOR") && (
              <>
                <Scorecards />
                <Charts />
              </>
            )}

            <div
              className={`grid grid-cols-1 ${currentUserRole === "AGENT" || currentUserRole === "ADMINISTRATOR" ? "lg:grid-cols-3" : ""} gap-4 mt-4`}
            >
              <div
                className={
                  currentUserRole === "AGENT" ||
                  currentUserRole === "ADMINISTRATOR"
                    ? "lg:col-span-2"
                    : "col-span-1"
                }
              >
                <TicketTable />
              </div>
              {(currentUserRole === "AGENT" ||
                currentUserRole === "ADMINISTRATOR") && (
                <div>
                  <ActivityFeed />
                </div>
              )}
            </div>
          </div>
        );
    }
  };

  if (needsSetup === null) return null;
  if (needsSetup) return <SetupWizard />;
  if (!isAuthenticated) return <Login onLogin={() => {}} />;

  return (
    <div className="flex h-screen overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed relative">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 via-neutral-950 to-purple-900/10 -z-0" />
      <div className="absolute top-0 left-0 w-full h-full bg-neutral-950/80 -z-0 backdrop-blur-3xl" />
      <Sidebar />
      <main className="flex-1 overflow-y-auto overflow-x-hidden focus:outline-none z-10">
        {renderContent()}
      </main>
      {isFormOpen && <TicketForm onClose={() => setIsFormOpen(false)} />}
    </div>
  );
}
