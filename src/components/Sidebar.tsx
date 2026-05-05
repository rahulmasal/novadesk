"use client";

import { useTicketStore } from "@/lib/store";
import { LayoutDashboard, Ticket, Users, Settings, LogOut, HelpCircle, UserCircle2, LifeBuoy } from "lucide-react";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const { currentUserRole, toggleRole, currentView, setView } = useTicketStore();

  const links = [
    { icon: LayoutDashboard, label: "Dashboard", id: "Dashboard" as const },
    { icon: Ticket, label: "All Tickets", id: "Tickets" as const },
    { icon: Users, label: "Customers", id: "Customers" as const, agentOnly: true },
    { icon: Settings, label: "Settings", id: "Settings" as const },
  ];

  return (
    <aside className="w-64 glass-dark border-r border-white/5 flex flex-col h-screen sticky top-0">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
          <LifeBuoy className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-xl font-bold text-white tracking-tight">Nova<span className="text-blue-400">Desk</span></h1>
      </div>

      <div className="px-4 py-2">
        <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <UserCircle2 className="w-8 h-8 text-neutral-400" />
            <div>
              <p className="text-sm font-medium text-white">{currentUserRole === "Agent" ? "Alex Morgan" : "John Doe"}</p>
              <p className="text-xs text-neutral-400">{currentUserRole}</p>
            </div>
          </div>
        </div>

        <nav className="space-y-1">
          {links.filter(l => !l.agentOnly || currentUserRole === "Agent" || currentUserRole === "Administrator").map((link) => (
            <button
              key={link.id}
              onClick={() => setView(link.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                currentView === link.id 
                  ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" 
                  : "text-neutral-400 hover:text-white hover:bg-white/5"
              )}
            >
              <link.icon className="w-5 h-5" />
              {link.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-4 space-y-1">
        <button
          onClick={toggleRole}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-amber-400 hover:bg-amber-400/10 transition-all duration-200 border border-transparent hover:border-amber-400/20"
        >
          <HelpCircle className="w-5 h-5" />
          Switch to {currentUserRole === "Agent" ? "End User" : currentUserRole === "End User" ? "Administrator" : "Agent"}
        </button>
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-neutral-400 hover:text-white hover:bg-white/5 transition-all duration-200">
          <LogOut className="w-5 h-5" />
          Log out
        </button>
      </div>
    </aside>
  );
}
