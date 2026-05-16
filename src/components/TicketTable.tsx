/**
 * ============================================================================
 * TICKET TABLE COMPONENT - Paginated Ticket List with Search and Bulk Actions
 * ============================================================================
 *
 * This component displays all tickets in a searchable, sortable table format.
 * Supports pagination, filtering, and bulk operations for administrators.
 *
 * WHAT IT DOES:
 * - Displays tickets in a responsive table with columns for ID, title, status, etc.
 * - Provides search functionality across multiple ticket fields
 * - Supports pagination with configurable page sizes (10-1000 items)
 * - Enables bulk status updates and bulk deletion (admin only)
 * - Shows SLA progress bars indicating time remaining before breach
 * - Clicking a ticket row opens the TicketDetail modal
 *
 * BEGINNER NOTES:
 * - "use client" means this component runs in the browser (client-side rendering)
 * - useState manages local state (search query, pagination, selected items)
 * - useTicketStore accesses the global Zustand store for ticket data
 * - The component is marked "use client" because it uses useState/useEffect
 *
 * @module /components/TicketTable
 */

"use client";

import { useState, useEffect } from "react";
import { useTicketStore, Ticket } from "@/lib/store";
import { useSettings } from "@/contexts/SettingsContext";
import { Search, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { TicketDetail } from "./TicketDetail";

/**
 * Page size options for pagination
 * Users can select how many tickets to display per page
 */
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 200, 500, 1000];

/**
 * TicketTable - Main component for displaying and managing tickets
 *
 * This component provides a comprehensive interface for viewing and managing
 * support tickets. It includes search, pagination, and bulk operations.
 *
 * KEY FEATURES:
 * - Real-time search across title, ID, username, hostname, serial, etc.
 * - Configurable pagination with multiple page size options
 * - Bulk selection with checkboxes for multi-ticket operations
 * - SLA progress indicators showing time until ticket breach
 * - Role-based access (admins can delete, agents can assign)
 *
 * @example
 * <TicketTable />
 */
