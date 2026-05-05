/**
 * ============================================================================
 * TICKETS API ROUTE - Main CRUD Operations for IT Support Tickets
 * ============================================================================
 *
 * This file handles all ticket-related HTTP requests:
 * - GET    : Retrieve tickets (filtered by user role)
 * - POST   : Create a new ticket
 * - PATCH  : Update ticket status (Agents/Admins only)
 * - DELETE : Remove a ticket (Admins only)
 *
 * BEGINNER NOTES:
 * - NextResponse is Next.js way of sending HTTP responses (like res.send() in Express)
 * - Bearer tokens are used for authentication - the token is sent in Authorization header
 * - fs (filesystem) module is used here because we're storing data in local JSON files
 *   In production, you would typically use a database like PostgreSQL or MongoDB
 *
 * @module /api/tickets/route
 */

// Import Next.js utilities for handling HTTP requests and responses
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// uuid generates unique IDs for each ticket
import { v4 as uuidv4 } from "uuid";

// fs = filesystem module - allows reading/writing files on the server
import fs from "fs";

// path module helps construct file paths that work across different operating systems
import path from "path";

/**
 * File paths where ticket and session data are stored
 * process.cwd() returns the current working directory of the Node.js process
 * This ensures paths work regardless of where the project is installed
 */
const ticketsPath = path.join(process.cwd(), "src/data/tickets.json");
const sessionsPath = path.join(process.cwd(), "src/data/sessions.json");

/**
 * Session interface represents an authenticated user's session
 * Sessions track who's logged in and their permissions
 *
 * @interface Session
 * @property {string} userId - Unique identifier for the user
 * @property {string} email - User's email address (used for login)
 * @property {string} name - User's display name
 * @property {string} role - User's role: "Administrator", "Agent", or "End User"
 * @property {string} department - User's department (e.g., "IT", "Marketing")
 * @property {string} token - Unique session token (like a temporary password)
 * @property {string} expiresAt - When this session expires (ISO date string)
 */
interface Session {
  userId: string;
  email: string;
  name: string;
  role: "Administrator" | "Agent" | "End User";
  department: string;
  token: string;
  expiresAt: string;
}

/**
 * Reads and returns all active sessions from the sessions.json file
 *
 * WHAT IT DOES:
 * - Opens the sessions.json file
 * - Parses the JSON data into a JavaScript object
 * - Returns an empty object if file doesn't exist or is invalid
 *
 * BEGINNER NOTES:
 * - JSON.parse() converts a JSON string into a JavaScript object
 * - try/catch handles errors gracefully - if file doesn't exist, we return {}
 * - This is called frequently, so sessions are kept in memory during runtime
 *
 * @returns {Record<string, Session>} Object mapping session tokens to session data
 */
