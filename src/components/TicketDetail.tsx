/**
 * ============================================================================
 * TICKET DETAIL COMPONENT - Modal View for Ticket Details
 * ============================================================================
 *
 * @module /components/TicketDetail
 */

import { useState, useRef, useEffect } from "react";
import { z } from "zod";
import { useTicketStore } from "@/lib/store";
import { useSettings } from "@/contexts/SettingsContext";
import { X, Send, UserCheck, Clock, Trash2, ChevronDown, GripHorizontal, Paperclip } from "lucide-react";
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
   const { tickets, activities, currentUserRole, currentUser, updateTicketStatus, addActivity, deleteTicket, allUsers, authToken } = useTicketStore();
   const { settings } = useSettings();
   const isLightTheme = settings.appearance.theme === "light";
    const [comment, setComment] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);
    const [showAssignDropdown, setShowAssignDropdown] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [windowSize, setWindowSize] = useState({ width: 480, height: 600 });
    const [windowPos, setWindowPos] = useState({ x: window.innerWidth / 2 - 240, y: window.innerHeight / 4 });
    const [attachments, setAttachments] = useState<Array<{ id: string; filename: string; url: string; mimeType: string; size: number; createdAt: string }>>([]);
    const [loadingAttachments, setLoadingAttachments] = useState(false);
    
    const dragRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const dragStartPos = useRef({ mouseX: 0, mouseY: 0, winX: 0, winY: 0 });

useEffect(() => {
      if (!authToken || !ticketId) {
        console.log("[TicketDetail] Skipping attachment fetch - missing token or ticketId", { hasToken: !!authToken, ticketId });
        return;
      }
      
      const fetchAttachments = async () => {
        setLoadingAttachments(true);
        try {
          const res = await fetch(`/api/attachments?ticketId=${ticketId}`, {
            headers: { Authorization: `Bearer ${authToken}` }
          });
          if (res.ok) {
            const data = await res.json();
            console.log("[TicketDetail] Attachments fetched:", data.length);
            setAttachments(data);
          } else {
            console.error("[TicketDetail] Attachments fetch failed:", res.status, await res.text());
            setAttachments([]);
          }
        } catch (err) {
          console.error("Failed to fetch attachments:", err);
          setAttachments([]);
        } finally {
          setLoadingAttachments(false);
        }
      };
      
      fetchAttachments();
    }, [ticketId, authToken]);

    useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging.current) return;
        const dx = e.clientX - dragStartPos.current.mouseX;
        const dy = e.clientY - dragStartPos.current.mouseY;
        setWindowPos({
          x: dragStartPos.current.winX + dx,
          y: dragStartPos.current.winY + dy
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
      e.preventDefault();
      isDragging.current = true;
      dragStartPos.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        winX: windowPos.x,
        winY: windowPos.y
      };
    };

   const ticket = tickets.find((t) => t.id === ticketId);
   if (!ticket) return null;

  const ticketActivities = activities.filter((a) => a.ticketId === ticketId).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    const isAgentOrAdmin = currentUserRole === "AGENT" || currentUserRole === "ADMINISTRATOR";
    const userName = currentUser?.name || currentUser?.email?.split("@")[0] || (isAgentOrAdmin ? "Agent" : "User");
    addActivity(ticket.id, `${userName} (${isAgentOrAdmin ? "Agent" : "User"}) commented: ${comment}`);
    setComment("");
  };

