/**
 * ============================================================================
 * SIDEBAR COMPONENT - Navigation Sidebar with Role-Based Access
 * ============================================================================
 */

"use client";

import { useState } from "react";
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
   X,
   Activity,
  } from "lucide-react";
import { cn } from "@/lib/utils";
import { DigitalClock } from "@/components/DigitalClock";

export function Sidebar() {
   const { currentUserRole, currentView, setView, currentUser, logout } =
     useTicketStore();
   const { settings } = useSettings();
   const isLightTheme = settings.appearance.theme === "light";
   const [showHelpModal, setShowHelpModal] = useState(false);
   const [showSystemStatus, setShowSystemStatus] = useState(false);

   const links = [
     { icon: LayoutDashboard, label: "Dashboard", id: "Dashboard" as const },
     { icon: Ticket, label: "All Tickets", id: "Tickets" as const, agentOnly: true },
     { icon: Users, label: "Customers", id: "Customers" as const, agentOnly: true },
     { icon: FileText, label: "Reports", id: "Reports" as const, adminOnly: true },
     { icon: Database, label: "Backup", id: "Backup" as const, adminOnly: true },
     { icon: Settings, label: "Settings", id: "Settings" as const },
   ];

   const filteredLinks = links.filter((l) => {
     if (l.agentOnly && currentUserRole === "END_USER") return false;
     if (l.adminOnly && currentUserRole !== "ADMINISTRATOR") return false;
     return true;
   });

   const getRoleIcon = () => {
     switch (currentUserRole) {
       case "ADMINISTRATOR": return <Shield className="w-4 h-4 text-emerald-400" />;
       case "AGENT": return <Headset className="w-4 h-4 text-purple-400" />;
       default: return null;
     }
   };

   return (
     <>
       <aside className={`w-64 border-r flex flex-col h-screen sticky top-0 ${isLightTheme ? "bg-white/95 border-gray-200 shadow-lg" : "glass-dark border-r border-white/5"}`}>
         <div className="p-6 flex flex-col items-center gap-3">
           <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isLightTheme ? "bg-gradient-to-br from-blue-500 to-blue-600 shadow-md" : "bg-blue-500"}`}>
             <LifeBuoy className={`w-5 h-5 ${isLightTheme ? "text-white" : ""}`} />
           </div>
           <h1 className={`text-xl font-bold tracking-tight ${isLightTheme ? "text-slate-800" : "text-white"}`}>
             Nova<span className={`${isLightTheme ? "text-blue-600" : "text-blue-400"}`}>Desk</span>
           </h1>
           <DigitalClock />
         </div>

         <div className="px-4 py-2">
           <div className={`p-3 rounded-xl flex items-center justify-between mb-6 ${isLightTheme ? "bg-white/50 border border-gray-200" : "bg-white/5 border border-white/5"}`}>
             <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                 {currentUser?.name?.charAt(0) || "U"}
               </div>
               <div className="min-w-0">
                 <p className={`text-sm font-medium truncate ${isLightTheme ? "text-gray-900" : "text-white"}`}>
                   {currentUser?.name || "Unknown"}
                 </p>
                 <div className="flex items-center gap-1.5">
                   {getRoleIcon()}
                   <p className={`text-xs ${isLightTheme ? "text-gray-500" : "text-neutral-400"}`}>{currentUserRole}</p>
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
                     : isLightTheme
                       ? "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                       : "text-neutral-400 hover:text-white hover:bg-white/5",
                 )}
               >
                 <link.icon className="w-5 h-5" />
                 {link.label}
               </button>
             ))}
           </nav>
         </div>

         <div className={`mt-auto p-4 border-t ${isLightTheme ? "border-gray-200" : "border-white/5"}`}>
           <div className={`px-3 py-2.5 rounded-lg text-xs border mb-3 ${isLightTheme ? "bg-gray-50 border-gray-200 text-gray-600" : "bg-white/5 border border-white/5 text-neutral-400"}`}>
             <p className="truncate">Dept: {currentUser?.department || "N/A"}</p>
             <p className="truncate">Email: {currentUser?.email || "N/A"}</p>
           </div>
           
           <div className="space-y-1 mb-2">
             <button 
               onClick={() => setShowHelpModal(true)}
               className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${isLightTheme ? "text-gray-600 hover:text-gray-900 hover:bg-gray-100" : "text-neutral-400 hover:text-white hover:bg-white/5"}`}>
               <HelpCircle className="w-5 h-5" />
               Help Center
             </button>
             <button 
               onClick={() => setView("Tickets")}
               className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${isLightTheme ? "text-gray-600 hover:text-gray-900 hover:bg-gray-100" : "text-neutral-400 hover:text-white hover:bg-white/5"}`}>
               <LifeBuoy className="w-5 h-5" />
               Submit Ticket
             </button>
             <button 
               onClick={() => setShowSystemStatus(true)}
               className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${isLightTheme ? "text-gray-600 hover:text-gray-900 hover:bg-gray-100" : "text-neutral-400 hover:text-white hover:bg-white/5"}`}>
               <Shield className="w-5 h-5" />
               System Status
             </button>
           </div>
           
           <button
             onClick={logout}
             className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200"
           >
             <LogOut className="w-5 h-5" />
             Logout
           </button>
         </div>
       </aside>

       {showHelpModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowHelpModal(false)}>
           <div className={`w-full max-w-md mx-4 rounded-2xl p-6 ${isLightTheme ? "bg-white" : "bg-neutral-900"}`} onClick={(e) => e.stopPropagation()}>
             <div className="flex items-center justify-between mb-4">
               <h3 className={`text-xl font-bold ${isLightTheme ? "text-gray-900" : "text-white"}`}>Help Center</h3>
               <button onClick={() => setShowHelpModal(false)} className={`${isLightTheme ? "text-gray-500 hover:text-gray-700" : "text-neutral-400 hover:text-white"}`}>
                 <X className="w-5 h-5" />
               </button>
             </div>
             <div className="space-y-3">
               <div className={`p-3 rounded-lg ${isLightTheme ? "bg-gray-50" : "bg-white/5"}`}>
                 <p className={`font-medium ${isLightTheme ? "text-gray-900" : "text-white"}`}>Getting Started</p>
                 <p className={`text-sm mt-1 ${isLightTheme ? "text-gray-600" : "text-neutral-400"}`}>Create tickets, assign agents, and track progress.</p>
               </div>
               <div className={`p-3 rounded-lg ${isLightTheme ? "bg-gray-50" : "bg-white/5"}`}>
                 <p className={`font-medium ${isLightTheme ? "text-gray-900" : "text-white"}`}>Keyboard Shortcuts</p>
                 <p className={`text-sm mt-1 ${isLightTheme ? "text-gray-600" : "text-neutral-400"}`}>Press N for new ticket, T for tickets view.</p>
               </div>
               <button
                 onClick={() => { setShowHelpModal(false); setView("Settings"); }}
                 className="w-full mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
               >
                 View Documentation
               </button>
             </div>
           </div>
         </div>
       )}

       {showSystemStatus && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowSystemStatus(false)}>
           <div className={`w-full max-w-md mx-4 rounded-2xl p-6 ${isLightTheme ? "bg-white" : "bg-neutral-900"}`} onClick={(e) => e.stopPropagation()}>
             <div className="flex items-center justify-between mb-4">
               <h3 className={`text-xl font-bold ${isLightTheme ? "text-gray-900" : "text-white"}`}>System Status</h3>
               <button onClick={() => setShowSystemStatus(false)} className={`${isLightTheme ? "text-gray-500 hover:text-gray-700" : "text-neutral-400 hover:text-white"}`}>
                 <X className="w-5 h-5" />
               </button>
             </div>
             <div className="space-y-3">
               <div className="flex items-center justify-between">
                 <span className={isLightTheme ? "text-gray-900" : "text-white"}>API Server</span>
                 <span className="flex items-center gap-1 text-emerald-400"><Activity className="w-4 h-4" /> Operational</span>
               </div>
               <div className="flex items-center justify-between">
                 <span className={isLightTheme ? "text-gray-900" : "text-white"}>Database</span>
                 <span className="flex items-center gap-1 text-emerald-400"><Activity className="w-4 h-4" /> Operational</span>
               </div>
               <div className="flex items-center justify-between">
                 <span className={isLightTheme ? "text-gray-900" : "text-white"}>WebSocket</span>
                 <span className="flex items-center gap-1 text-emerald-400"><Activity className="w-4 h-4" /> Connected</span>
               </div>
             </div>
           </div>
         </div>
       )}
     </>
   );
}