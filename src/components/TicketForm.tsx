"use client";

import { useState, useEffect } from "react";
import { useTicketStore, Priority, Category, User } from "@/lib/store";
import { Paperclip, Send, X, Loader2 } from "lucide-react";

/**
 * TicketForm - Modal form for creating new tickets with priority, category, and advanced user fields
 *
 * @param onClose - Callback to close the form modal
 */
export function TicketForm({ onClose }: { onClose: () => void }) {
   const addTicket = useTicketStore((state) => state.addTicket);
   const authToken = useTicketStore((state) => state.authToken);
   const currentUser = useTicketStore((state) => state.currentUser);
   const setAllUsers = useTicketStore((state) => state.setAllUsers);

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
      <div className="bg-neutral-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
          <h2 className="text-xl font-semibold text-white">
            Create New Ticket
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-neutral-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-5">
          {isAdminOrAgent && (
            <div className="relative">
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
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
                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
              {showUserDropdown && userSearch && (
                <div className="absolute z-10 w-full mt-1 bg-neutral-800 border border-white/10 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                  {allUsers
                    .filter(u => u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase()))
                    .slice(0, 10)
                    .map(u => (
                      <div
                        key={u.id}
                        onClick={() => handleUserSelect(u)}
                        className="px-4 py-2 hover:bg-blue-500/20 cursor-pointer text-white text-sm border-b border-white/5 last:border-0"
                      >
                        <p className="font-medium">{u.name}</p>
                        <p className="text-xs text-neutral-400">{u.email}</p>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1.5">
              Subject
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief description of the issue"
              className={`w-full bg-black/40 border rounded-lg px-4 py-2.5 text-white placeholder-neutral-500 focus:outline-none focus:ring-1 transition-all ${errors.title ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "border-white/10 focus:border-blue-500 focus:ring-blue-500"}`}
            />
            {errors.title && (
              <p className="text-xs text-red-400 mt-1">{errors.title}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all appearance-none"
              >
                <option value="HARDWARE">Hardware</option>
                <option value="SOFTWARE">Software</option>
                <option value="NETWORK">Network</option>
                <option value="ACCESS">Access</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all appearance-none"
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
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                Hostname
              </label>
              <input
                type="text"
                readOnly
                value={hostname}
                className="w-full bg-white/5 border border-white/5 rounded-lg px-4 py-2.5 text-neutral-400 cursor-not-allowed text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                Serial Number
              </label>
              <input
                type="text"
                readOnly
                value={laptopSerial}
                className="w-full bg-white/5 border border-white/5 rounded-lg px-4 py-2.5 text-neutral-400 cursor-not-allowed text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1.5">
              Description
            </label>
            <textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide detailed information about the issue..."
              rows={4}
              className={`w-full bg-black/40 border rounded-lg px-4 py-2.5 text-white placeholder-neutral-500 focus:outline-none focus:ring-1 transition-all resize-none ${errors.description ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "border-white/10 focus:border-blue-500 focus:ring-blue-500"}`}
            />
            {errors.description && (
              <p className="text-xs text-red-400 mt-1">{errors.description}</p>
            )}
          </div>

          {errors.submit && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
              {errors.submit}
            </p>
          )}

          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
            >
              <Paperclip className="w-4 h-4" />
              Attach file
            </button>
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
