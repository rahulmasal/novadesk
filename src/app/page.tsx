/**
 * ============================================================================
 * MAIN DASHBOARD PAGE - Application Entry Point
 * ============================================================================
 *
 * This is the main page component that serves as the application shell.
 * It handles authentication, setup wizard, navigation, and view rendering.
 *
 * WHAT IT DOES:
 * - Checks if application needs initial setup (SetupWizard)
 * - Validates authentication state on mount
 * - Loads users and tickets when user is authenticated
 * - Renders appropriate view based on navigation state
 * - Provides New Ticket button for ticket creation
 *
 * AUTHENTICATION FLOW:
 * 1. Check if setup is needed (needsSetup state)
 * 2. If not authenticated, show Login component
 * 3. If authenticated, load data and show Dashboard
 * 4. checkAuth() validates existing session token
 *
 * VIEW ROUTING:
 * - Dashboard: KPI cards, charts, ticket table, activity feed
 * - Tickets: Full ticket table with search and pagination
 * - Customers: UserManagement component (agents/admins)
 * - Reports: Report generation interface (admin only)
 * - Backup: Backup management interface (admin only)
 * - Settings: Application settings (all users)
 *
 * ROLE-BASED UI:
 * - END_USER: Dashboard with "My Tickets" view
 * - AGENT: Dashboard with charts and all tickets view
 * - ADMINISTRATOR: Full access including Reports and Backup
 *
 * BEGINNER NOTES:
 * - "use client" required for React hooks and client-side rendering
 * - useTicketStore provides global state (auth, tickets, etc.)
 * - useSettings provides theme and user preferences
 * - Sidebar component handles navigation
 *
 * @module /app/page
 */

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
import { useSettings } from "@/contexts/SettingsContext";
import { Plus } from "lucide-react";

/**
 * Dashboard - Main application component
 *
 * This component acts as the application shell, managing:
 * - Authentication state
 * - Setup wizard display
 * - View navigation
 * - Data loading
 *
 * @example
 * // This is the root page, rendered at /
 * export default function Dashboard() { ... }
 */
export default function Dashboard() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const {
    currentUserRole,
    currentView,
    setTickets,
    setAllUsers,
    isAuthenticated,
    authToken,
    checkAuth,
  } = useTicketStore();
  const { settings } = useSettings();
  const isLightTheme = settings.appearance.theme === "light";

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
    const initAuth = async () => {
      await checkAuth();
      setIsLoading(false);
    };
    initAuth();
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

      fetch("/api/tickets?limit=10000", {
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
          <div className="p-4 sm:p-6 md:p-8 pl-4 sm:pl-6 pr-4 sm:pr-6">
            <UserManagement />
          </div>
        );
      case "Reports":
        return (
          <div className="p-4 sm:p-6 md:p-8 pl-4 sm:pl-6 pr-4 sm:pr-6">
            <Reports />
          </div>
        );
      case "Settings":
        return <Settings />;
      case "Backup":
        return (
          <div className="p-4 sm:p-6 md:p-8 pr-4 sm:pr-6">
            <Backup />
          </div>
        );
      case "Tickets":
        return (
          <div className="p-4 sm:p-6 md:p-8 pl-4 sm:pl-6 pr-4 sm:pr-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
              <div>
                <h2 className={`text-2xl sm:text-3xl font-bold tracking-tight ${isLightTheme ? "text-slate-800" : "text-white"}`}>
                  All Tickets
                </h2>
                <p className={`mt-1 text-sm sm:text-base ${isLightTheme ? "text-slate-600" : "text-neutral-400"}`}>
                  Manage and track all support requests
                </p>
              </div>
              <button
                onClick={() => setIsFormOpen(true)}
                className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl font-medium transition-all hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] w-full sm:w-auto"
              >
                <Plus className="w-5 h-5" />
                New Ticket
              </button>
            </div>
            <TicketTable />
          </div>
        );
      case "Dashboard":
      default:
        return (
          <div className="p-4 sm:p-6 md:p-8 pl-4 sm:pl-6 pr-4 sm:pr-6 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
              <div>
                <h2 className={`text-2xl sm:text-3xl font-bold tracking-tight ${isLightTheme ? "text-slate-800" : "text-white"}`}>
                  {currentUserRole === "END_USER"
                    ? "My Tickets"
                    : currentUserRole === "AGENT"
                      ? "Agent Dashboard"
                      : "Admin Console"}
                </h2>
                <p className={`mt-1 text-sm sm:text-base ${isLightTheme ? "text-slate-600" : "text-neutral-400"}`}>
                  {currentUserRole === "END_USER"
                    ? "Track and manage your IT support requests."
                    : "Comprehensive overview of the support landscape."}
                </p>
              </div>
              <button
                onClick={() => setIsFormOpen(true)}
                className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl font-medium transition-all hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] active:scale-95 w-full sm:w-auto"
              >
                <Plus className="w-5 h-5" />
                New Ticket
              </button>
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
  if (isLoading) return null;
  if (!isAuthenticated) return <Login onLogin={() => {}} />;

  return (
    <div className={`flex h-screen overflow-hidden ${isLightTheme ? "bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed" : "bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed relative"}`}>
      {!isLightTheme && (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 via-neutral-950 to-purple-900/10 -z-0" />
          <div className="absolute top-0 left-0 w-full h-full bg-neutral-950/80 -z-0 backdrop-blur-3xl" />
        </>
      )}
      <Sidebar />
      <main className={`flex-1 overflow-y-auto overflow-x-hidden focus:outline-none z-10 ${isLightTheme ? "bg-slate-50" : ""}`}>
        {renderContent()}
      </main>
      {isFormOpen && <TicketForm onClose={() => setIsFormOpen(false)} />}
    </div>
  );
}
