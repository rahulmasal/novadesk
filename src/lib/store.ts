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

// UUID generates unique IDs for tickets and activities
import { v4 as uuidv4 } from "uuid";

/**
 * Priority levels for tickets
 * Used to indicate how urgent a ticket is
 */
export type Priority = "Low" | "Medium" | "High" | "Urgent";

/**
 * Categories help classify tickets by type
 * Makes it easier to filter and route tickets
 */
export type Category = "Hardware" | "Software" | "Network" | "Access";

/**
 * Status represents the current state of a ticket
 * Tickets typically flow: New → In Progress → Resolved → Closed
 */
export type Status =
  | "New"
  | "In Progress"
  | "Pending Vendor"
  | "Resolved"
  | "Closed";

/**
 * User roles determine permissions
 * - End User: Can create and view their own tickets
 * - Agent: Can view all tickets and update status
 * - Administrator: Full access including delete
 */
export type Role = "End User" | "Agent" | "Administrator";

/**
 * View types for navigation
 * Determines which page/section is currently shown
 */
export type View = "Dashboard" | "Tickets" | "Customers" | "Settings";

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

  // ========================================
  // AUTHENTICATION ACTIONS
  // ========================================
  // Functions that modify auth state

  /**
   * Attempts to log in with email and password
   * @param email - User's email address
   * @param password - User's password
   * @returns Promise with success status and optional error message
   */
  login: (
    email: string,
    password: string,
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
  updateTicketStatus: (id: string, status: Status) => void;

  /** Cycles through roles (used for demo/testing) */
  toggleRole: () => void;

  /** Sets the current user role directly */
  setRole: (role: Role) => void;

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
      currentUserRole: "Agent", // Default role for demo
      currentView: "Dashboard", // Start at dashboard

      // Sample tickets for demonstration
      // In production, these would come from a database
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

      // Sample activities for demonstration
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
       * @returns Promise<{ success: boolean, error?: string }>
       */
      login: async (email, password) => {
        try {
          // Call the login API endpoint
          const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
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
        } catch (error) {
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
          } catch (e) {
            // Ignore errors - we still want to clear local state
          }
        }

        // Clear all auth state - this will trigger UI to show logged-out state
        set({
          currentUser: null,
          authToken: null,
          isAuthenticated: false,
          currentUserRole: "End User", // Reset to default role
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
        } catch (error) {
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
        // Generate unique ID using random string
        const id = Math.random().toString(36).substring(2, 9);
        const now = new Date().toISOString();

        // Create new ticket with auto-generated fields
        const newTicket: Ticket = {
          ...ticketData,
          id,
          status: "New", // New tickets always start with "New" status
          createdAt: now,
          updatedAt: now,
        };

        // Update state using functional set - important when new state depends on old state
        set((state) => ({
          // Add new ticket to beginning of array (newest first)
          tickets: [newTicket, ...state.tickets],
          // Also log this activity for the feed
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
      updateTicketStatus: (id, status) => {
        set((state) => ({
          // map() creates a new array with the updated ticket
          tickets: state.tickets.map((t) =>
            t.id === id
              ? { ...t, status, updatedAt: new Date().toISOString() }
              : t,
          ),
          // Log the status change
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
            state.currentUserRole === "Agent"
              ? "End User"
              : state.currentUserRole === "End User"
                ? "Administrator"
                : "Agent",
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
    }),
    // Persist configuration - state will be saved to localStorage
    {
      name: "ticket-storage", // localStorage key
    },
  ),
);
