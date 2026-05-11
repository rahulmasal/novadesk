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
import { Settings } from "@/components/Settings";
import { useTicketStore } from "@/lib/store";
import { Plus, CheckCircle, XCircle } from "lucide-react";

export default function Dashboard() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const {
    currentUserRole,
    currentView,
    setTickets,
    setAllUsers,
    isAuthenticated,
    authToken,
    currentUser,
    checkAuth,
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
      fetch("/api/users", {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      })
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setAllUsers(data);
          }
        })
        .catch((e) => console.error("Failed to load users:", e));

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
  }, [isAuthenticated, authToken, setTickets, setAllUsers]);

  const renderContent = () => {
    switch (currentView) {
      case "Customers":
        return (
          <div className="p-8 pl-6 pr-6">
            <UserManagement />
          </div>
        );
      case "Reports":
        return (
          <div className="p-8 pl-6 pr-6">
            <Reports />
          </div>
        );
      case "Settings":
        return <Settings />;
      case "Backup":
        return (
          <div className="p-8 pr-6">
            <Backup />
          </div>
        );
      case "Tickets":
        return (
          <div className="p-8 pl-6 pr-6">
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
              </div>
            </div>
            <TicketTable />
          </div>
        );
      case "Dashboard":
      default:
        return (
          <div className="p-8 pl-6 pr-6 min-w-0">
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
              className={`grid grid-cols-1 ${currentUserRole === "AGENT" || currentUserRole === "ADMINISTRATOR" ? "lg:grid-cols-3" : ""} gap-4 mt-4 min-w-0`}
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
