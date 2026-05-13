/**
 * ============================================================================
 * ZUSTAND STORE - Central State Management for the Application
 * ============================================================================
 *
 * This file defines the global state of the application using Zustand.
 * Think of this as a "global variable" that any component can access.
 *
 * WHAT IS ZUSTAND?
 * - Zustand is a small, fast state management library for React
 * - It's simpler than Redux but works similarly
 * - State lives in a "store" that any component can read or modify
 *
 * WHAT IS PERSIST?
 * - The persist middleware saves state to localStorage
 * - When user refreshes the page, state is restored from localStorage
 * - This means logged-in users stay logged in across page refreshes
 *
 * BEGINNER NOTES:
 * - "State" = data that changes over time (tickets, user info, etc.)
 * - "Actions" = functions that modify state (login, addTicket, etc.)
 * - React components "subscribe" to parts of state they need
 * - When state changes, React automatically re-renders the UI
 *
 * @module /lib/store
 */

// Zustand core - create is the main function to make a store
import { create } from "zustand";

// Persist middleware - saves state to localStorage and restores it on load
import { persist } from "zustand/middleware";

/**
 * Priority levels for tickets
 * Used to indicate how urgent a ticket is
 */
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

/**
 * Categories help classify tickets by type
 * Makes it easier to filter and route tickets
 */
export type Category = "HARDWARE" | "SOFTWARE" | "NETWORK" | "ACCESS";

/**
 * Status represents the current state of a ticket
 * Tickets typically flow: New → In Progress → Resolved → Closed
 */
export type Status =
  | "NEW"
  | "IN_PROGRESS"
  | "PENDING_VENDOR"
  | "RESOLVED"
  | "CLOSED";

/**
 * User roles determine permissions
 * - End User: Can create and view their own tickets
 * - Agent: Can view all tickets and update status
 * - Administrator: Full access including delete
 */
export type Role = "END_USER" | "AGENT" | "ADMINISTRATOR";

/**
 * View types for navigation
 * Determines which page/section is currently shown
 */
export type View =
  | "Dashboard"
  | "Tickets"
  | "Customers"
  | "Reports"
  | "Backup"
  | "Settings";

/**
 * User object represents a logged-in user
 *
 * @interface User
 * @property {string} id - Unique identifier
 * @property {string} email - User's email (used for login)
 * @property {string} name - Display name
 * @property {Role} role - User's permission level
 * @property {string} department - User's department
 */
export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  department: string;
  hostname?: string;
  laptopSerial?: string;
  mustChangePassword?: boolean;
}

/**
 * Ticket object represents an IT support ticket
 *
 * @interface Ticket
 * @property {string} id - Unique identifier (generated with uuid)
 * @property {string} title - Brief summary of the issue
 * @property {string} description - Detailed description
 * @property {Priority} priority - Urgency level
 * @property {Category} category - Type of issue
 * @property {Status} status - Current state
 * @property {string} createdBy - Email of user who created ticket
 * @property {string} [assignedTo] - Email of agent handling ticket
 * @property {string} dueDate - When ticket should be resolved by
 * @property {string} createdAt - Timestamp when created
 * @property {string} updatedAt - Timestamp of last update
 * @property {string} username - Username of person who reported
 * @property {string} hostname - Computer/device name
 * @property {string} laptopSerial - Serial number of device
 * @property {string} department - Department of the reporter
 */
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

/**
 * Activity represents a logged event in the system
 * Used for the activity feed/timeline
 *
 * @interface Activity
 * @property {string} id - Unique identifier
 * @property {string} ticketId - ID of related ticket
 * @property {string} message - Description of what happened
 * @property {string} timestamp - When it happened
 */
export interface Activity {
  id: string;
  ticketId: string;
  message: string;
  timestamp: string;
}

/**
 * Main store interface defining all state and actions
 *
 * This interface defines the SHAPE of our state store.
 * It tells TypeScript what data and functions our store has.
 *
 * WHAT IS IN THE STORE?
 * - Auth state: currentUser, isAuthenticated, authToken
 * - App state: tickets, activities, currentUserRole, currentView
 * - Actions: login(), logout(), addTicket(), updateTicketStatus(), etc.
 *
 * @interface TicketStore
 */
