"use client";

import { useState, useRef } from "react";
import { useTicketStore, Priority, Category } from "@/lib/store";
import { Paperclip, Send, X, Upload, File } from "lucide-react";

export function TicketForm({ onClose }: { onClose: () => void }) {
  const addTicket = useTicketStore((state) => state.addTicket);
  const currentUserRole = useTicketStore((state) => state.currentUserRole);
  const currentUser = useTicketStore((state) => state.currentUser);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("Medium");
  const [category, setCategory] = useState<Category>("Software");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;

    // Calculate a dummy due date based on priority
    let hours = 24;
    if (priority === "Urgent") hours = 2;
    else if (priority === "High") hours = 8;
    else if (priority === "Low") hours = 72;

    // Use actual user info if logged in
    const userEmail = currentUser?.email || "guest@company.com";
    const userName = currentUser?.name || "Guest User";
    const userDepartment = currentUser?.department || "General";

    const hostname = "HOST-" + Math.random().toString(36).substring(2, 6).toUpperCase();
    const laptopSerial = "SN-" + Date.now();

    addTicket({
      title,
      description,
      priority,
      category,
      createdBy: userEmail,
      dueDate: new Date(Date.now() + hours * 3600000).toISOString(),
      username: userName.toLowerCase().replace(/\s+/g, "."),
      hostname,
      laptopSerial,
      department: userDepartment,
    });

    // Upload attachments if any (only in Prisma mode)
    if (files.length > 0 && currentUser?.id) {
      setUploading(true);
      try {
        const formData = new FormData();
        files.forEach((file) => {
          formData.append("file", file);
        });
        formData.append("ticketId", laptopSerial); // Temporary ID, will be updated

        await fetch("/api/attachments", {
          method: "POST",
          body: formData,
          headers: {
            Authorization: `Bearer ${useTicketStore.getState().authToken}`,
          },
        });
      } catch (error) {
        console.error("Failed to upload attachments:", error);
      } finally {
        setUploading(false);
      }
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-neutral-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/[0.02] shrink-0">
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

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
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
              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
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
                <option value="Hardware">Hardware</option>
                <option value="Software">Software</option>
                <option value="Network">Network</option>
                <option value="Access">Access</option>
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
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
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
              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none"
            />
          </div>

          {/* File Attachments */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1.5">
              Attachments
            </label>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.png,.jpg,.jpeg,.gif"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
            >
              <Paperclip className="w-4 h-4" />
              Attach files
            </button>
            
            {files.length > 0 && (
              <div className="mt-3 space-y-2">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <File className="w-4 h-4 text-neutral-400 shrink-0" />
                      <span className="text-sm text-neutral-300 truncate">
                        {file.name}
                      </span>
                      <span className="text-xs text-neutral-500 shrink-0">
                        ({(file.size / 1024).toFixed(1)}KB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="p-1 hover:bg-white/10 rounded text-neutral-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-2 flex items-center justify-end">
            <button
              type="submit"
              disabled={uploading}
              className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium transition-all hover:shadow-[0_0_15px_rgba(59,130,246,0.4)] disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Upload className="w-4 h-4 animate-pulse" />
                  Uploading...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit Ticket
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}