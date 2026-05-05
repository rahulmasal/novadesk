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
import { useTicketStore } from "@/lib/store";
import { Plus, LogOut } from "lucide-react";

export default function Dashboard() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const {
    currentUserRole,
    currentView,
    setTickets,
    isAuthenticated,
    currentUser,
    checkAuth,
    logout,
  } = useTicketStore();

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Load tickets from API when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetch("/api/tickets")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setTickets(data);
          }
        })
        .catch((e) => console.error("Failed to load tickets:", e));
    }
  }, [isAuthenticated]);

  const handleLogout = () => {
    logout();
  };

  const renderContent = () => {
    switch (currentView) {
      case "Customers":
        return <UserManagement />;
      case "Reports":
        return <Reports />;
      case "Settings":
        return (
          <div className="p-8 max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold text-white tracking-tight mb-8">
              System Settings
            </h2>
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
                      currentUserRole === "Administrator"
                        ? "text-emerald-400"
                        : currentUserRole === "Agent"
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
            </div>
          </div>
        );
      case "Tickets":
      case "Dashboard":
      default:
        return (
          <div className="p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-white tracking-tight">
                  {currentUserRole === "End User"
                    ? "My Tickets"
                    : currentUserRole === "Agent"
                      ? "Agent Dashboard"
                      : "Admin Console"}
                </h2>
                <p className="text-neutral-400 mt-1">
                  {currentUserRole === "End User"
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

            {/* Agent/Admin Only Features */}
            {(currentUserRole === "Agent" ||
              currentUserRole === "Administrator") && (
              <>
                <Scorecards />
                <Charts />
              </>
            )}

            {/* Common Features */}
            <div
              className={`grid grid-cols-1 ${currentUserRole === "Agent" || currentUserRole === "Administrator" ? "lg:grid-cols-3" : ""} gap-4 mt-4`}
            >
              <div
                className={
                  currentUserRole === "Agent" ||
                  currentUserRole === "Administrator"
                    ? "lg:col-span-2"
                    : "col-span-1"
                }
              >
                <TicketTable />
              </div>
              {(currentUserRole === "Agent" ||
                currentUserRole === "Administrator") && (
                <div>
                  <ActivityFeed />
                </div>
              )}
            </div>
          </div>
        );
    }
  };

  // Show login if not authenticated
  if (!isAuthenticated) {
    return <Login onLogin={() => {}} />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed relative">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 via-neutral-950 to-purple-900/10 -z-10" />
      <div className="absolute top-0 left-0 w-full h-full bg-neutral-950/80 -z-10 backdrop-blur-3xl" />

      <Sidebar />

      <main className="flex-1 overflow-y-auto overflow-x-hidden focus:outline-none">
        {renderContent()}
      </main>

      {isFormOpen && <TicketForm onClose={() => setIsFormOpen(false)} />}
    </div>
  );
}