export function TicketTable() {
  const { tickets, deleteTickets, updateTicketsStatus, currentUserRole } = useTicketStore();
  const { settings } = useSettings();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [selectedTickets, setSelectedTickets] = useState<Set<string>>(new Set());
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);

  const isLightTheme = settings.appearance.theme === "light";

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
    const ids = Array.from(selectedTickets);
    setProgressTotal(ids.length);
    setProgressStep(0);
    setShowProgressModal(true);
    await deleteTickets(ids, (completed) => setProgressStep(completed));
    setShowProgressModal(false);
    setSelectedTickets(new Set());
  };

  return (
    <>
      <div className={`rounded-2xl overflow-hidden mt-4 flex flex-col ${isLightTheme ? "bg-white/70 border border-gray-200" : "glass-dark"}`}>
        <div className={`p-4 border-b flex items-center justify-between gap-4 ${isLightTheme ? "border-gray-200" : "border-white/5"}`}>
          <div className="flex items-center gap-4">
            <h3 className={`text-lg font-semibold ${isLightTheme ? "text-gray-900" : "text-white"}`}>Active Tickets</h3>
            {selectedTickets.size > 0 && (
              <div className="flex items-center gap-2">
                <select
                  onChange={(e) => {
                    const status = e.target.value as import("@/lib/store").Status;
                    if (status) {
                      handleBulkStatusChange(status);
                    }
                  }}
                  className={`rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                    isLightTheme
                      ? "bg-white border border-gray-300 text-gray-900"
                      : "bg-white/5 border border-white/10 text-white"
                  }`}
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
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isLightTheme
                      ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      : "bg-white/5 hover:bg-white/10 text-neutral-300"
                  }`}
                >
                  Clear
                </button>
              </div>
            )}
            <select
              value={itemsPerPage}
              onChange={(e) => { setItemsPerPage(Number(e.target.value)); setPage(1); }}
              className={`rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                isLightTheme
                  ? "bg-white border border-gray-300 text-gray-900"
                  : "bg-white/5 border border-white/10 text-white"
              }`}
            >
              {PAGE_SIZE_OPTIONS.map(size => (
                <option key={size} value={size} className={isLightTheme ? "bg-white" : "bg-neutral-800"}>
                  {size} per page
                </option>
              ))}
              <option value={tickets.length || 999999} className={isLightTheme ? "bg-white" : "bg-neutral-800"}>
                All ({tickets.length})
              </option>
            </select>
          </div>
          <div className="relative max-w-xs w-full">
            <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${isLightTheme ? "text-gray-400" : "text-neutral-400"}`} />
            <input
              type="text"
              placeholder="Search tickets..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className={`w-full rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 placeholder:text-sm ${
                isLightTheme
                  ? "bg-white border border-gray-300 text-gray-900 placeholder-gray-400"
                  : "bg-white/5 border border-white/10 text-white placeholder-neutral-500"
              }`}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`border-b text-neutral-400 text-xs uppercase tracking-wider ${isLightTheme ? "border-gray-200 bg-gray-50" : "border-white/5 bg-white/[0.02]"}`}>
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
                    className={`w-4 h-4 rounded ${isLightTheme ? "border-gray-300 bg-white" : "border-white/20 bg-white/5"} checked:bg-blue-500 checked:border-blue-500 focus:ring-1 focus:ring-blue-500/50`}
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
                  <td colSpan={10} className={`p-8 text-center text-sm ${isLightTheme ? "text-gray-500" : "text-neutral-500"}`}>
                    No tickets found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className={`p-4 border-t flex items-center justify-between text-sm ${isLightTheme ? "border-gray-200 text-gray-600" : "border-white/5 text-neutral-400"}`}>
          <p>Showing {Math.min(filtered.length, (page - 1) * itemsPerPage + 1)} to {Math.min(filtered.length, page * itemsPerPage)} of {filtered.length} entries</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className={`p-1.5 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                isLightTheme ? "hover:bg-gray-100" : "hover:bg-white/10"
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className={`font-medium ${isLightTheme ? "text-gray-900" : "text-white"}`}>{page} / {Math.max(1, totalPages)}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || totalPages === 0}
              className={`p-1.5 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                isLightTheme ? "hover:bg-gray-100" : "hover:bg-white/10"
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {selectedTicketId && (
        <TicketDetail ticketId={selectedTicketId} onClose={() => setSelectedTicketId(null)} />
      )}

      {/* Bulk Delete Progress Modal */}
      {showProgressModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
          <div className={`rounded-xl p-6 w-80 ${isLightTheme ? "bg-white" : "bg-neutral-900 border border-white/10"}`}>
            <h3 className={`text-lg font-semibold mb-4 ${isLightTheme ? "text-gray-800" : "text-white"}`}>Deleting Tickets</h3>
            <p className={`text-sm mb-3 ${isLightTheme ? "text-gray-600" : "text-neutral-400"}`}>
              Processing {progressStep} of {progressTotal}
            </p>
            <div className={`h-2 w-full rounded-full overflow-hidden ${isLightTheme ? "bg-gray-200" : "bg-white/10"}`}>
              <div
                className="h-full bg-red-500 rounded-full transition-all duration-300"
                style={{ width: `${(progressStep / progressTotal) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * TicketRow - Renders a single ticket row in the table
 *
 * WHAT IT DOES:
 * - Displays ticket information in a table row format
 * - Shows SLA progress bar that updates every second
 * - Renders status badges with appropriate colors
 * - Supports row selection via checkbox
 *
 * KEY FEATURES:
 * - Real-time SLA countdown with progress bar visualization
 * - Color-coded status badges (NEW, IN_PROGRESS, RESOLVED, etc.)
 * - Priority indicators with visual styling for urgent tickets
 * - Alert icon animation for URGENT priority tickets
 *
 * PROPS:
 * - ticket: The ticket data to display
 * - onClick: Callback when row is clicked (opens detail modal)
 * - isSelected: Whether this row is selected for bulk operations
 * - onSelectChange: Callback when checkbox state changes
 *
 * @param ticket - Ticket data object
 * @param onClick - Function to call when row is clicked
 * @param isSelected - Boolean indicating if row is selected
 * @param onSelectChange - Function to call when selection changes
 */
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
  const { settings } = useSettings();
  const isLightTheme = settings.appearance.theme === "light";

  const isUrgent = ticket.priority === "URGENT";

  const createdDate = new Date(ticket.createdAt);
  const dueDate = new Date(ticket.dueDate);
  const createdTime = isNaN(createdDate.getTime()) ? 0 : createdDate.getTime();
  const dueTime = isNaN(dueDate.getTime()) ? 0 : dueDate.getTime();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const totalDuration = dueTime - createdTime;
  const elapsed = now - createdTime;
  const progressPercent = totalDuration > 0 ? Math.max(0, Math.min(100, (elapsed / totalDuration) * 100)) : 100;

  const isBreached = now > dueTime && !isNaN(dueTime);
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
        "border-b hover:transition-colors group cursor-pointer",
        isLightTheme
          ? "border-gray-100 hover:bg-gray-50"
          : "border-white/5 hover:bg-white/[0.05]",
        isUrgent ? (isLightTheme ? "bg-red-50/ hover:bg-red-100" : "bg-red-500/5 hover:bg-red-500/10") : "",
        isSelected ? (isLightTheme ? "bg-blue-50" : "bg-blue-500/10") : ""
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
          className={`w-4 h-4 rounded ${isLightTheme ? "border-gray-300 bg-white" : "border-white/20 bg-white/5"} checked:bg-blue-500 checked:border-blue-500 focus:ring-1 focus:ring-blue-500/50`}
        />
      </td>
      <td className="p-3">
        <div className="flex items-center gap-2">
          {isUrgent && <AlertCircle className="w-4 h-4 text-red-500 animate-pulse flex-shrink-0" />}
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-medium truncate ${isLightTheme ? "text-gray-900" : "text-white"}`}>{ticket.title}</p>
          </div>
        </div>
      </td>
      <td className={`p-3 text-sm truncate ${isLightTheme ? "text-gray-700" : "text-neutral-300"}`}>
        {ticket.username || "-"}
      </td>
      <td className={`p-3 text-xs whitespace-nowrap ${isLightTheme ? "text-gray-500" : "text-neutral-400"}`}>
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
          <span className={cn("text-xs whitespace-nowrap", isUrgent ? "text-red-400 font-medium" : isLightTheme ? "text-gray-600" : "text-neutral-300")}>
            {ticket.priority}
          </span>
        </div>
      </td>
      <td className={`p-3 text-xs truncate ${isLightTheme ? "text-gray-700" : "text-neutral-300"}`}>
        {ticket.category}
      </td>
      <td className={`p-3 text-xs truncate ${isLightTheme ? "text-gray-700" : "text-neutral-300"}`}>
        {ticket.hostname || "-"}
      </td>
      <td className={`p-3 text-xs font-mono truncate ${isLightTheme ? "text-gray-700" : "text-neutral-300"}`}>
        {ticket.laptopSerial || "-"}
      </td>
      <td className="p-3">
        <div className="flex flex-col gap-1 w-32">
          <div className="flex items-center justify-between text-xs">
            <span className={cn("whitespace-nowrap", isBreached ? "text-red-400 font-medium" : isLightTheme ? "text-gray-600" : "text-neutral-400")}>
              {isBreached ? "Breached" : formatDistanceToNow(parseISO(ticket.dueDate))}
            </span>
          </div>
          <div className={`h-1 w-full rounded-full overflow-hidden ${isLightTheme ? "bg-gray-200" : "bg-white/10"}`}>
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