interface TicketStore {
  // ========================================
  // AUTHENTICATION STATE
  // ========================================
  // These track whether a user is logged in and who they are

  /** Currently logged-in user object, or null if not logged in */
  currentUser: User | null;

  /** Boolean flag indicating if user is authenticated */
  isAuthenticated: boolean;

  /** Session token for API authentication */
  authToken: string | null;

  // ========================================
  // APPLICATION STATE
  // ========================================
  // Core data that the app operates on

  /** Array of all tickets in the system */
  tickets: Ticket[];

  /** Activity log for the feed/timeline */
  activities: Activity[];

/** Current user's role - determines UI permissions */
   currentUserRole: Role;

   /** Currently active view/page */
   currentView: View;

   /** All users in the system (for agent assignment) */
   allUsers: User[];

  // ========================================
  // AUTHENTICATION ACTIONS
  // ========================================
  // Functions that modify auth state

/**
    * Attempts to log in with email and password
    * @param email - User's email address
    * @param password - User's password
    * @param provider - Authentication provider (local or ldap)
    * @returns Promise with success status and optional error message
    */
   login: (
     email: string,
     password: string,
     provider?: "local" | "ldap",
   ) => Promise<{ success: boolean; error?: string }>;

   /** Logs out current user and clears session */
   logout: () => void;

   /**
    * Checks if current auth token is still valid
    * @returns Promise with true if valid, false otherwise
    */
checkAuth: () => Promise<boolean>;

   // ========================================
  // TICKET ACTIONS
  // ========================================
  // Functions that modify ticket state

  /**
   * Adds a new ticket to the system
   * @param ticket - Ticket data without id, timestamps, or status
   *
   * NOTE: Omit<> is a TypeScript utility type that removes specified properties
   * We omit id, createdAt, updatedAt, status because these are auto-generated
   */
  addTicket: (
    ticket: Omit<Ticket, "id" | "createdAt" | "updatedAt" | "status">,
  ) => void;

/**
    * Updates the status of an existing ticket
    * @param id - ID of ticket to update
    * @param status - New status value
    */
   updateTicketStatus: (id: string, status: Status) => Promise<void>;

  /** Cycles through roles (used for demo/testing) */
  toggleRole: () => void;

  /** Sets the current user role directly */
  setRole: (role: Role) => void;

/** Deletes a ticket by ID (admin only, calls API) */
   deleteTicket: (id: string) => Promise<boolean>;

   /** Refreshes tickets from API to ensure state is synced */
   refreshTickets: () => Promise<void>;

   /** Bulk deletes multiple tickets by IDs */
   deleteTickets: (ids: string[]) => Promise<void>;

   /** Bulk updates status for multiple tickets */
   updateTicketsStatus: (ids: string[], status: Status) => Promise<void>;

   /** Replaces all tickets with a new array (used for API sync) */
  setTickets: (tickets: Ticket[]) => void;

/** Changes the current view/page */
   setView: (view: View) => void;

   /**
    * Logs a new activity event
    * @param ticketId - ID of related ticket
    * @param message - Description of what happened
    */
   addActivity: (ticketId: string, message: string) => void;

   /** Sets all users in the system */
   setAllUsers: (users: User[]) => void;
}

/**
 * Zustand store creation with persistence
 *
 * HOW THE STORE WORKS:
 * 1. create<TicketStore>() - Creates a typed store
 * 2. persist() - Wraps the store to save to localStorage
 * 3. (set, get) => { ... } - The actual store implementation
 *
 * PERSIST OPTIONS:
 * - name: 'ticket-storage' - localStorage key
 * - State is automatically saved when it changes
 * - State is restored when page loads
 */
