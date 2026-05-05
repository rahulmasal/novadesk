"use client";

import { useState } from "react";
// wait, oops
import { useTicketStore, Ticket } from "@/lib/store";
import { Search, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

export function TicketTable() {
  const { tickets, currentUserRole } = useTicketStore();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

  const filtered = tickets.filter(
    (t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.id.toLowerCase().includes(search.toLowerCase())
  );
  
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <div className="glass-dark rounded-2xl overflow-hidden mt-4 flex flex-col">
      <div className="p-4 border-b border-white/5 flex items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-white">Active Tickets</h3>
        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search tickets..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 placeholder-neutral-500"
          />
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/[0.02] border-b border-white/5 text-neutral-400 text-sm">
              <th className="p-4 font-medium">Ticket</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium">Priority</th>
              <th className="p-4 font-medium">Category</th>
              <th className="p-4 font-medium">SLA Time Left</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((ticket) => (
              <TicketRow key={ticket.id} ticket={ticket} />
            ))}
            {paginated.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-neutral-500 text-sm">
                  No tickets found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      <div className="p-4 border-t border-white/5 flex items-center justify-between text-sm text-neutral-400">
        <p>Showing {Math.min(filtered.length, (page - 1) * itemsPerPage + 1)} to {Math.min(filtered.length, page * itemsPerPage)} of {filtered.length} entries</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-1.5 rounded-md hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-medium text-white">{page} / {Math.max(1, totalPages)}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || totalPages === 0}
            className="p-1.5 rounded-md hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function TicketRow({ ticket }: { ticket: Ticket }) {
  const isUrgent = ticket.priority === "Urgent";
  
  const createdTime = new Date(ticket.createdAt).getTime();
  const dueTime = new Date(ticket.dueDate).getTime();
  const now = Date.now();
  
  const totalDuration = dueTime - createdTime;
  const elapsed = now - createdTime;
  const progressPercent = Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));
  
  const isBreached = now > dueTime;
  const isWarning = progressPercent > 80 && !isBreached;
  
  const barColor = isBreached ? "bg-red-500" : isWarning ? "bg-amber-400" : "bg-emerald-400";
  
  const statusColors: Record<string, string> = {
    "New": "bg-blue-500/20 text-blue-400 border-blue-500/20",
    "In Progress": "bg-amber-500/20 text-amber-400 border-amber-500/20",
    "Pending Vendor": "bg-purple-500/20 text-purple-400 border-purple-500/20",
    "Resolved": "bg-emerald-500/20 text-emerald-400 border-emerald-500/20",
    "Closed": "bg-neutral-500/20 text-neutral-400 border-neutral-500/20",
  };

  return (
    <tr className={cn(
      "border-b border-white/5 hover:bg-white/[0.02] transition-colors group",
      isUrgent ? "bg-red-500/5 hover:bg-red-500/10" : ""
    )}>
      <td className="p-4">
        <div className="flex items-center gap-3">
          {isUrgent && <AlertCircle className="w-4 h-4 text-red-500 animate-pulse" />}
          <div>
            <p className="text-sm font-medium text-white mb-0.5">{ticket.title}</p>
            <p className="text-xs text-neutral-500">#{ticket.id} • created {formatDistanceToNow(parseISO(ticket.createdAt))} ago</p>
          </div>
        </div>
      </td>
      <td className="p-4">
        <span className={cn("px-2.5 py-1 text-xs font-medium rounded-full border", statusColors[ticket.status])}>
          {ticket.status}
        </span>
      </td>
      <td className="p-4">
        <div className="flex items-center gap-2">
          <span className={cn(
            "w-2 h-2 rounded-full",
            ticket.priority === "Low" ? "bg-blue-400" :
            ticket.priority === "Medium" ? "bg-amber-400" :
            ticket.priority === "High" ? "bg-orange-500" :
            "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"
          )} />
          <span className={cn("text-sm", isUrgent ? "text-red-400 font-medium" : "text-neutral-300")}>
            {ticket.priority}
          </span>
        </div>
      </td>
      <td className="p-4 text-sm text-neutral-300">
        {ticket.category}
      </td>
      <td className="p-4">
        <div className="flex flex-col gap-1.5 w-32">
          <div className="flex items-center justify-between text-xs">
            <span className={isBreached ? "text-red-400 font-medium" : "text-neutral-400"}>
              {isBreached ? "Breached" : formatDistanceToNow(parseISO(ticket.dueDate))}
            </span>
          </div>
          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
            <div 
              className={cn("h-full rounded-full transition-all duration-500", barColor)}
              style={{ width: `${isBreached ? 100 : progressPercent}%` }}
            />
          </div>
        </div>
      </td>
    </tr>
  );
}
