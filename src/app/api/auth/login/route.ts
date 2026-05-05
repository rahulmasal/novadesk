/**
 * ============================================================================
 * AUTHENTICATION API ROUTE - Login, Logout, and Session Management
 * ============================================================================
 *
 * This file handles all authentication-related HTTP requests:
 * - POST   : Login (verify credentials and create session)
 * - GET    : Check if current session is valid
 * - DELETE : Logout (destroy session)
 *
 * BEGINNER NOTES:
 * - Authentication verifies WHO the user is (identity)
 * - Authorization verifies WHAT the user can do (permissions)
 * - Sessions store user state between HTTP requests (HTTP is stateless)
 * - In production, use JWT tokens or OAuth 2.0 for better security
 *
 * @module /api/auth/login/route
 */

// Import Next.js utilities for HTTP responses
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// fs = filesystem module for reading user data from JSON
import fs from "fs";

// path module for constructing file paths
import path from "path";

// uuid generates unique session tokens
import { v4 as uuidv4 } from "uuid";

/**
 * Path to the users.json file containing user account data
 * This acts as our "database" of valid user credentials
 */
const usersPath = path.join(process.cwd(), "src/data/users.json");

/**
 * User interface represents a user account in the system
 *
 * @interface User
 * @property {string} id - Unique identifier for the user account
 * @property {string} email - User's email (used as login username)
 * @property {string} password - User's password (in production, this would be hashed!)
 * @property {string} name - User's display name
 * @property {string} role - User's role determining permissions
 * @property {string} department - User's department (e.g., "IT", "Sales")
 * @property {string} createdAt - When the account was created
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
 * Reads all users from the users.json file
 *
 * WHAT IT DOES:
 * - Reads the JSON file containing all user accounts
 * - Parses it into a JavaScript array of User objects
 * - Returns empty array if file doesn't exist
 *
 * BEGINNER NOTES:
 * - In a real application, you'd use a database (PostgreSQL, MongoDB)
 * - Passwords should be HASHED (e.g., bcrypt) never stored in plain text!
 *
 * @returns {User[]} Array of user objects
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
 * POST /api/auth/login - Authenticate user and create session
 *
 * WHAT IT DOES:
 * 1. Receives email and password from frontend
 * 2. Looks up user in users.json
 * 3. If found and password matches, creates a session token
 * 4. Stores session in sessions.json
 * 5. Returns user info (without password) and session token
 *
 * SECURITY NOTES:
 * - In production, use bcrypt.compare() to check password hashes
 * - Sessions should be stored in Redis or database, not files
 * - Add rate limiting to prevent brute force attacks
 *
 * @param {NextRequest} req - Request body contains { email, password }
 * @returns {NextResponse} { user, token } on success, error on failure
 */
export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    const users = getUsers();
    const user = users.find(
      (u) =>
        u.email.toLowerCase() === email.toLowerCase() &&
        u.password === password,
    );

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    // Generate a session token (simple implementation)
    const sessionToken = uuidv4();
    const sessionData = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      department: user.department,
      token: sessionToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    };

    // Store session in a sessions file
    const sessionsPath = path.join(process.cwd(), "src/data/sessions.json");
    let sessions: Record<string, typeof sessionData> = {};
    try {
      const existing = fs.readFileSync(sessionsPath, "utf8");
      sessions = JSON.parse(existing);
    } catch (e) {
      // File doesn't exist or is invalid
    }
    sessions[sessionToken] = sessionData;
    fs.writeFileSync(sessionsPath, JSON.stringify(sessions, null, 2), "utf8");

    const { password: _, ...safeUser } = user;

    return NextResponse.json({
      user: safeUser,
      token: sessionToken,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/auth/login - Check if current session is valid
 *
 * WHAT IT DOES:
 * - Validates the session token sent in Authorization header
 * - Returns user info if session is valid
 * - Returns authenticated: false if token is missing or expired
 *
 * USE CASE:
 * - Called on page load to restore user's login state
 * - Frontend checks if "authenticated: true" to show logged-in UI
 *
 * @param {NextRequest} req - Authorization header contains "Bearer <token>"
 * @returns {NextResponse} { authenticated: boolean, user?: object }
 */
export async function GET(req: NextRequest) {
  // Step 1: Extract token from Authorization header
  const authHeader = req.headers.get("authorization");
  // Remove "Bearer " prefix to get just the token
  const token = authHeader?.replace("Bearer ", "");

  // No token = not authenticated
  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  // Step 2: Look up the session
  const sessionsPath = path.join(process.cwd(), "src/data/sessions.json");
  try {
    const sessions = JSON.parse(fs.readFileSync(sessionsPath, "utf8"));
    const session = sessions[token];

    // Step 3: Check if session exists AND hasn't expired
    // new Date(session.expiresAt) < new Date() compares expiry time to current time
    if (!session || new Date(session.expiresAt) < new Date()) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Step 4: Return success with user info
    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.userId,
        email: session.email,
        name: session.name,
        role: session.role,
        department: session.department,
      },
    });
  } catch (e) {
    // Any error means invalid session
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}

/**
 * DELETE /api/auth/login - Logout (destroy session)
 *
 * WHAT IT DOES:
 * - Removes the session token from sessions.json
 * - The user's token is no longer valid after this
 *
 * USE CASE:
 * - Called when user clicks "Logout" button
 * - Frontend should also clear its local token storage
 *
 * @param {NextRequest} req - Authorization header contains "Bearer <token>"
 * @returns {NextResponse} { success: true }
 */
export async function DELETE(req: NextRequest) {
  // Step 1: Extract token from Authorization header
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  // Step 2: If token exists, remove it from sessions
  if (token) {
    const sessionsPath = path.join(process.cwd(), "src/data/sessions.json");
    try {
      const sessions = JSON.parse(fs.readFileSync(sessionsPath, "utf8"));
      // delete operator removes the property from the object
      delete sessions[token];
      fs.writeFileSync(sessionsPath, JSON.stringify(sessions, null, 2), "utf8");
    } catch (e) {
      // Ignore errors - session might not exist anyway
    }
  }

  // Step 3: Return success
  // Even if token wasn't found, we return success (idempotent operation)
  return NextResponse.json({ success: true });
}
