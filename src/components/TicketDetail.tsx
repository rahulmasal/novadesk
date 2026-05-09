import { useState } from "react";
import { z } from "zod";
import { useTicketStore } from "@/lib/store";
import { X, Send, UserCheck, Clock, Trash2, ChevronDown } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { StatusEnum } from "@/lib/schemas";

type StatusType = z.infer<typeof StatusEnum>;

const STATUS_OPTIONS: { value: StatusType; label: string; color: string }[] = [
  { value: "NEW", label: "New", color: "bg-blue-500/20 text-blue-400 border-blue-500/20" },
  { value: "IN_PROGRESS", label: "In Progress", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/20" },
  { value: "PENDING_VENDOR", label: "Pending Vendor", color: "bg-purple-500/20 text-purple-400 border-purple-500/20" },
  { value: "RESOLVED", label: "Resolved", color: "bg-green-500/20 text-green-400 border-green-500/20" },
  { value: "CLOSED", label: "Closed", color: "bg-neutral-500/20 text-neutral-400 border-neutral-500/20" },
];

/**
 * TicketDetail - Slide-out detail panel showing full ticket info, activity thread, and admin actions
 *
 * @param ticketId - ID of the ticket to display
 * @param onClose - Callback to close the detail panel
 */
export function TicketDetail({ ticketId, onClose }: { ticketId: string; onClose: () => void }) {
   const { tickets, activities, currentUserRole, updateTicketStatus, addActivity, deleteTicket, allUsers } = useTicketStore();
    const [comment, setComment] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);
    const [showAssignDropdown, setShowAssignDropdown] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);

   const ticket = tickets.find((t) => t.id === ticketId);
   if (!ticket) return null;

  const ticketActivities = activities.filter((a) => a.ticketId === ticketId).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    const isAgentOrAdmin = currentUserRole === "AGENT" || currentUserRole === "ADMINISTRATOR";
    addActivity(ticket.id, `${isAgentOrAdmin ? "Agent" : "User"} commented: ${comment}`);
    setComment("");
  };

const handleAssignToMe = async () => {
      addActivity(ticket.id, `Ticket assigned to Agent.`);
      await updateTicketStatus(ticket.id, "IN_PROGRESS");
    };

const handleAssignToAgent = async (agentId: string) => {
       const agent = allUsers.find(u => u.id === agentId);
       if (agent) {
         addActivity(ticket.id, `Ticket ${ticket.id} assigned to ${agent.name}`);
         await updateTicketStatus(ticket.id, "IN_PROGRESS");
       }
       setShowAssignDropdown(false);
     };

  const handleDelete = async () => {
    console.log("[TicketDetail] handleDelete called, currentUserRole:", currentUserRole, "ticketId:", ticket.id);
    if (!confirm("Delete this ticket? This action cannot be undone.")) return;
    setIsDeleting(true);
    const success = await deleteTicket(ticket.id);
    console.log("[TicketDetail] deleteTicket result:", success);
    if (success) {
      onClose();
    } else {
      alert("Failed to delete ticket.");
      setIsDeleting(false);
    }
  };

