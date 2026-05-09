import { useState, useRef, useEffect } from "react";
import { z } from "zod";
import { useTicketStore } from "@/lib/store";
import { X, Send, UserCheck, Clock, Trash2, ChevronDown, GripHorizontal } from "lucide-react";
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

export function TicketDetail({ ticketId, onClose }: { ticketId: string; onClose: () => void }) {
   const { tickets, activities, currentUserRole, updateTicketStatus, addActivity, deleteTicket, allUsers } = useTicketStore();
    const [comment, setComment] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);
    const [showAssignDropdown, setShowAssignDropdown] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [windowSize, setWindowSize] = useState({ width: 480, height: 600 });
    const [windowPos, setWindowPos] = useState({ x: window.innerWidth / 2 - 240, y: window.innerHeight / 4 });
    
    const dragRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const dragStart = useRef({ x: 0, y: 0 });

    useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging.current) return;
        setWindowPos({
          x: e.clientX - dragStart.current.x,
          y: e.clientY - dragStart.current.y
        });
      };
      const handleMouseUp = () => {
        isDragging.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }, []);

    const startDrag = (e: React.MouseEvent) => {
      isDragging.current = true;
      const rect = dragRef.current?.getBoundingClientRect();
      dragStart.current = {
        x: e.clientX - (rect?.left || 0),
        y: e.clientY - (rect?.top || 0)
      };
    };

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

  const handleResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = windowSize.width;
    const startHeight = windowSize.height;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      setWindowSize({
        width: Math.max(320, startWidth + moveEvent.clientX - startX),
        height: Math.max(400, startHeight + moveEvent.clientY - startY)
      });
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

return (
    <div 
      className="fixed z-50 bg-neutral-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden"
      style={{ width: windowSize.width, height: windowSize.height, left: windowPos.x, top: windowPos.y }}
    >
      <div className="w-full h-full flex flex-col" ref={dragRef}>
        {/* Header - Drag Handle */}
        <header 
          className="cursor-move p-4 border-b border-white/10 flex justify-between items-start bg-white/[0.02]"
          onMouseDown={startDrag}
        >
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/20">
                {ticket.status}
              </span>
              <span className="text-sm text-neutral-400">#{ticket.id}</span>
            </div>
            <h2 className="text-xl font-semibold text-white">{ticket.title}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-neutral-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          
          {/* Metadata */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-neutral-500 mb-1">Requested By</p>
              <p className="text-white font-medium text-sm">{ticket.username || ticket.createdBy}</p>
              <p className="text-neutral-400 text-xs">{ticket.department || 'N/A'}</p>
            </div>
            <div>
              <p className="text-neutral-500 mb-1">Priority & Category</p>
              <p className="text-white font-medium text-sm">{ticket.priority} • {ticket.category}</p>
            </div>
            <div>
              <p className="text-neutral-500 mb-1">Device Info</p>
              <p className="text-white font-medium text-sm">{ticket.hostname || 'Unknown'} / {ticket.laptopSerial || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-neutral-500 mb-1">Due Date</p>
              <p className="text-white font-medium text-sm flex items-center gap-1">
                <Clock className="w-3 h-3 text-neutral-400" />
                {formatDistanceToNow(parseISO(ticket.dueDate))}
              </p>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-sm font-medium text-neutral-500 mb-2">Description</h3>
            <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-neutral-300 text-sm whitespace-pre-wrap">
              {ticket.description}
            </div>
          </div>

{/* Quick Actions (Agent/Admin) */}
           {(currentUserRole === "AGENT" || currentUserRole === "ADMINISTRATOR") && (
             <div className="flex gap-2 pt-2 border-t border-white/10 relative">
               {currentUserRole === "ADMINISTRATOR" && (
                 <div className="relative">
                   <button 
                     onClick={() => setShowAssignDropdown(!showAssignDropdown)}
                     className="flex-shrink-0 flex items-center gap-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border border-blue-500/30 min-w-[100px]"
                   >
                     <UserCheck className="w-3.5 h-3.5" />
                     Assign
                     <ChevronDown className="w-3 h-3" />
                   </button>
                   {showAssignDropdown && (
                     <div className="absolute z-20 mt-1 w-56 bg-neutral-800 border border-white/10 rounded-lg shadow-2xl max-h-48 overflow-y-auto">
                       {allUsers.filter(u => u.role === "AGENT" || u.role === "ADMINISTRATOR").map(agent => (
                         <button
                           key={agent.id}
                           onClick={() => handleAssignToAgent(agent.id)}
                           className="w-full text-left px-3 py-2 hover:bg-blue-500/20 text-white text-xs border-b border-white/5 last:border-0 transition-colors"
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
                 className="flex-shrink-0 flex items-center gap-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border border-blue-500/30 min-w-[100px]"
               >
                 <UserCheck className="w-3.5 h-3.5" />
                 Assign to me
               </button>
               {/* Status Dropdown */}
               <div className="relative inline-block">
                 <button
                   onClick={() => setShowStatusModal(!showStatusModal)}
                   className="flex-shrink-0 flex items-center gap-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border border-blue-500/30 min-w-[100px]"
                 >
                   <span className="text-xs truncate max-w-[80px]">{ticket.status.replace(/_/g, ' ')}</span>
                   <ChevronDown className="w-3 h-3" />
                 </button>
                 {showStatusModal && (
                   <div 
                     className="absolute top-full left-0 mt-1 z-20 w-44 bg-neutral-900 border border-white/10 rounded-lg shadow-2xl"
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
                   className="flex-shrink-0 flex items-center gap-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border border-red-500/30 ml-auto disabled:opacity-50 min-w-[100px]"
                 >
                   <Trash2 className="w-3.5 h-3.5" />
                   {isDeleting ? "Deleting..." : "Delete"}
                 </button>
               )}
             </div>
           )}

          {/* Activity/Comments Thread */}
          <div>
            <h3 className="text-sm font-medium text-neutral-500 mb-3">Activity & Notes</h3>
            <div className="space-y-3">
              {ticketActivities.length === 0 ? (
                <p className="text-xs text-neutral-500 italic">No activity yet.</p>
              ) : (
                ticketActivities.map((activity) => (
                  <div key={activity.id} className="flex gap-2">
                    <div className="w-6 h-6 rounded-full bg-neutral-800 flex items-center justify-center shrink-0 border border-white/10">
                      <span className="text-[10px] font-medium text-neutral-400">
                        {activity.message.includes("Agent") ? "AG" : "US"}
                      </span>
                    </div>
                    <div className="flex-1 bg-white/[0.03] border border-white/5 rounded-xl rounded-tl-none p-2">
                      <div className="flex justify-between items-start mb-0.5">
                        <span className="text-[10px] font-medium text-neutral-300">
                          {activity.message.split(' ')[0]}
                        </span>
                        <span className="text-[9px] text-neutral-500">
                          {formatDistanceToNow(parseISO(activity.timestamp))} ago
                        </span>
                      </div>
                      <p className="text-xs text-neutral-300">
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
        <div className="p-3 border-t border-white/10 bg-neutral-950/50">
          <form onSubmit={handleAddComment} className="flex gap-2">
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a public note..."
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
            <button
              type="submit"
              disabled={!comment.trim()}
              className="bg-blue-500 text-white p-1.5 rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* Resize Handle */}
        <div 
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-30 hover:opacity-60"
          onMouseDown={handleResize}
        >
          <GripHorizontal className="w-3 h-3 text-neutral-400" />
        </div>
      </div>
    </div>
  );
}