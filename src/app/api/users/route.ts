/**
 * ============================================================================
 * USERS API ROUTE - User Management for Administrators
 * ============================================================================
 *
 * This file handles all user-related HTTP requests (Admin only):
 * - GET    : List all users (Admin only)
 * - POST   : Create a new user (Admin only)
 * - PATCH  : Update user role/department (Admin only)
 * - DELETE : Remove a user (Admin only)
 *
 * IMPORTANT: All endpoints require Administrator role!
 *
 * @module /api/users/route
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

// Path to users data file
const usersPath = path.join(process.cwd(), "src/data/users.json");
const sessionsPath = path.join(process.cwd(), "src/data/sessions.json");

/**
 * User interface representing a user account
 */
interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: "Administrator" | "Agent" | "End User";
  department: string;
  createdAt: string;
}

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
 * Reads all users from users.json
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
 * Saves users array to users.json
 */
function saveUsers(users: User[]): void {
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2), "utf8");
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
 * GET /api/users - List all users (Admin only)
 *
 * Returns all users with passwords removed for security
 */
export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);

  // Only Administrators can list users
  if (!auth || auth.role !== "Administrator") {
    return new NextResponse("Forbidden - Admin only", { status: 403 });
  }

  const users = getUsers();

  // Remove passwords before sending response
  const safeUsers = users.map(({ password, ...user }) => user);

  return NextResponse.json(safeUsers);
}

/**
 * POST /api/users - Create a new user (Admin only)
 *
 * Body: { email, password, name, role, department }
 */
export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);

  // Only Administrators can create users
  if (!auth || auth.role !== "Administrator") {
    return new NextResponse("Forbidden - Admin only", { status: 403 });
  }

  const data = await req.json();

  // Validate required fields
  const required = ["email", "password", "name", "role", "department"];
  for (const field of required) {
    if (!data[field]) {
      return new NextResponse(`Missing field: ${field}`, { status: 400 });
    }
  }

  // Validate role
  const validRoles = ["Administrator", "Agent", "End User"];
  if (!validRoles.includes(data.role)) {
    return new NextResponse(
      `Invalid role. Must be one of: ${validRoles.join(", ")}`,
      { status: 400 },
    );
  }

  const users = getUsers();

  // Check if email already exists
  if (users.find((u) => u.email.toLowerCase() === data.email.toLowerCase())) {
    return new NextResponse("Email already exists", { status: 409 });
  }

  // Create new user
  const newUser: User = {
    id: `usr_${uuidv4().substring(0, 8)}`,
    email: data.email,
    password: data.password, // In production, hash this!
    name: data.name,
    role: data.role,
    department: data.department,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  saveUsers(users);

  // Return user without password
  const { password: _, ...safeUser } = newUser;
  return NextResponse.json(safeUser, { status: 201 });
}

/**
 * PATCH /api/users - Update user role or department (Admin only)
 *
 * Body: { id, role?, department? }
 */
export async function PATCH(req: NextRequest) {
  const auth = getAuthUser(req);

  // Only Administrators can update users
  if (!auth || auth.role !== "Administrator") {
    return new NextResponse("Forbidden - Admin only", { status: 403 });
  }

  const { id, role, department } = await req.json();

  if (!id) {
    return new NextResponse("User ID is required", { status: 400 });
  }

  const users = getUsers();
  const index = users.findIndex((u) => u.id === id);

  if (index === -1) {
    return new NextResponse("User not found", { status: 404 });
  }

  // Prevent admin from demoting themselves
  if (users[index].email === auth.email && role && role !== "Administrator") {
    return new NextResponse("Cannot demote yourself", { status: 400 });
  }

  // Update user
  if (role) {
    const validRoles = ["Administrator", "Agent", "End User"];
    if (!validRoles.includes(role)) {
      return new NextResponse("Invalid role", { status: 400 });
    }
    users[index].role = role;
  }
  if (department) {
    users[index].department = department;
  }

  saveUsers(users);

  // Return user without password
  const { password: _, ...safeUser } = users[index];
  return NextResponse.json(safeUser);
}

/**
 * DELETE /api/users - Remove a user (Admin only)
 *
 * Body: { id }
 */
export async function DELETE(req: NextRequest) {
  const auth = getAuthUser(req);

  // Only Administrators can delete users
  if (!auth || auth.role !== "Administrator") {
    return new NextResponse("Forbidden - Admin only", { status: 403 });
  }

  const { id } = await req.json();

  if (!id) {
    return new NextResponse("User ID is required", { status: 400 });
  }

  const users = getUsers();
  const user = users.find((u) => u.id === id);

  if (!user) {
    return new NextResponse("User not found", { status: 404 });
  }

  // Prevent admin from deleting themselves
  if (user.email === auth.email) {
    return new NextResponse("Cannot delete yourself", { status: 400 });
  }

  // Remove user
  const filteredUsers = users.filter((u) => u.id !== id);
  saveUsers(filteredUsers);

  return new NextResponse("User deleted", { status: 204 });
}
