/**
 * ============================================================================
 * SIDEBAR COMPONENT - Navigation Sidebar with Role-Based Access
 * ============================================================================
 *
 * This component renders the main navigation sidebar for the application.
 * It displays different menu items based on the user's role:
 * - END_USER: Dashboard only
 * - AGENT: Dashboard, Tickets, Customers
 * - ADMINISTRATOR: All pages including Reports and Backup
 *
 * KEY FEATURES:
 * - Role-based menu filtering
 * - Current view highlighting
 * - User info display with role icon
 * - Digital clock display
 * - Logout functionality
 *
 * BEGINNER NOTES:
 * - "use client" = runs in browser, not server-side
 * - Uses Zustand store (useTicketStore) for state management
 * - cn() utility merges Tailwind CSS classes intelligently
 * - "sticky top-0" keeps sidebar visible when scrolling
 * - Icons from lucide-react library
 *
 * @module /components/Sidebar
 */

"use client";

import { useTicketStore } from "@/lib/store";
import { useSettings } from "@/contexts/SettingsContext";
import {
   LayoutDashboard,
   Ticket,
   Users,
   Settings,
   HelpCircle,
   LifeBuoy,
   Shield,
   Headset,
   FileText,
   Database,
   LogOut,
  } from "lucide-react";
import { cn } from "@/lib/utils";
import { DigitalClock } from "@/components/DigitalClock";

/**
 * Sidebar - Navigation sidebar with role-based menu items
 *
 * This component:
 * - Displays app logo and digital clock at top
 * - Shows current user info with role badge
 * - Provides navigation buttons for different views
 * - Filters menu items based on user role
 * - Includes logout button at bottom
 *
 * @example
 * // Usage in layout:
 * <div className="flex">
 *   <Sidebar />
 *   <main>Content here</main>
 * </div>
 */
export function Sidebar() {
   // Get state and functions from Zustand store
   const { currentUserRole, currentView, setView, currentUser, logout } =
     useTicketStore();
   const { settings } = useSettings();
   const isLightTheme = settings.appearance.theme === "light";

   /**
    * Navigation links configuration
   *
   * Each link has:
   * - icon: Lucide icon component to display
   * - label: Text to show in menu
   * - id: Key used to track current view
   * - agentOnly: Hide from end users
   * - adminOnly: Hide from agents and end users
   */
  const links = [
    { icon: LayoutDashboard, label: "Dashboard", id: "Dashboard" as const },
    {
      icon: Ticket,
      label: "All Tickets",
      id: "Tickets" as const,
      agentOnly: true, // Only agents and admins see this
    },
    {
      icon: Users,
      label: "Customers",
      id: "Customers" as const,
      agentOnly: true,
    },
    {
      icon: FileText,
      label: "Reports",
      id: "Reports" as const,
      adminOnly: true, // Only admins see this
    },
    {
      icon: Database,
      label: "Backup",
      id: "Backup" as const,
      adminOnly: true,
    },
    {
       icon: Settings,
       label: "Settings",
       id: "Settings" as const, // Everyone sees settings
     },
  ];

  /**
   * Filter links based on current user's role
   *
   * - agentOnly links hidden for END_USER
   * - adminOnly links hidden for AGENT and END_USER
   */
  const filteredLinks = links.filter((l) => {
    if (l.agentOnly && currentUserRole === "END_USER") return false;
    if (l.adminOnly && currentUserRole !== "ADMINISTRATOR") return false;
    return true;
  });

  /**
   * Get the appropriate icon for the current user's role
   *
   * - ADMINISTRATOR gets a Shield icon (emerald color)
   * - AGENT gets a Headset icon (purple color)
   * - END_USER gets no icon
   */
  const getRoleIcon = () => {
    switch (currentUserRole) {
      case "ADMINISTRATOR":
        return <Shield className="w-4 h-4 text-emerald-400" />;
      case "AGENT":
        return <Headset className="w-4 h-4 text-purple-400" />;
      default:
        return null;
    }
  };

  return (
    // Aside element - semantic HTML for sidebar
    // w-64 = 256px width, glass-dark = custom glassmorphism style
    // sticky top-0 keeps it fixed while page scrolls
    <aside className={`w-64 border-r flex flex-col h-screen sticky top-0 ${isLightTheme ? "bg-white/95 border-gray-200 shadow-lg" : "glass-dark border-r border-white/5"}`}>
      {/* Header - Logo and App Name */}
      <div className="p-6 flex flex-col items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isLightTheme ? "bg-gradient-to-br from-blue-500 to-blue-600 shadow-md" : "bg-blue-500"}`}>
          <LifeBuoy className={`w-5 h-5 ${isLightTheme ? "text-white" : ""}`} />
        </div>
        <h1 className={`text-xl font-bold tracking-tight ${isLightTheme ? "text-slate-800" : "text-white"}`}>
          Nova<span className={`${isLightTheme ? "text-blue-600" : "text-blue-400"}`}>Desk</span>
        </h1>
        {/* Digital clock component showing current time */}
        <DigitalClock />
      </div>

      {/* User Profile Section */}
      <div className={`px-4 py-2`}>
        <div className={`p-3 rounded-xl flex items-center justify-between mb-6 ${isLightTheme ? "bg-white/50 border border-gray-200" : "bg-white/5 border border-white/5"}`}>
          <div className="flex items-center gap-3">
{/* User avatar - first letter of name */}
             <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
               {currentUser?.name?.charAt(0) || "U"}
             </div>
             <div className="min-w-0">
               <p className={`text-sm font-medium truncate ${isLightTheme ? "text-gray-900" : "text-white"}`}>
                 {currentUser?.name || "Unknown"}
               </p>
               {/* Role badge with icon */}
               <div className="flex items-center gap-1.5">
                 {getRoleIcon()}
                 <p className={`text-xs ${isLightTheme ? "text-gray-500" : "text-neutral-400"}`}>{currentUserRole}</p>
               </div>
             </div>
          </div>
        </div>

{/* Navigation Menu */}
         <nav className="space-y-1">
           {filteredLinks.map((link) => (
             <button
               key={link.id}
               onClick={() => setView(link.id)}
               // Dynamic class based on whether this link is currently active
               className={cn(
                 "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                 currentView === link.id
                   ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" // Active state
                   : isLightTheme
                     ? "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                     : "text-neutral-400 hover:text-white hover:bg-white/5",   // Inactive state
               )}
             >
              <link.icon className="w-5 h-5" />
              {link.label}
            </button>
          ))}
        </nav>
      </div>

{/* Footer - Additional Info and Actions */}
       <div className={`mt-auto p-4 border-t ${isLightTheme ? "border-gray-200" : "border-white/5"}`}>
         {/* User details display */}
         <div className={`px-3 py-2.5 rounded-lg text-xs border mb-2 ${isLightTheme ? "bg-gray-50 border-gray-200 text-gray-600" : "bg-white/5 border border-white/5 text-neutral-400"}`}>
           <p>Department: {currentUser?.department || "N/A"}</p>
           <p>Email: {currentUser?.email || "N/A"}</p>
         </div>
         {/* Help button */}
         <button className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${isLightTheme ? "text-gray-600 hover:text-gray-900 hover:bg-gray-100" : "text-neutral-400 hover:text-white hover:bg-white/5"}`}>
           <HelpCircle className="w-5 h-5" />
           Help & Support
         </button>
        {/* Logout button - red styling to indicate destructive action */}
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </aside>
  );
}
