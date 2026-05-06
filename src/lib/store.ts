/**
 * ============================================================================
 * ZUSTAND STORE - Central State Management for the Application
 * ============================================================================
 *
 * This file defines the global state of the application using Zustand.
 * Supports both local JSON mode and Prisma/Supabase mode.
 *
 * @module /lib/store
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";

// Types
export type Priority = "Low" | "Medium" | "High" | "Urgent";
export type Category = "Hardware" | "Software" | "Network" | "Access";
export type Status = "New" | "In Progress" | "Pending Vendor" | "Resolved" | "Closed";
export type Role = "End User" | "Agent" | "Administrator";
export type View = "Dashboard" | "Tickets" | "Customers" | "Reports" | "Settings";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  department: string;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  category: Category;
  status: Status;
  createdBy: string;
  assignedTo?: string;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  username: string;
  hostname: string;
  laptopSerial: string;
  department: string;
}

export interface Comment {
  id: string;
  content: string;
  ticketId: string;
  authorId: string;
  author: { id: string; name: string; email: string };
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  id: string;
  filename: string;
  url: string;
  mimeType: string;
  size: number;
  ticketId: string;
  createdAt: string;
}

export interface Activity {
  id: string;
  ticketId: string;
  message: string;
  timestamp: string;
}

interface TicketStore {
  // Auth state
  currentUser: User | null;
  isAuthenticated: boolean;
  authToken: string | null;

  // App state
  tickets: Ticket[];
  comments: Record<string, Comment[]>;
  attachments: Record<string, Attachment[]>;
  activities: Activity[];
  currentUserRole: Role;
  currentView: View;

  // Actions
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  checkAuth: () => Promise<boolean>;

  addTicket: (ticket: Omit<Ticket, "id" | "createdAt" | "updatedAt" | "status">) => void;
  updateTicketStatus: (id: string, status: Status) => void;
  updateTicket: (id: string, updates: Partial<Ticket>) => void;
  deleteTicket: (id: string) => void;
  setTickets: (tickets: Ticket[]) => void;
  addComment: (ticketId: string, comment: Comment) => void;
  setComments: (ticketId: string, comments: Comment[]) => void;
  addAttachment: (ticketId: string, attachment: Attachment) => void;
  setAttachments: (ticketId: string, attachments: Attachment[]) => void;

  toggleRole: () => void;
  setRole: (role: Role) => void;
  setView: (view: View) => void;
  addActivity: (ticketId: string, message: string) => void;
}

export const useTicketStore = create<TicketStore>()(
  persist(
    (set, get) => ({
      // Initial state
      currentUser: null,
      isAuthenticated: false,
      authToken: null,
      currentUserRole: "Agent",
      currentView: "Dashboard",
      tickets: [
        {
          id: "1",
          title: "VPN connection dropping repeatedly",
          description: "My VPN disconnects every 5 minutes.",
          priority: "High",
          category: "Network",
          status: "In Progress",
          createdBy: "user1",
          dueDate: new Date(Date.now() + 86400000).toISOString(),
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          updatedAt: new Date(Date.now() - 1800000).toISOString(),
          username: "mike.thompson",
          hostname: "MKTLAP-0042",
          laptopSerial: "SN-2024-88421",
          department: "Marketing",
        },
        {
          id: "2",
          title: "Laptop screen shattered",
          description: "Dropped my laptop, screen is broken.",
          priority: "Urgent",
          category: "Hardware",
          status: "New",
          createdBy: "user2",
          dueDate: new Date(Date.now() + 3600000).toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          username: "emma.wilson",
          hostname: "EMMLAP-0018",
          laptopSerial: "SN-2024-99234",
          department: "Sales",
        },
        {
          id: "3",
          title: "Need access to Figma",
          description: "Please grant me editor access to Figma.",
          priority: "Medium",
          category: "Access",
          status: "Pending Vendor",
          createdBy: "user3",
          dueDate: new Date(Date.now() + 172800000).toISOString(),
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          updatedAt: new Date(Date.now() - 43200000).toISOString(),
          username: "alex.chen",
          hostname: "ALXLAP-0055",
          laptopSerial: "SN-2023-77612",
          department: "Design",
        },
      ],
      comments: {},
      attachments: {},
      activities: [
        {
          id: "a1",
          ticketId: "1",
          message: "Agent Sarah assigned ticket #1 to Network Team",
          timestamp: new Date(Date.now() - 1800000).toISOString(),
        },
        {
          id: "a2",
          ticketId: "2",
          message: "User Mike submitted ticket #2 (Urgent)",
          timestamp: new Date().toISOString(),
        },
      ],

      // Auth actions
      login: async (email, password) => {
        try {
          const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });

          const data = await res.json();

          if (!res.ok) {
            return { success: false, error: data.error || "Login failed" };
          }

          set({
            currentUser: data.user,
            authToken: data.token,
            isAuthenticated: true,
            currentUserRole: data.user.role === "ADMINISTRATOR" 
              ? "Administrator" 
              : data.user.role === "AGENT" 
                ? "Agent" 
                : "End User",
          });

          return { success: true };
        } catch (error) {
          return { success: false, error: "Network error. Please try again." };
        }
      },

      logout: async () => {
        const { authToken } = get();
        if (authToken) {
          try {
            await fetch("/api/auth/login", {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${authToken}`,
                "Content-Type": "application/json",
              },
            });
          } catch (e) {
            // Ignore
          }
        }

        set({
          currentUser: null,
          authToken: null,
          isAuthenticated: false,
          currentUserRole: "End User",
        });
      },

      checkAuth: async () => {
        const { authToken } = get();
        if (!authToken) return false;

        try {
          const res = await fetch("/api/auth/login", {
            method: "GET",
            headers: {
              Authorization: `Bearer ${authToken}`,
              "Content-Type": "application/json",
            },
          });

          const data = await res.json();

          if (data.authenticated) {
            set({
              currentUser: data.user,
              isAuthenticated: true,
              currentUserRole: data.user.role === "ADMINISTRATOR" 
                ? "Administrator" 
                : data.user.role === "AGENT" 
                  ? "Agent" 
                  : "End User",
            });
            return true;
          }

          set({
            currentUser: null,
            authToken: null,
            isAuthenticated: false,
          });
          return false;
        } catch (error) {
          return false;
        }
      },

      // Ticket actions
      addTicket: (ticketData) => {
        const id = Math.random().toString(36).substring(2, 9);
        const now = new Date().toISOString();

        const newTicket: Ticket = {
          ...ticketData,
          id,
          status: "New",
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          tickets: [newTicket, ...state.tickets],
          activities: [
            {
              id: Math.random().toString(36).substring(2, 9),
              ticketId: id,
              message: `User submitted ticket #${id}`,
              timestamp: now,
            },
            ...state.activities,
          ],
        }));
      },

      updateTicketStatus: (id, status) => {
        set((state) => ({
          tickets: state.tickets.map((t) =>
            t.id === id
              ? { ...t, status, updatedAt: new Date().toISOString() }
              : t,
          ),
          activities: [
            {
              id: Math.random().toString(36).substring(2, 9),
              ticketId: id,
              message: `Ticket #${id} status changed to ${status}`,
              timestamp: new Date().toISOString(),
            },
            ...state.activities,
          ],
        }));
      },

      updateTicket: (id, updates) => {
        set((state) => ({
          tickets: state.tickets.map((t) =>
            t.id === id
              ? { ...t, ...updates, updatedAt: new Date().toISOString() }
              : t,
          ),
        }));
      },

      deleteTicket: (id) => {
        set((state) => ({
          tickets: state.tickets.filter((t) => t.id !== id),
        }));
      },

      setTickets: (tickets) => set(() => ({ tickets })),

      // Comment actions
      addComment: (ticketId, comment) => {
        set((state) => ({
          comments: {
            ...state.comments,
            [ticketId]: [...(state.comments[ticketId] || []), comment],
          },
        }));
      },

      setComments: (ticketId, comments) => {
        set((state) => ({
          comments: {
            ...state.comments,
            [ticketId]: comments,
          },
        }));
      },

      // Attachment actions
      addAttachment: (ticketId, attachment) => {
        set((state) => ({
          attachments: {
            ...state.attachments,
            [ticketId]: [...(state.attachments[ticketId] || []), attachment],
          },
        }));
      },

      setAttachments: (ticketId, attachments) => {
        set((state) => ({
          attachments: {
            ...state.attachments,
            [ticketId]: attachments,
          },
        }));
      },

      // UI actions
      toggleRole: () =>
        set((state) => ({
          currentUserRole:
            state.currentUserRole === "Agent"
              ? "End User"
              : state.currentUserRole === "End User"
                ? "Administrator"
                : "Agent",
        })),

      setRole: (role) => set(() => ({ currentUserRole: role })),

      setView: (view) => set(() => ({ currentView: view })),

      addActivity: (ticketId, message) => {
        set((state) => ({
          activities: [
            {
              id: Math.random().toString(36).substring(2, 9),
              ticketId,
              message,
              timestamp: new Date().toISOString(),
            },
            ...state.activities,
          ],
        }));
      },
    }),
    {
      name: "ticket-storage",
    },
  ),
);