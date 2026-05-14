/**
 * ============================================================================
 * TICKET FORM COMPONENT - Modal Form for Creating New Tickets
 * ============================================================================
 *
 * This component provides a comprehensive form for creating new support tickets.
 * It supports advanced user selection for agents/admins and file attachments.
 *
 * WHAT IT DOES:
 * - Displays a modal form for ticket submission
 * - Collects ticket details: title, description, category, priority
 * - Shows device information (hostname, serial) for the selected user
 * - Supports file attachments for the ticket
 * - Allows agents/admins to create tickets on behalf of other users
 *
 * KEY FEATURES:
 * - User search dropdown for agents to select ticket owner
 * - Auto-fills device info when user is selected
 * - File attachment upload (images)
 * - Client-side validation before submission
 * - Priority and category selection dropdowns
 *
 * BEGINNER NOTES:
 * - useState manages form input state for each field
 * - useEffect auto-populates user/device info when currentUser changes
 * - The form validates input before sending to API
 * - File uploads use FormData (multipart/form-data encoding)
 *
 * @module /components/TicketForm
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { useTicketStore, Priority, Category, User } from "@/lib/store";
import { useSettings } from "@/contexts/SettingsContext";
import { Send, X, Loader2, Upload } from "lucide-react";

/**
 * TicketForm - Modal form for creating new tickets with priority, category, and advanced user fields
 *
 * @param onClose - Callback to close the form modal
 *
 * @example
 * <TicketForm onClose={() => setShowForm(false)} />
 */
export function TicketForm({ onClose }: { onClose: () => void }) {
   const addTicket = useTicketStore((state) => state.addTicket);
   const authToken = useTicketStore((state) => state.authToken);
   const currentUser = useTicketStore((state) => state.currentUser);
   const setAllUsers = useTicketStore((state) => state.setAllUsers);
   const { settings } = useSettings();
   const isLightTheme = settings.appearance.theme === "light";

   const [title, setTitle] = useState("");
   const [description, setDescription] = useState("");
   const [priority, setPriority] = useState<Priority>("MEDIUM");
   const [category, setCategory] = useState<Category>("SOFTWARE");
   const [isSubmitting, setIsSubmitting] = useState(false);

const [targetUser, setTargetUser] = useState<User | null>(null);
    const [hostname, setHostname] = useState("");
    const [laptopSerial, setLaptopSerial] = useState("");
    const [department, setDepartment] = useState("");
    const [allUsers, setLocalAllUsers] = useState<User[]>([]);
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const [userSearch, setUserSearch] = useState("");
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

   useEffect(() => {
     if (currentUser) {
       setTargetUser(currentUser);
       setHostname(currentUser.hostname || "");
       setLaptopSerial(currentUser.laptopSerial || "");
       setDepartment(currentUser.department || "");
       setUserSearch(currentUser.name);
     }
   }, [currentUser]);

   const [errors, setErrors] = useState<{
     title?: string;
     description?: string;
     submit?: string;
   }>({});

   const isAdminOrAgent = currentUser?.role === "ADMINISTRATOR" || currentUser?.role === "AGENT";

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      setSelectedFiles(prev => [...prev, ...files]);
    };

