import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";

export type Priority = "Low" | "Medium" | "High" | "Urgent";
export type Category = "Hardware" | "Software" | "Network" | "Access";
export type Status = "New" | "In Progress" | "Pending Vendor" | "Resolved" | "Closed";
export type Role = "End User" | "Agent";

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

export interface Activity {
  id: string;
  ticketId: string;
  message: string;
  timestamp: string;
}

interface TicketStore {
  tickets: Ticket[];
  activities: Activity[];
  currentUserRole: Role;
  addTicket: (ticket: Omit<Ticket, "id" | "createdAt" | "updatedAt" | "status">) => void;
  updateTicketStatus: (id: string, status: Status) => void;
  toggleRole: () => void;
  setTickets: (tickets: Ticket[]) => void;
  addActivity: (ticketId: string, message: string) => void;
}

export const useTicketStore = create<TicketStore>()(
  persist(
    (set, get) => ({
      currentUserRole: "Agent",
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
        },
        {
          id: "2",
          title: "Laptop screen shattered",
          description: "Dropped my laptop, screen is broken.",
          priority: "Urgent",
          category: "Hardware",
          status: "New",
          createdBy: "user2",
          dueDate: new Date(Date.now() + 3600000).toISOString(), // Due in 1 hour
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
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
        },
      ],
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
            t.id === id ? { ...t, status, updatedAt: new Date().toISOString() } : t
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
      toggleRole: () =>
        set((state) => ({
          currentUserRole: state.currentUserRole === "Agent" ? "End User" : "Agent",
        })),
      setTickets: (tickets) => set(() => ({ tickets })),
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
    }
  )
);
