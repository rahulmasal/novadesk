"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Scorecards } from "@/components/Scorecards";
import { Charts } from "@/components/Charts";
import { TicketTable } from "@/components/TicketTable";
import { ActivityFeed } from "@/components/ActivityFeed";
import { TicketForm } from "@/components/TicketForm";
import { useTicketStore } from "@/lib/store";
import { Plus } from "lucide-react";

export default function Dashboard() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const currentUserRole = useTicketStore((state) => state.currentUserRole);
  const setTickets = useTicketStore((state) => state.setTickets);
  
  // Load tickets from API on mount
  useEffect(() => {
    fetch('/api/tickets')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setTickets(data);
        }
      })
      .catch((e) => console.error('Failed to load tickets:', e));
  }, []);


  return (
    <div className="flex h-screen overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed relative">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 via-neutral-950 to-purple-900/10 -z-10" />
      <div className="absolute top-0 left-0 w-full h-full bg-neutral-950/80 -z-10 backdrop-blur-3xl" />

      <Sidebar />

      <main className="flex-1 overflow-y-auto overflow-x-hidden focus:outline-none">
        <div className="p-8 max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-white tracking-tight">
                {currentUserRole === "Agent" ? "Agent Dashboard" : "My Tickets"}
              </h2>
              <p className="text-neutral-400 mt-1">
                {currentUserRole === "Agent"
                  ? "Here's what's happening with the support queue today."
                  : "Track and manage your IT support requests."}
              </p>
            </div>
            
            <button
              onClick={() => setIsFormOpen(true)}
              className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium transition-all hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] active:scale-95"
            >
              <Plus className="w-5 h-5" />
              New Ticket
            </button>
          </div>

          {/* Agent Only Features */}
          {currentUserRole === "Agent" && (
            <>
              <Scorecards />
              <Charts />
            </>
          )}

          {/* Common Features */}
          <div className={`grid grid-cols-1 ${currentUserRole === "Agent" ? "lg:grid-cols-3" : ""} gap-4 mt-4`}>
            <div className={currentUserRole === "Agent" ? "lg:col-span-2" : "col-span-1"}>
              <TicketTable />
            </div>
            {currentUserRole === "Agent" && (
              <div>
                <ActivityFeed />
              </div>
            )}
          </div>
        </div>
      </main>

      {isFormOpen && <TicketForm onClose={() => setIsFormOpen(false)} />}
    </div>
  );
}