const uploadAttachments = async (ticketId: string) => {
        for (const file of selectedFiles) {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("ticketId", ticketId);

          const res = await fetch("/api/attachments", {
            method: "POST",
            headers: { Authorization: `Bearer ${authToken}` },
            body: formData,
          });
          if (!res.ok) {
            console.error("[TicketForm] Failed to upload attachment:", file.name, res.status);
          }
        }
        setSelectedFiles([]);
      };

   useEffect(() => {
     if (isAdminOrAgent && authToken) {
       fetch("/api/users", {
         headers: { Authorization: `Bearer ${authToken}` }
       })
       .then(res => res.json())
       .then(data => {
         setLocalAllUsers(data);
         setAllUsers(data);
       })
       .catch(err => console.error("Failed to fetch users", err));
     }
   }, [isAdminOrAgent, authToken, setAllUsers]);

  const handleUserSelect = (user: User) => {
    setTargetUser(user);
    setHostname(user.hostname || "");
    setLaptopSerial(user.laptopSerial || "");
    setDepartment(user.department || "");
    setUserSearch(user.name);
    setShowUserDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation matching server schema
    const newErrors: { title?: string; description?: string } = {};
    if (!title || title.trim().length < 5) {
      newErrors.title = "Title must be at least 5 characters";
    }
    if (!description || description.trim().length < 10) {
      newErrors.description = "Description must be at least 10 characters";
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    const ticketData = {
      title: title.trim(),
      description: description.trim(),
      priority: priority,
      category: category,
      username: targetUser?.email?.split("@")[0] || currentUser?.email?.split("@")[0] || "guest",
      hostname: hostname || undefined,
      laptopSerial: laptopSerial || undefined,
      department: department || "General",
    };

    console.log("[TicketForm] Submitting payload:", ticketData);

    try {
      if (authToken) {
        const res = await fetch("/api/tickets", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(ticketData),
        });

if (res.ok) {
           const ticket = await res.json();
           // Upload attachments after ticket is created
           await uploadAttachments(ticket.id);
           addTicket(ticket);
           onClose();
         } else {
          const data = await res.json().catch(() => ({}));
          console.error("[TicketForm] Server error:", res.status, data);
          setErrors({ submit: data.error || "Failed to create ticket. Please check your input." });
        }
      } else {
        setErrors({ submit: "You must be logged in to create a ticket." });
      }
    } catch (error) {
      console.error("Error creating ticket:", error);
      setErrors({ submit: "Network error. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={`rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 ${isLightTheme ? "bg-white border border-gray-200" : "bg-neutral-900 border border-white/10"}`}>
        <div className={`p-5 border-b flex justify-between items-center ${isLightTheme ? "border-gray-200 bg-gray-50" : "border-white/10 bg-white/[0.02]"}`}>
          <h2 className={`text-xl font-semibold ${isLightTheme ? "text-slate-800" : "text-white"}`}>
            Create New Ticket
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-full transition-colors ${isLightTheme ? "text-gray-500 hover:bg-gray-100" : "hover:bg-white/10 text-neutral-400 hover:text-white"}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-5">
          {isAdminOrAgent && (
            <div className="relative">
              <label className={`block text-sm font-medium mb-1.5 ${isLightTheme ? "text-slate-700" : "text-neutral-300"}`}>
                On Behalf Of (User)
              </label>
              <input
                type="text"
                placeholder="Search users..."
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value);
                  setShowUserDropdown(true);
                }}
                onFocus={() => setShowUserDropdown(true)}
                className={`w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-1 transition-all ${isLightTheme ? "bg-gray-50 border-gray-300 text-slate-800 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500" : "bg-black/40 border-white/10 text-white placeholder-neutral-500 focus:border-blue-500 focus:ring-blue-500"}`}
              />
              {showUserDropdown && userSearch && (
                <div className={`absolute z-10 w-full mt-1 border rounded-lg shadow-xl max-h-48 overflow-y-auto ${isLightTheme ? "bg-white border-gray-200" : "bg-neutral-800 border-white/10"}`}>
                  {allUsers
                    .filter(u => u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase()))
                    .slice(0, 10)
                    .map(u => (
                      <div
                        key={u.id}
                        onClick={() => handleUserSelect(u)}
                        className={`px-4 py-2 cursor-pointer text-sm border-b last:border-0 ${isLightTheme ? "hover:bg-blue-50 text-slate-800 border-gray-100" : "hover:bg-blue-500/20 text-white border-white/5"}`}
                      >
                        <p className="font-medium">{u.name}</p>
                        <p className={`text-xs ${isLightTheme ? "text-gray-500" : "text-neutral-400"}`}>{u.email}</p>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          <div>
            <label className={`block text-sm font-medium mb-1.5 ${isLightTheme ? "text-slate-700" : "text-neutral-300"}`}>
              Subject
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief description of the issue"
              className={`w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-1 transition-all ${isLightTheme ? "bg-gray-50 border-gray-300 text-slate-800 placeholder-gray-400" : "bg-black/40 border-white/10 text-white placeholder-neutral-500"} ${errors.title ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "focus:border-blue-500 focus:ring-blue-500"}`}
            />
            {errors.title && (
              <p className={`text-xs mt-1 ${isLightTheme ? "text-red-600" : "text-red-400"}`}>{errors.title}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${isLightTheme ? "text-slate-700" : "text-neutral-300"}`}>
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className={`w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-1 focus:border-blue-500 focus:ring-blue-500 transition-all appearance-none ${isLightTheme ? "bg-white border-gray-300 text-slate-800" : "bg-black/40 border-white/10 text-white"}`}
              >
                <option value="HARDWARE">Hardware</option>
                <option value="SOFTWARE">Software</option>
                <option value="NETWORK">Network</option>
                <option value="ACCESS">Access</option>
              </select>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${isLightTheme ? "text-slate-700" : "text-neutral-300"}`}>
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className={`w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-1 focus:border-blue-500 focus:ring-blue-500 transition-all appearance-none ${isLightTheme ? "bg-white border-gray-300 text-slate-800" : "bg-black/40 border-white/10 text-white"}`}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${isLightTheme ? "text-slate-700" : "text-neutral-300"}`}>
                Hostname
              </label>
              <input
                type="text"
                readOnly
                value={hostname}
                className={`w-full border rounded-lg px-4 py-2.5 cursor-not-allowed text-sm ${isLightTheme ? "bg-gray-100 border-gray-200 text-gray-500" : "bg-white/5 border-white/5 text-neutral-400"}`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${isLightTheme ? "text-slate-700" : "text-neutral-300"}`}>
                Serial Number
              </label>
              <input
                type="text"
                readOnly
                value={laptopSerial}
                className={`w-full border rounded-lg px-4 py-2.5 cursor-not-allowed text-sm ${isLightTheme ? "bg-gray-100 border-gray-200 text-gray-500" : "bg-white/5 border-white/5 text-neutral-400"}`}
              />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1.5 ${isLightTheme ? "text-slate-700" : "text-neutral-300"}`}>
              Description
            </label>
            <textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide detailed information about the issue..."
              rows={4}
              className={`w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-1 transition-all resize-none ${isLightTheme ? "bg-gray-50 border-gray-300 text-slate-800 placeholder-gray-400" : "bg-black/40 border-white/10 text-white placeholder-neutral-500"} ${errors.description ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "focus:border-blue-500 focus:ring-blue-500"}`}
            />
            {errors.description && (
              <p className={`text-xs mt-1 ${isLightTheme ? "text-red-600" : "text-red-400"}`}>{errors.description}</p>
            )}
          </div>

          {errors.submit && (
            <p className={`text-sm border rounded-lg px-4 py-2 ${isLightTheme ? "text-red-600 bg-red-50 border-red-200" : "text-red-400 bg-red-500/10 border-red-500/20"}`}>
              {errors.submit}
            </p>
          )}

<div className="pt-2 flex items-center justify-between">
             <div className="flex items-center gap-2">
               <input
                 type="file"
                 ref={fileInputRef}
                 onChange={handleFileSelect}
                 multiple
                 className="hidden"
                 accept="image/*"
               />
               <button
                 type="button"
                 onClick={() => fileInputRef.current?.click()}
                 className={`flex items-center gap-2 text-sm transition-colors ${isLightTheme ? "text-gray-500 hover:text-slate-700" : "text-neutral-400 hover:text-white"}`}
               >
                 <Upload className="w-4 h-4" />
                 Attach file
                 {selectedFiles.length > 0 && (
                   <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${isLightTheme ? "bg-blue-100 text-blue-700" : "bg-blue-500/20 text-blue-400"}`}>
                     {selectedFiles.length}
                   </span>
                 )}
               </button>
               {selectedFiles.length > 0 && (
                 <div className={`flex flex-wrap gap-1 mt-1 ${isLightTheme ? "text-slate-600" : "text-neutral-400"}`}>
                   {selectedFiles.map((f, i) => (
                     <span key={i} className={`text-xs truncate max-w-32 ${isLightTheme ? "bg-gray-100 px-1.5 py-0.5 rounded" : "bg-white/10 px-1.5 py-0.5 rounded"}`}>
                       {f.name}
                     </span>
                   ))}
                 </div>
               )}
             </div>
             <button
               type="submit"
               disabled={isSubmitting}
               className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white px-5 py-2.5 rounded-lg font-medium transition-all hover:shadow-[0_0_15px_rgba(59,130,246,0.4)] disabled:shadow-none"
             >
               {isSubmitting ? (
                 <Loader2 className="w-4 h-4 animate-spin" />
               ) : (
                 <Send className="w-4 h-4" />
               )}
               {isSubmitting ? "Submitting..." : "Submit Ticket"}
             </button>
           </div>
        </form>
      </div>
    </div>
  );
}