return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg h-full bg-neutral-900 border-l border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
         
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-start bg-white/[0.02]">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/20">
                {ticket.status}
              </span>
              <span className="text-sm text-neutral-400">#{ticket.id}</span>
            </div>
            <h2 className="text-2xl font-semibold text-white">{ticket.title}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-neutral-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-neutral-500 mb-1">Requested By</p>
              <p className="text-white font-medium">{ticket.username || ticket.createdBy}</p>
              <p className="text-neutral-400 text-xs">{ticket.department || 'N/A'}</p>
            </div>
            <div>
              <p className="text-neutral-500 mb-1">Priority & Category</p>
              <p className="text-white font-medium">{ticket.priority} • {ticket.category}</p>
            </div>
            <div>
              <p className="text-neutral-500 mb-1">Device Info</p>
              <p className="text-white font-medium">{ticket.hostname || 'Unknown'} / {ticket.laptopSerial || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-neutral-500 mb-1">Due Date</p>
              <p className="text-white font-medium flex items-center gap-1">
                <Clock className="w-3 h-3 text-neutral-400" />
                {formatDistanceToNow(parseISO(ticket.dueDate))}
              </p>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-sm font-medium text-neutral-500 mb-2">Description</h3>
            <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-neutral-300 text-sm whitespace-pre-wrap">
              {ticket.description}
            </div>
          </div>

{/* Quick Actions (Agent/Admin) */}
            {(currentUserRole === "AGENT" || currentUserRole === "ADMINISTRATOR") && (
              <div className="flex gap-3 pt-4 border-t border-white/10 relative">
                {currentUserRole === "ADMINISTRATOR" && (
                  <div className="relative">
                    <button 
                      onClick={() => setShowAssignDropdown(!showAssignDropdown)}
                      className="flex items-center gap-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-blue-500/30"
                    >
                      <UserCheck className="w-4 h-4" />
                      Assign to Agent
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    {showAssignDropdown && (
                      <div className="absolute z-20 mt-1 w-64 bg-neutral-800 border border-white/10 rounded-lg shadow-2xl max-h-64 overflow-y-auto">
                        {allUsers.filter(u => u.role === "AGENT" || u.role === "ADMINISTRATOR").map(agent => (
                          <button
                            key={agent.id}
                            onClick={() => handleAssignToAgent(agent.id)}
                            className="w-full text-left px-4 py-3 hover:bg-blue-500/20 text-white text-sm border-b border-white/5 last:border-0 transition-colors"
                          >
                            {agent.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <button
                  onClick={handleAssignToMe}
                  className="flex items-center gap-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-blue-500/30"
                >
                  <UserCheck className="w-4 h-4" />
                  Assign to me
                </button>
                {/* Status Dropdown */}
                <div className="relative inline-block">
                  <button
                    onClick={() => setShowStatusModal(!showStatusModal)}
                    className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors whitespace-nowrap"
                  >
                    <span className="text-xs">{ticket.status.replace(/_/g, ' ')}</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  {showStatusModal && (
                    <div 
                      className="absolute top-full left-0 mt-1 z-20 w-48 bg-neutral-900 border border-white/10 rounded-lg shadow-2xl"
                      onMouseLeave={() => setShowStatusModal(false)}
                    >
                      <div className="py-1">
                        {STATUS_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={async () => {
                              await updateTicketStatus(ticket.id, opt.value);
                              setShowStatusModal(false);
                            }}
                            className={`w-full text-left px-2.5 py-1 text-xs transition-all ${opt.color} hover:opacity-80 rounded mx-1`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {currentUserRole === "ADMINISTRATOR" && (
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex items-center gap-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-red-500/30 ml-auto disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    {isDeleting ? "Deleting..." : "Delete"}
                  </button>
                )}
              </div>
            )}

{/* Activity/Comments Thread */}
          <div>
            <h3 className="text-sm font-medium text-neutral-500 mb-4">Activity & Notes</h3>
            <div className="space-y-4">
              {ticketActivities.length === 0 ? (
                <p className="text-sm text-neutral-500 italic">No activity yet.</p>
              ) : (
                ticketActivities.map((activity) => (
                  <div key={activity.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center shrink-0 border border-white/10">
                      <span className="text-xs font-medium text-neutral-400">
                        {activity.message.includes("Agent") ? "AG" : "US"}
                      </span>
                    </div>
                    <div className="flex-1 bg-white/[0.03] border border-white/5 rounded-2xl rounded-tl-none p-3">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-medium text-neutral-300">
                          {activity.message.split(' ')[0]}
                        </span>
                        <span className="text-[10px] text-neutral-500">
                          {formatDistanceToNow(parseISO(activity.timestamp))} ago
                        </span>
                      </div>
                      <p className="text-sm text-neutral-300">
                        {activity.message.includes("commented:") ? activity.message.split("commented:")[1].trim() : activity.message}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Comment Input */}
        <div className="p-4 border-t border-white/10 bg-neutral-950/50">
          <form onSubmit={handleAddComment} className="flex gap-3">
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a public note..."
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
            <button
              type="submit"
              disabled={!comment.trim()}
              className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
