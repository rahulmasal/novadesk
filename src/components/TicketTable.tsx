"use client";

import { useState, useEffect } from "react";
import { useTicketStore, Ticket } from "@/lib/store";
import { Search, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { TicketDetail } from "./TicketDetail";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 200, 500];

/**
 * TicketTable - Searchable, paginated table of tickets with status/priority indicators and row selection
 */
export function TicketTable() {
  const { tickets, deleteTickets, updateTicketsStatus, currentUserRole } = useTicketStore();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [selectedTickets, setSelectedTickets] = useState<Set<string>>(new Set());

  const filtered = tickets.filter(
    (t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.id.toLowerCase().includes(search.toLowerCase()) ||
      t.username?.toLowerCase().includes(search.toLowerCase()) ||
      t.hostname?.toLowerCase().includes(search.toLowerCase()) ||
      t.laptopSerial?.toLowerCase().includes(search.toLowerCase()) ||
      t.createdBy?.toLowerCase().includes(search.toLowerCase()) ||
      t.priority.toLowerCase().includes(search.toLowerCase())
  );
  
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const handleBulkStatusChange = async (status: import("@/lib/store").Status) => {
    await updateTicketsStatus(Array.from(selectedTickets), status);
    setSelectedTickets(new Set());
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedTickets.size} ticket(s)? This cannot be undone.`)) return;
    await deleteTickets(Array.from(selectedTickets));
    setSelectedTickets(new Set());
  };

  return (
    <>
<div className="glass-dark rounded-2xl overflow-hidden mt-4 flex flex-col">
<div className="p-4 border-b border-white/5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold text-white">Active Tickets</h3>
            {selectedTickets.size > 0 && (
              <div className="flex items-center gap-2">
                <select
                  onChange={(e) => {
                    const status = e.target.value as import("@/lib/store").Status;
                    if (status) {
                      handleBulkStatusChange(status);
                    }
                  }}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  defaultValue=""
                >
                  <option value="" disabled>Bulk status...</option>
                  <option value="NEW">Set to New</option>
                  <option value="IN_PROGRESS">Set to In Progress</option>
                  <option value="PENDING_VENDOR">Set to Pending Vendor</option>
                  <option value="RESOLVED">Set to Resolved</option>
                  <option value="CLOSED">Set to Closed</option>
                </select>
                <button
                  onClick={handleBulkDelete}
                  disabled={currentUserRole !== "ADMINISTRATOR"}
                  className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                >
                  Delete ({selectedTickets.size})
                </button>
                <button
                  onClick={() => setSelectedTickets(new Set())}
                  className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-neutral-300 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                >
                  Clear
                </button>
              </div>
            )}
            <select
              value={itemsPerPage}
              onChange={(e) => { setItemsPerPage(Number(e.target.value)); setPage(1); }}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              {PAGE_SIZE_OPTIONS.map(size => (
                <option key={size} value={size} className="bg-neutral-800">
                  {size} per page
                </option>
              ))}
              <option value={tickets.length || 999999} className="bg-neutral-800">
                All ({tickets.length})
              </option>
            </select>
          </div>
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
               <tr className="bg-white/[0.02] border-b border-white/5 text-neutral-400 text-xs uppercase tracking-wider">
                 <th className="p-3 font-medium w-10">
                   <input
                     type="checkbox"
                     checked={selectedTickets.size === paginated.length && paginated.length > 0}
                     onChange={(e) => {
                       if (e.target.checked) {
                         setSelectedTickets(new Set(paginated.map(t => t.id)));
                       } else {
                         setSelectedTickets(new Set());
                       }
                     }}
                     className="w-4 h-4 rounded border-white/20 bg-white/5 checked:bg-blue-500 checked:border-blue-500 focus:ring-1 focus:ring-blue-500/50"
                   />
                 </th>
                 <th className="p-3 font-medium">Ticket</th>
                 <th className="p-3 font-medium">Username</th>
                 <th className="p-3 font-medium">Created</th>
                 <th className="p-3 font-medium">Status</th>
                 <th className="p-3 font-medium">Priority</th>
                 <th className="p-3 font-medium">Category</th>
                 <th className="p-3 font-medium">Hostname</th>
                 <th className="p-3 font-medium">Serial</th>
                 <th className="p-3 font-medium">SLA Time Left</th>
               </tr>
             </thead>
<tbody>
              {paginated.map((ticket) => (
                <TicketRow 
                  key={ticket.id} 
                  ticket={ticket} 
                  onClick={() => setSelectedTicketId(ticket.id)}
                  isSelected={selectedTickets.has(ticket.id)}
                  onSelectChange={(checked) => {
                    const newSelected = new Set(selectedTickets);
                    if (checked) {
                      newSelected.add(ticket.id);
                    } else {
                      newSelected.delete(ticket.id);
                    }
                    setSelectedTickets(newSelected);
                  }}
                />
              ))}
{paginated.length === 0 && (
                 <tr>
                   <td colSpan={10} className="p-8 text-center text-neutral-500 text-sm">
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
      
      {selectedTicketId && (
        <TicketDetail ticketId={selectedTicketId} onClose={() => setSelectedTicketId(null)} />
      )}
    </>
  );
}

function TicketRow({ 
  ticket, 
  onClick, 
  isSelected, 
  onSelectChange 
}: { 
  ticket: Ticket, 
  onClick: () => void,
  isSelected: boolean,
  onSelectChange: (checked: boolean) => void
}) {
  const isUrgent = ticket.priority === "URGENT";
  
  const createdTime = new Date(ticket.createdAt).getTime();
  const dueTime = new Date(ticket.dueDate).getTime();
  const [now, setNow] = useState(() => Date.now());
  
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  
  const totalDuration = dueTime - createdTime;
  const elapsed = now - createdTime;
  const progressPercent = Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));
  
  const isBreached = now > dueTime;
  const isWarning = progressPercent > 80 && !isBreached;
  
  const barColor = isBreached ? "bg-red-500" : isWarning ? "bg-amber-400" : "bg-emerald-400";
  
const statusColors: Record<string, string> = {
  "NEW": "bg-blue-500/20 text-blue-400 border-blue-500/20",
  "IN_PROGRESS": "bg-amber-500/20 text-amber-400 border-amber-500/20",
  "PENDING_VENDOR": "bg-purple-500/20 text-purple-400 border-purple-500/20",
  "RESOLVED": "bg-emerald-500/20 text-emerald-400 border-emerald-500/20",
  "CLOSED": "bg-neutral-500/20 text-neutral-400 border-neutral-500/20",
};

return (
    <tr 
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest('input[type="checkbox"]')) {
          onClick();
        }
      }}
      className={cn(
      "border-b border-white/5 hover:bg-white/[0.05] transition-colors group cursor-pointer",
      isUrgent ? "bg-red-500/5 hover:bg-red-500/10" : "",
      isSelected ? "bg-blue-500/10" : ""
    )}>
<td className="p-3 w-10">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation();
            onSelectChange(e.target.checked);
          }}
          onClick={(e) => e.stopPropagation()}
          className="w-4 h-4 rounded border-white/20 bg-white/5 checked:bg-blue-500 checked:border-blue-500 focus:ring-1 focus:ring-blue-500/50"
        />
      </td>
<td className="p-3">
          <div className="flex items-center gap-2">
            {isUrgent && <AlertCircle className="w-4 h-4 text-red-500 animate-pulse flex-shrink-0" />}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">{ticket.title}</p>
            </div>
          </div>
        </td>
       <td className="p-3 text-sm text-neutral-300 truncate">
          {ticket.username || "-"}
        </td>
        <td className="p-3 text-xs text-neutral-400 whitespace-nowrap">
          {formatDistanceToNow(parseISO(ticket.createdAt), { addSuffix: true })}
        </td>
        <td className="p-3">
        <span className={cn("px-2 py-0.5 text-xs font-medium rounded-full border whitespace-nowrap", statusColors[ticket.status])}>
          {ticket.status}
        </span>
      </td>
      <td className="p-3">
        <div className="flex items-center gap-1.5">
          <span className={cn(
            "w-2 h-2 rounded-full flex-shrink-0",
            ticket.priority === "LOW" ? "bg-blue-400" :
            ticket.priority === "MEDIUM" ? "bg-amber-400" :
            ticket.priority === "HIGH" ? "bg-orange-500" :
            "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"
          )} />
          <span className={cn("text-xs whitespace-nowrap", isUrgent ? "text-red-400 font-medium" : "text-neutral-300")}>
            {ticket.priority}
          </span>
        </div>
      </td>
      <td className="p-3 text-xs text-neutral-300 truncate">
        {ticket.category}
      </td>
      <td className="p-3 text-xs text-neutral-300 truncate">
        {ticket.hostname || "-"}
      </td>
      <td className="p-3 text-xs text-neutral-300 font-mono truncate">
        {ticket.laptopSerial || "-"}
      </td>
      <td className="p-3">
        <div className="flex flex-col gap-1 w-32">
          <div className="flex items-center justify-between text-xs">
            <span className={cn("whitespace-nowrap", isBreached ? "text-red-400 font-medium" : "text-neutral-400")}>
              {isBreached ? "Breached" : formatDistanceToNow(parseISO(ticket.dueDate))}
            </span>
          </div>
          <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
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