export const useTicketStore = create<TicketStore>()(
  persist(
    (set, get) => ({
      // ========================================
      // INITIAL STATE VALUES
      // ========================================
      // These are the default values when the app starts

      // Auth state - starts as logged out
      currentUser: null,
      isAuthenticated: false,
      authToken: null,

      // App state - default values
      currentUserRole: "AGENT", // Default role for demo
      currentView: "Dashboard", // Start at dashboard

tickets: [],

        activities: [],

        allUsers: [],

      // ========================================
      // LOGIN ACTION
      // ========================================
/**
        * login - Authenticates user with email and password
        *
        * WHAT IT DOES:
        * 1. Calls the /api/auth/login endpoint
        * 2. On success, stores user data and token in state
        * 3. Returns success or error message
        *
        * @param email - User's email address
        * @param password - User's password
        * @param provider - Authentication provider (local or ldap)
        * @returns Promise<{ success: boolean, error?: string }>
        */
      login: async (email, password, provider = "local") => {
        try {
          // Call the login API endpoint
          const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, provider }),
          });

          // Parse the JSON response
          const data = await res.json();

          // Check if login was successful (HTTP 200-299)
          if (!res.ok) {
            return { success: false, error: data.error || "Login failed" };
          }

          // Update state with user data and token
          // set() updates the store state - React will re-render components
          set({
            currentUser: data.user,
            authToken: data.token,
            isAuthenticated: true,
            currentUserRole: data.user.role,
          });

          return { success: true };
        } catch {
          // Network error or server unreachable
          return { success: false, error: "Network error. Please try again." };
        }
      },

      // ========================================
      // LOGOUT ACTION
      // ========================================
      /**
       * logout - Logs out the current user
       *
       * WHAT IT DOES:
       * 1. Calls the /api/auth/login DELETE endpoint to invalidate session
       * 2. Clears all auth-related state
       * 3. Resets role to default
       *
       * NOTE: We ignore errors on logout - even if the API call fails,
       * we still want to clear the local state
       */
      logout: async () => {
        const { authToken } = get();
        if (authToken) {
          try {
            // Call logout API to invalidate session on server
            await fetch("/api/auth/login", {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${authToken}`,
                "Content-Type": "application/json",
              },
            });
          } catch {
            // Ignore errors - we still want to clear local state
          }
        }

        // Clear all auth state - this will trigger UI to show logged-out state
        set({
          currentUser: null,
          authToken: null,
          isAuthenticated: false,
          currentUserRole: "END_USER", // Reset to default role
        });
      },

      // ========================================
      // CHECK AUTH ACTION
      // ========================================
      /**
       * checkAuth - Validates the current session token
       *
       * WHAT IT DOES:
       * 1. If no token exists, returns false immediately
       * 2. Calls GET /api/auth/login to validate token
       * 3. If valid, updates state with user info
       * 4. If invalid/expired, clears auth state
       *
       * USE CASE: Called on app load to restore login state
       *
       * @returns Promise<boolean> - true if valid, false otherwise
       */
      checkAuth: async () => {
        const { authToken } = get();
        if (!authToken) return false;

        try {
          // Call API to verify token is still valid
          const res = await fetch("/api/auth/login", {
            method: "GET",
            headers: {
              Authorization: `Bearer ${authToken}`,
              "Content-Type": "application/json",
            },
          });

          const data = await res.json();

          if (data.authenticated) {
            // Token is valid - update state with user info
            set({
              currentUser: data.user,
              isAuthenticated: true,
              currentUserRole: data.user.role,
            });
            return true;
          }

          set({
            currentUser: null,
            authToken: null,
            isAuthenticated: false,
          });
          return false;
        } catch {
          return false;
        }
      },

// ========================================
       // ADD TICKET ACTION
       // ========================================
       /**
        * addTicket - Creates a new ticket
        *
        * WHAT IT DOES:
        * 1. Generates a unique ID for the ticket
        * 2. Creates a ticket object with timestamps
        * 3. Adds it to the beginning of the tickets array
        * 4. Logs an activity for the ticket submission
        *
        * @param ticketData - Ticket data without id, timestamps, or status
        */
       addTicket: (ticketData) => {
         const now = new Date().toISOString();
         const id = (ticketData as Record<string, unknown>).id as string || Math.random().toString(36).substring(2, 9);

         const newTicket: Ticket = {
           ...ticketData,
           id,
           status: ((ticketData as Record<string, unknown>).status as Status) || ("NEW" as Status),
           createdAt: ((ticketData as Record<string, unknown>).createdAt as string) || now,
           updatedAt: ((ticketData as Record<string, unknown>).updatedAt as string) || now,
         };

         set((state) => ({
           tickets: [newTicket, ...state.tickets],
           activities: [
             {
               id: Math.random().toString(36).substring(2, 9),
               ticketId: id,
               message: `Ticket "${ticketData.title}" submitted`,
               timestamp: now,
             },
             ...state.activities,
           ],
         }));
       },

      // ========================================
      // UPDATE TICKET STATUS ACTION
      // ========================================
      /**
       * updateTicketStatus - Updates the status of an existing ticket
       *
       * WHAT IT DOES:
       * 1. Finds the ticket by ID
       * 2. Updates its status and updatedAt timestamp
       * 3. Logs the status change as an activity
       *
       * @param id - ID of ticket to update
       * @param status - New status value
       */
updateTicketStatus: async (id, status) => {
           const { authToken, tickets } = get();
           const ticket = tickets.find(t => t.id === id);
           const ticketLabel = ticket ? `${ticket.id} (${ticket.title})` : id;
           
           // Optimistically update local state
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
                 message: `Ticket ${ticketLabel} status changed to ${status}`,
                 timestamp: new Date().toISOString(),
               },
               ...state.activities,
             ],
           }));

           // Persist to server
           try {
             const res = await fetch("/api/tickets", {
               method: "PATCH",
               headers: {
                 "Content-Type": "application/json",
                 Authorization: `Bearer ${authToken}`,
               },
               body: JSON.stringify({ id, status }),
             });
             if (!res.ok) {
               console.error("Failed to update ticket status:", res.status);
             }
           } catch (error) {
             console.error("Error updating ticket status:", error);
           }
         },

      // ========================================
      // TOGGLE ROLE ACTION
      // ========================================
      /**
       * toggleRole - Cycles through roles (for demo/testing)
       *
       * WHAT IT DOES:
       * - Cycles: Agent → End User → Administrator → Agent
       *
       * NOTE: This is for demo purposes only!
       * In production, role changes should require proper authorization.
       */
      toggleRole: () =>
        set((state) => ({
          currentUserRole:
            state.currentUserRole === "AGENT"
              ? "END_USER"
              : state.currentUserRole === "END_USER"
                ? "ADMINISTRATOR"
                : "AGENT",
        })),

      // ========================================
      // SET ROLE ACTION
      // ========================================
      /**
       * setRole - Directly sets the current user role
       * @param role - The role to set
       */
      setRole: (role) => set(() => ({ currentUserRole: role })),

      // ========================================
      // DELETE TICKET ACTION
      // ========================================
      /**
       * deleteTicket - Deletes a ticket via API and removes it from local state
       * @param id - ID of ticket to delete
       * @returns Promise<boolean> - true if deleted, false otherwise
       */
deleteTicket: async (id) => {
        const { authToken, tickets } = get();
        const ticket = tickets.find((t) => t.id === id);
        const ticketTitle = ticket?.title || id;
        console.log("[STORE deleteTicket] Attempting to delete ticket:", id, "with token:", authToken ? "present" : "missing");
        try {
          const res = await fetch("/api/tickets", {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({ id }),
          });
          console.log("[STORE deleteTicket] Response status:", res.status, "ok:", res.ok);
          if (!res.ok && res.status !== 404) {
            console.error("[STORE deleteTicket] Failed with status:", res.status);
            return false;
          }
          set((state) => ({
            tickets: state.tickets.filter((t) => t.id !== id),
            activities: [
              {
                id: Math.random().toString(36).substring(2, 9),
                ticketId: id,
                message: `Ticket "${ticketTitle}" deleted`,
                timestamp: new Date().toISOString(),
              },
              ...state.activities,
            ],
          }));
          console.log("[STORE deleteTicket] Successfully removed ticket from state");
          const { refreshTickets } = get();
          await refreshTickets();
          return true;
        } catch (error) {
          console.error("[STORE deleteTicket] Exception:", error);
          return false;
        }
      },

      refreshTickets: async () => {
        const { authToken } = get();
        if (!authToken) return;
        try {
          const res = await fetch("/api/tickets", {
            headers: { Authorization: `Bearer ${authToken}` },
          });
          if (res.ok) {
            const data = await res.json();
            set({ tickets: data });
          }
        } catch (error) {
          console.error("[STORE refreshTickets] Failed:", error);
        }
      },

      // ========================================
      // DELETE TICKETS ACTION (Bulk)
      // ========================================
      /**
       * deleteTickets - Bulk deletes multiple tickets via API
       * @param ids - Array of ticket IDs to delete
       */
      deleteTickets: async (ids) => {
        const { authToken } = get();
        for (const id of ids) {
          try {
            await fetch("/api/tickets", {
              method: "DELETE",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${authToken}`,
              },
              body: JSON.stringify({ id }),
            });
          } catch (error) {
            console.error("[STORE deleteTickets] Failed for", id, error);
          }
        }
        set((state) => ({
          tickets: state.tickets.filter((t) => !ids.includes(t.id)),
          activities: [
            {
              id: Math.random().toString(36).substring(2, 9),
              ticketId: ids[0] || "bulk",
              message: `Bulk deleted ${ids.length} ticket(s)`,
              timestamp: new Date().toISOString(),
            },
            ...state.activities,
          ],
        }));
      },

      // ========================================
      // UPDATE TICKETS STATUS ACTION (Bulk)
      // ========================================
      /**
       * updateTicketsStatus - Bulk updates status for multiple tickets
       * @param ids - Array of ticket IDs
       * @param status - New status value
       */
      updateTicketsStatus: async (ids, status) => {
        const { authToken } = get();
        for (const id of ids) {
          try {
            await fetch("/api/tickets", {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${authToken}`,
              },
              body: JSON.stringify({ id, status }),
            });
          } catch (error) {
            console.error("[STORE updateTicketsStatus] Failed for", id, error);
          }
        }
        set((state) => ({
          tickets: state.tickets.map((t) =>
            ids.includes(t.id)
              ? { ...t, status, updatedAt: new Date().toISOString() }
              : t
          ),
          activities: [
            {
              id: Math.random().toString(36).substring(2, 9),
              ticketId: ids[0] || "bulk",
              message: `Bulk updated ${ids.length} ticket(s) to ${status}`,
              timestamp: new Date().toISOString(),
            },
            ...state.activities,
          ],
        }));
      },

      // ========================================
      // SET TICKETS ACTION
      // ========================================
      /**
       * setTickets - Replaces all tickets (used when syncing with API)
       * @param tickets - New array of tickets
       */
      setTickets: (tickets) => set(() => ({ tickets })),

      // ========================================
      // SET VIEW ACTION
      // ========================================
      /**
       * setView - Changes the current page/view
       * @param view - The view to navigate to
       */
      setView: (view) => set(() => ({ currentView: view })),

      // ========================================
      // ADD ACTIVITY ACTION
      // ========================================
      /**
       * addActivity - Logs a new activity event
       *
       * WHAT IT DOES:
       * 1. Creates a new activity with unique ID
       * 2. Adds it to beginning of activities array
       *
       * @param ticketId - ID of related ticket
       * @param message - Description of the event
       */
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
       // ========================================
       // SET ALL USERS ACTION
       // ========================================
       setAllUsers: (users) => set(() => ({ allUsers: users })),
     }),
    // Persist configuration - state will be saved to localStorage
    {
      name: "ticket-storage-v2",
partialize: (state) => ({
         currentUser: state.currentUser,
         isAuthenticated: state.isAuthenticated,
         authToken: state.authToken,
         currentUserRole: state.currentUserRole,
         currentView: state.currentView,
         activities: state.activities,
       }),
    },
  ),
);
