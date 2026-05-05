/**
 * ============================================================================
 * REPORTS API ROUTE - Generate Reports for Administrators
 * ============================================================================
 *
 * This endpoint allows Administrators to generate reports with date range filters.
 * Reports include all ticket information with user details.
 *
 * @module /api/reports/route
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import fs from "fs";
import path from "path";

const ticketsPath = path.join(process.cwd(), "src/data/tickets.json");
const usersPath = path.join(process.cwd(), "src/data/users.json");
const sessionsPath = path.join(process.cwd(), "src/data/sessions.json");

/**
 * Session interface for authentication
 */
interface Session {
  userId: string;
  email: string;
  name: string;
  role: string;
  department: string;
  token: string;
  expiresAt: string;
}

/**
 * User interface
 */
interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  department: string;
}

/**
 * Ticket interface
 */
interface Ticket {
  id: string;
  title: string;
  description: string;
  priority: string;
  category: string;
  status: string;
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
 * Reads sessions from sessions.json
 */
function getSessions(): Record<string, Session> {
  try {
    const data = fs.readFileSync(sessionsPath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

/**
 * Reads tickets from tickets.json
 */
function getTickets(): Ticket[] {
  try {
    const data = fs.readFileSync(ticketsPath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

/**
 * Reads users from users.json
 */
function getUsers(): User[] {
  try {
    const data = fs.readFileSync(usersPath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

/**
 * Authenticates request and verifies Admin role
 *
 * @returns User info if authenticated as Admin, null otherwise
 */
function getAuthUser(
  req: NextRequest,
): { role: string; userId: string; email: string } | null {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) return null;

  const sessions = getSessions();
  const session = sessions[token];

  if (!session || new Date(session.expiresAt) < new Date()) {
    return null;
  }

  return {
    role: session.role,
    userId: session.userId,
    email: session.email,
  };
}

/**
 * GET /api/reports - Generate report with date range (Admin only)
 *
 * Query params:
 * - from: Start date (ISO string)
 * - to: End date (ISO string)
 *
 * Returns all tickets with user information within the date range
 */
export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);

  // Only Administrators can generate reports
  if (!auth || auth.role !== "Administrator") {
    return new NextResponse("Forbidden - Admin only", { status: 403 });
  }

  // Get query parameters
  const url = new URL(req.url);
  const fromDate = url.searchParams.get("from");
  const toDate = url.searchParams.get("to");

  // Get all data
  const tickets = getTickets();
  const users = getUsers();

  // Create user lookup map
  const userMap = new Map<string, User>();
  users.forEach((user) => {
    userMap.set(user.email, user);
  });

  // Filter tickets by date range if provided
  let filteredTickets = tickets;
  if (fromDate || toDate) {
    const from = fromDate ? new Date(fromDate) : new Date(0);
    const to = toDate ? new Date(toDate) : new Date(8640000000000000); // Max date

    filteredTickets = tickets.filter((ticket) => {
      const createdDate = new Date(ticket.createdAt);
      return createdDate >= from && createdDate <= to;
    });
  }

  // Enrich tickets with user information
  const enrichedTickets = filteredTickets.map((ticket) => {
    const user = userMap.get(ticket.createdBy) || {
      id: "unknown",
      email: ticket.createdBy,
      name: "Unknown User",
      role: "Unknown",
      department: "Unknown",
    };

    return {
      ...ticket,
      userInfo: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department,
      },
    };
  });

  // Generate summary statistics
  const summary = {
    totalTickets: enrichedTickets.length,
    byStatus: {} as Record<string, number>,
    byPriority: {} as Record<string, number>,
    byCategory: {} as Record<string, number>,
    byDepartment: {} as Record<string, number>,
  };

  enrichedTickets.forEach((ticket) => {
    summary.byStatus[ticket.status] =
      (summary.byStatus[ticket.status] || 0) + 1;
    summary.byPriority[ticket.priority] =
      (summary.byPriority[ticket.priority] || 0) + 1;
    summary.byCategory[ticket.category] =
      (summary.byCategory[ticket.category] || 0) + 1;
    summary.byDepartment[ticket.department] =
      (summary.byDepartment[ticket.department] || 0) + 1;
  });

  return NextResponse.json({
    tickets: enrichedTickets,
    summary,
    generatedAt: new Date().toISOString(),
    dateRange: {
      from: fromDate || "all",
      to: toDate || "all",
    },
  });
}