const handleAssignToMe = async () => {
      const userName = currentUser?.name || currentUser?.email?.split("@")[0] || "Agent";
      addActivity(ticket.id, `Ticket assigned to ${userName}.`);
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
      className={`fixed z-50 rounded-xl shadow-2xl overflow-hidden ${isLightTheme ? "bg-white border border-gray-200" : "bg-neutral-900 border border-white/10"}`}
      style={{ width: windowSize.width, height: windowSize.height, left: windowPos.x, top: windowPos.y }}
    >
      <div className="w-full h-full flex flex-col" ref={dragRef}>
        {/* Header - Drag Handle */}
        <header 
          className={`cursor-move p-4 flex justify-between items-start ${isLightTheme ? "bg-slate-50 border-gray-200" : "border-white/10 bg-white/[0.02]"}`}
          onMouseDown={startDrag}
        >
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${isLightTheme ? "bg-blue-100 text-blue-700 border-blue-200" : "bg-blue-500/20 text-blue-400 border-blue-500/20"}`}>
                {ticket.status}
              </span>
              <span className={`text-sm ${isLightTheme ? "text-slate-500" : "text-neutral-400"}`}>#{ticket.id}</span>
            </div>
            <h2 className={`text-xl font-semibold ${isLightTheme ? "text-slate-800" : "text-white"}`}>{ticket.title}</h2>
          </div>
          <button onClick={onClose} className={`p-1.5 rounded-full transition-colors ${isLightTheme ? "hover:bg-slate-200 text-slate-500 hover:text-slate-700" : "hover:bg-white/10 text-neutral-400 hover:text-white"}`}>
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          
          {/* Metadata */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className={`mb-1 ${isLightTheme ? "text-slate-500" : "text-neutral-500"}`}>Requested By</p>
              <p className={`font-medium text-sm ${isLightTheme ? "text-slate-800" : "text-white"}`}>{ticket.username || ticket.createdBy}</p>
              <p className={`text-xs ${isLightTheme ? "text-slate-400" : "text-neutral-400"}`}>{ticket.department || 'N/A'}</p>
            </div>
            <div>
              <p className={`mb-1 ${isLightTheme ? "text-slate-500" : "text-neutral-500"}`}>Priority & Category</p>
              <p className={`font-medium text-sm ${isLightTheme ? "text-slate-800" : "text-white"}`}>{ticket.priority} - {ticket.category}</p>
            </div>
            <div>
              <p className={`mb-1 ${isLightTheme ? "text-slate-500" : "text-neutral-500"}`}>Device Info</p>
              <p className={`font-medium text-sm ${isLightTheme ? "text-slate-800" : "text-white"}`}>{ticket.hostname || 'Unknown'} / {ticket.laptopSerial || 'Unknown'}</p>
            </div>
            <div>
              <p className={`mb-1 ${isLightTheme ? "text-slate-500" : "text-neutral-500"}`}>Due Date</p>
              <p className={`font-medium text-sm flex items-center gap-1 ${isLightTheme ? "text-slate-800" : "text-white"}`}>
                <Clock className={`w-3 h-3 ${isLightTheme ? "text-slate-400" : "text-neutral-400"}`} />
                {formatDistanceToNow(parseISO(ticket.dueDate))}
              </p>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className={`text-sm font-medium mb-2 ${isLightTheme ? "text-slate-500" : "text-neutral-500"}`}>Description</h3>
            <div className={`p-3 rounded-xl text-sm whitespace-pre-wrap ${isLightTheme ? "bg-slate-50 border border-slate-200 text-slate-700" : "bg-white/5 border border-white/5 text-neutral-300"}`}>
              {ticket.description}
            </div>
          </div>

           {/* Attachments */}
           <div>
             <h3 className={`text-sm font-medium mb-2 flex items-center gap-1.5 ${isLightTheme ? "text-slate-500" : "text-neutral-500"}`}>
               <Paperclip className="w-3.5 h-3.5" />
               Attachments
             </h3>
             {loadingAttachments ? (
               <p className={`text-xs ${isLightTheme ? "text-gray-500" : "text-neutral-500"}`}>Loading attachments...</p>
             ) : attachments.length === 0 ? (
               <p className={`text-xs ${isLightTheme ? "text-gray-500" : "text-neutral-500"}`}>No attachments</p>
             ) : (
               <div className="flex flex-wrap gap-2">
                 {attachments.map((att) => (
                   <a
                     key={att.id}
                     href={att.url}
                     target="_blank"
                     rel="noopener noreferrer"
                     className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors border ${isLightTheme ? "bg-gray-50 border-gray-200 text-slate-700 hover:bg-gray-100" : "bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10"}`}
                   >
                     <img src={att.url} alt={att.filename} className="w-8 h-8 object-cover rounded" />
                     <span className="truncate max-w-32">{att.filename}</span>
                   </a>
                 ))}
               </div>
             )}
           </div>

           {/* Quick Actions (Agent/Admin) */}
           {(currentUserRole === "AGENT" || currentUserRole === "ADMINISTRATOR") && (
             <div className={`flex gap-2 pt-2 border-t relative ${isLightTheme ? "border-slate-200" : "border-white/10"}`}>
               {currentUserRole === "ADMINISTRATOR" && (
                 <div className="relative">
                   <button 
                     onClick={() => setShowAssignDropdown(!showAssignDropdown)}
                     className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border min-w-[100px] ${isLightTheme ? "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100" : "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border-blue-500/30"}`}
                   >
                     <UserCheck className="w-3.5 h-3.5" />
                     Assign
                     <ChevronDown className="w-3 h-3" />
                   </button>
                   {showAssignDropdown && (
                     <div className={`absolute z-20 mt-1 w-56 rounded-lg shadow-2xl max-h-48 overflow-y-auto ${isLightTheme ? "bg-white border border-slate-200" : "bg-neutral-800 border border-white/10"}`}>
                       {allUsers.filter(u => u.role === "AGENT" || u.role === "ADMINISTRATOR").map(agent => (
                         <button
                           key={agent.id}
                           onClick={() => handleAssignToAgent(agent.id)}
                           className={`w-full text-left px-3 py-2 text-xs border-b last:border-0 transition-colors ${isLightTheme ? "hover:bg-slate-50 text-slate-700 border-slate-100" : "hover:bg-blue-500/20 text-white border-white/5"}`}
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
                 className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border min-w-[100px] ${isLightTheme ? "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100" : "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border-blue-500/30"}`}
               >
                 <UserCheck className="w-3.5 h-3.5" />
                 Assign to me
               </button>
               {/* Status Dropdown */}
               <div className="relative inline-block">
                 <button
                   onClick={() => setShowStatusModal(!showStatusModal)}
                   className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border min-w-[100px] ${isLightTheme ? "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100" : "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border-blue-500/30"}`}
                 >
                   <span className="text-xs truncate max-w-[80px]">{ticket.status.replace(/_/g, ' ')}</span>
                   <ChevronDown className="w-3 h-3" />
                 </button>
                 {showStatusModal && (
                   <div 
                     className={`absolute top-full left-0 mt-1 z-20 w-44 rounded-lg shadow-2xl`}
                     onMouseLeave={() => setShowStatusModal(false)}
                   >
                     <div className={`py-1 ${isLightTheme ? "bg-white border border-slate-200 rounded-lg" : ""}`}>
                       {STATUS_OPTIONS.map((opt) => (
                         <button
                           key={opt.value}
                           onClick={async () => {
                             await updateTicketStatus(ticket.id, opt.value);
                             setShowStatusModal(false);
                           }}
                           className={`w-full text-left px-2.5 py-1 text-xs transition-all rounded mx-1 ${isLightTheme ? opt.color.replace("bg-", "bg-").replace("text-", "text-").replace("border-", "border-").replace("/20", "-100").replace("/20", "-100") : opt.color} hover:opacity-80`}
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
                   className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ml-auto disabled:opacity-50 min-w-[100px] ${isLightTheme ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100" : "bg-red-500/20 text-red-400 hover:bg-red-500/30 border-red-500/30"}`}
                 >
                   <Trash2 className="w-3.5 h-3.5" />
                   {isDeleting ? "Deleting..." : "Delete"}
                 </button>
               )}
             </div>
           )}

          {/* Activity/Comments Thread */}
          <div>
            <h3 className={`text-sm font-medium mb-3 ${isLightTheme ? "text-slate-500" : "text-neutral-500"}`}>Activity & Notes</h3>
            <div className="space-y-3">
              {ticketActivities.length === 0 ? (
                <p className={`text-xs italic ${isLightTheme ? "text-gray-500" : "text-neutral-500"}`}>No activity yet.</p>
              ) : (
                ticketActivities.map((activity) => (
                  <div key={activity.id} className="flex gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border ${isLightTheme ? "bg-blue-100 border-blue-200" : "bg-neutral-800 border-white/10"}`}>
                      <span className={`text-[10px] font-medium ${isLightTheme ? "text-blue-700" : "text-neutral-400"}`}>
                        {activity.message.includes("Agent") ? "AG" : "US"}
                      </span>
                    </div>
                    <div className={`flex-1 border rounded-xl rounded-tl-none p-2 ${isLightTheme ? "bg-gray-50 border-gray-200" : "bg-white/[0.03] border-white/5"}`}>
                      <div className="flex justify-between items-start mb-0.5">
                        <span className={`text-[10px] font-medium ${isLightTheme ? "text-slate-600" : "text-neutral-300"}`}>
                          {activity.message.split(' ')[0]}
                        </span>
                        <span className={`text-[9px] ${isLightTheme ? "text-gray-400" : "text-neutral-500"}`}>
                          {formatDistanceToNow(parseISO(activity.timestamp))} ago
                        </span>
                      </div>
                      <p className={`text-xs ${isLightTheme ? "text-slate-700" : "text-neutral-300"}`}>
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
        <div className={`p-3 border-t ${isLightTheme ? "border-gray-200 bg-gray-50" : "border-white/10 bg-neutral-950/50"}`}>
          <form onSubmit={handleAddComment} className="flex gap-2">
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a public note..."
              className={`flex-1 border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:border-blue-500 transition-all ${isLightTheme ? "bg-white border-gray-300 text-slate-800 placeholder-gray-400" : "bg-white/5 border-white/10 text-white placeholder-neutral-500"}`}
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
          <GripHorizontal className={`w-3 h-3 ${isLightTheme ? "text-gray-400" : "text-neutral-400"}`} />
        </div>
      </div>
    </div>
  );
}