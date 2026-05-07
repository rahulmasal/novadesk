"use client";

import { useTicketStore } from "@/lib/store";
import {
  LayoutDashboard,
  Ticket,
  Users,
  Settings,
  HelpCircle,
  UserCircle2,
  LifeBuoy,
  Shield,
  Headset,
  FileText,
  Database,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const { currentUserRole, currentView, setView, currentUser, logout } =
    useTicketStore();

  const links = [
    { icon: LayoutDashboard, label: "Dashboard", id: "Dashboard" as const },
    {
      icon: Ticket,
      label: "All Tickets",
      id: "Tickets" as const,
      agentOnly: true,
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
      adminOnly: true,
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
      id: "Settings" as const,
      adminOnly: true,
    },
  ];

  const filteredLinks = links.filter((l) => {
    if (l.agentOnly && currentUserRole === "End User") return false;
    if (l.adminOnly && currentUserRole !== "Administrator") return false;
    return true;
  });

  const getRoleIcon = () => {
    switch (currentUserRole) {
      case "Administrator":
        return <Shield className="w-4 h-4 text-emerald-400" />;
      case "Agent":
        return <Headset className="w-4 h-4 text-purple-400" />;
      default:
        return null;
    }
  };

  return (
    <aside className="w-64 glass-dark border-r border-white/5 flex flex-col h-screen sticky top-0">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
          <LifeBuoy className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-xl font-bold text-white tracking-tight">
          Nova<span className="text-blue-400">Desk</span>
        </h1>
      </div>

      <div className="px-4 py-2">
        <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
              {currentUser?.name?.charAt(0) || "U"}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {currentUser?.name || "Unknown"}
              </p>
              <div className="flex items-center gap-1.5">
                {getRoleIcon()}
                <p className="text-xs text-neutral-400">{currentUserRole}</p>
              </div>
            </div>
          </div>
        </div>

        <nav className="space-y-1">
          {filteredLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => setView(link.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                currentView === link.id
                  ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                  : "text-neutral-400 hover:text-white hover:bg-white/5",
              )}
            >
              <link.icon className="w-5 h-5" />
              {link.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-4 space-y-1">
        <div className="px-3 py-2.5 rounded-lg text-xs text-neutral-500 border border-white/5 mb-2">
          <p>Department: {currentUser?.department || "N/A"}</p>
          <p>Email: {currentUser?.email || "N/A"}</p>
        </div>
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-neutral-400 hover:text-white hover:bg-white/5 transition-all duration-200">
          <HelpCircle className="w-5 h-5" />
          Help & Support
        </button>
      </div>
    </aside>
  );
}