function getSessions(): Record<string, Session> {
  try {
    // ReadFileSync reads the entire file synchronously (blocks until done)
    // In production with many users, you'd use async fs.promises.readFile()
    const data = fs.readFileSync(sessionsPath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist or is corrupted, return empty sessions object
    return {};
  }
}

/**
 * Reads and returns all tickets from the tickets.json file
 *
 * WHAT IT DOES:
 * - Opens the tickets.json file
 * - Parses the JSON data into a JavaScript array
 * - Returns an empty array if file doesn't exist
 *
 * @returns {any[]} Array of ticket objects
 */
function getTickets() {
  try {
    const data = fs.readFileSync(ticketsPath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

/**
 * Saves the entire tickets array back to the JSON file
 *
 * WHAT IT DOES:
 * - Takes an array of tickets
 * - Converts it to a formatted JSON string (with indentation)
 * - Writes it back to the file, replacing existing content
 *
 * BEGINNER NOTES:
 * - JSON.stringify(tickets, null, 2) formats the output with 2-space indentation
 *   This makes the JSON file human-readable for debugging
 * - writeFileSync blocks until the write is complete
 * - In production, you'd use a database with proper ACID transactions
 *
 * @param {any[]} tickets - Array of ticket objects to save
 */
function saveTickets(tickets: any[]) {
  fs.writeFileSync(ticketsPath, JSON.stringify(tickets, null, 2), "utf8");
}

/**
 * Authenticates the request by checking the Bearer token in the Authorization header
 *
 * HOW IT WORKS:
 * 1. Extracts the token from "Bearer <token>" format in the Authorization header
 * 2. Looks up the token in our sessions data
 * 3. Checks if the session has expired
 * 4. Returns the user's role and ID if valid, null if not
 *
 * BEGINNER NOTES:
 * - Bearer tokens are a simple authentication scheme
 * - The token is like a temporary password that proves the user is logged in
 * - Sessions expire for security - users must re-login after 24 hours
 * - In production, use JWT tokens or proper OAuth for better security
 *
 * @param {NextRequest} req - The incoming HTTP request containing headers
 * @returns {Object|null} User info (role, userId, email) if authenticated, null otherwise
 */
function getAuthUser(
  req: NextRequest,
): { role: string; userId: string; email: string } | null {
  // Get the Authorization header from the request
  const authHeader = req.headers.get("authorization");

  // Remove "Bearer " prefix to get just the token
  const token = authHeader?.replace("Bearer ", "");

  // No token = not authenticated
  if (!token) return null;

  // Look up this token in our sessions
  const sessions = getSessions();
  const session = sessions[token];

  // Token doesn't exist or session expired
  // new Date(session.expiresAt) converts the expiry string to a Date object
  if (!session || new Date(session.expiresAt) < new Date()) {
    return null;
  }

  // Return user info from the valid session
  return {
    role: session.role,
    userId: session.userId,
    email: session.email,
  };
}

/**
 * GET /api/tickets - Retrieve tickets
 *
 * WHAT IT DOES:
 * - Returns all tickets for Agents and Administrators
 * - Returns only the user's own tickets for End Users
 *
 * SECURITY:
 * - End Users can ONLY see tickets they created
 * - Agents and Admins can see ALL tickets
 *
 * @param {NextRequest} req - The incoming request (used to get auth token)
 * @returns {NextResponse} JSON array of tickets
 */
export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  const tickets = getTickets();

  // End users can only see their own tickets
  if (auth?.role === "End User") {
    const filteredTickets = tickets.filter(
      (t: any) => t.createdBy === auth.email || t.username === auth.email,
    );
    return NextResponse.json(filteredTickets);
  }

  return NextResponse.json(tickets);
}

/**
 * POST /api/tickets - Create a new ticket
 *
 * WHAT IT DOES:
 * - Validates required fields (title, description, priority, category, dueDate)
 * - Creates a new ticket with a unique ID
 * - Saves it to the tickets array
 * - Returns the newly created ticket
 *
 * SECURITY:
 * - Any authenticated user can create tickets
 * - The ticket is automatically associated with the creating user's email
 *
 * @param {NextRequest} req - Request body contains ticket data
 * @returns {NextResponse} The newly created ticket with 201 status
 */
export async function POST(req: NextRequest) {
  // Step 1: Authenticate the user
  const auth = getAuthUser(req);

  // Reject unauthenticated requests with 401 Unauthorized
  if (!auth) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Step 2: Parse the request body (ticket data from frontend)
  const data = await req.json();

  // Step 3: Validate required fields
  // If any required field is missing, return a 400 Bad Request error
  // This prevents incomplete tickets from being created
  const required = ["title", "description", "priority", "category", "dueDate"];
  for (const field of required) {
    if (!data[field]) {
      return new NextResponse(`Missing field: ${field}`, { status: 400 });
    }
  }

  // Step 4: Create the new ticket object
  // ...data spreads all properties from the submitted data
  // We then override specific properties with server-generated values
  const now = new Date().toISOString(); // Current timestamp in ISO format
  const newTicket = {
    ...data,
    id: uuidv4(), // Generate unique ID using uuid library
    status: "New", // New tickets start with "New" status
    createdBy: auth.email, // Track who created this ticket
    createdAt: now, // Server-side timestamp
    updatedAt: now, // Same initially, updated when modified
  };

  // Step 5: Save to storage
  const tickets = getTickets();
  tickets.unshift(newTicket); // Add to beginning of array (newest first)
  saveTickets(tickets);

  // Step 6: Return the created ticket with 201 Created status
  return NextResponse.json(newTicket, { status: 201 });
}

/**
 * PATCH /api/tickets - Update ticket status
 *
 * WHAT IT DOES:
 * - Updates the status field of an existing ticket
 * - Updates the updatedAt timestamp
 *
 * SECURITY:
 * - Only Agents and Administrators can update tickets
 * - End Users cannot modify tickets (they can only create and view)
 *
 * COMMON STATUS VALUES:
 * - "New" → "In Progress" → "Pending Vendor" → "Resolved" → "Closed"
 *
 * @param {NextRequest} req - Request body contains { id, status }
 * @returns {NextResponse} Updated ticket object
 */
export async function PATCH(req: NextRequest) {
  // Step 1: Authenticate and authorize
  const auth = getAuthUser(req);

  // Only Agents and Administrators can update tickets
  // 403 Forbidden = authenticated but not allowed to perform this action
  if (!auth || (auth.role !== "Agent" && auth.role !== "Administrator")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // Step 2: Parse the request body
  const { id, status } = await req.json();

  // Step 3: Find the ticket to update
  const tickets = getTickets();
  const index = tickets.findIndex((t: any) => t.id === id);

  // 404 Not Found = ticket with this ID doesn't exist
  if (index === -1) {
    return new NextResponse("Ticket not found", { status: 404 });
  }

  // Step 4: Update the ticket
  // ...tickets[index] keeps all existing properties
  // We override status and updatedAt with new values
  tickets[index] = {
    ...tickets[index],
    status,
    updatedAt: new Date().toISOString(),
  };

  // Step 5: Save changes
  saveTickets(tickets);

  // Step 6: Return the updated ticket
  return NextResponse.json(tickets[index]);
}

/**
 * DELETE /api/tickets - Remove a ticket
 *
 * WHAT IT DOES:
 * - Permanently removes a ticket from the system
 *
 * SECURITY:
 * - ONLY Administrators can delete tickets
 * - This is the most destructive operation, hence restricted to admins only
 *
 * BEGINNER NOTES:
 * - DELETE operations should be used sparingly
 * - In many systems, tickets are "soft deleted" (marked as deleted) instead
 * - Soft delete preserves audit trail and historical data
 *
 * @param {NextRequest} req - Request body contains { id } of ticket to delete
 * @returns {NextResponse} Empty response with 204 No Content status
 */
export async function DELETE(req: NextRequest) {
  // Step 1: Authenticate and verify admin role
  const auth = getAuthUser(req);

  // Only Administrators can delete - this prevents accidental data loss
  if (!auth || auth.role !== "Administrator") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // Step 2: Get the ticket ID from request
  const { id } = await req.json();

  // Step 3: Remove the ticket with matching ID
  // filter() creates a NEW array excluding the ticket we want to delete
  // This is immutable pattern - we don't modify the original array
  let tickets = getTickets();
  tickets = tickets.filter((t: any) => t.id !== id);

  // Step 4: Save the updated array (without the deleted ticket)
  saveTickets(tickets);

  // Step 5: Return 204 No Content (successful deletion, no body to return)
  return new NextResponse("Deleted", { status: 204 });
}
