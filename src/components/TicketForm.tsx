"use client";

import { useState } from "react";
import { useTicketStore, Priority, Category } from "@/lib/store";
import { Paperclip, Send, X } from "lucide-react";

export function TicketForm({ onClose }: { onClose: () => void }) {
  const addTicket = useTicketStore((state) => state.addTicket);
  const currentUserRole = useTicketStore((state) => state.currentUserRole);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("Medium");
  const [category, setCategory] = useState<Category>("Software");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;

    // Calculate a dummy due date based on priority
    let hours = 24;
    if (priority === "Urgent") hours = 2;
    else if (priority === "High") hours = 8;
    else if (priority === "Low") hours = 72;

    addTicket({
      title,
      description,
      priority,
      category,
      createdBy: currentUserRole === "Agent" ? "agent1" : "user1",
      dueDate: new Date(Date.now() + hours * 3600000).toISOString(),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-neutral-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
          <h2 className="text-xl font-semibold text-white">Create New Ticket</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-neutral-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1.5">Subject</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief description of the issue"
              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all appearance-none"
              >
                <option value="Hardware">Hardware</option>
                <option value="Software">Software</option>
                <option value="Network">Network</option>
                <option value="Access">Access</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all appearance-none"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1.5">Description</label>
            <textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide detailed information about the issue..."
              rows={4}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none"
            />
          </div>

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
              className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium transition-all hover:shadow-[0_0_15px_rgba(59,130,246,0.4)]"
            >
              <Send className="w-4 h-4" />
              Submit Ticket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
