/**
 * ============================================================================
 * AUTH LOGIN API - User Authentication Endpoint
 * ============================================================================
 *
 * This API route handles user login for both local and LDAP authentication.
 * It validates credentials, creates a session, and returns user info + token.
 *
 * WHAT IT DOES:
 * 1. Validates request body using Zod schema
 * 2. Checks if LDAP auth is enabled and attempts LDAP login first
 * 3. Falls back to local database authentication
 * 4. Creates a session token valid for 24 hours
 * 5. Logs the login event for audit trail
 *
 * REQUEST FORMAT:
 * {
 *   "email": "user@company.com",
 *   "password": "securePassword",
 *   "provider": "local" | "ldap"  (optional, defaults to local)
 * }
 *
 * RESPONSE FORMAT (success):
 * {
 *   "user": { id, email, name, role, department, ... },
 *   "token": "uuid-session-token"
 * }
 *
 * BEGINNER NOTES:
 * - bcrypt is used for password hashing (one-way encryption)
 * - Sessions are stored in the database, not JWT tokens
 * - The token is passed in Authorization header for subsequent API calls
 *
 * @module /api/auth/login
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import prisma from "@/lib/prisma";
import { loginSchema } from "@/lib/schemas";
import { logAuditEvent } from "@/lib/audit";
import { authenticateWithLdap, LdapUser } from "@/lib/ldap-auth";

/**
 * Session expiry time in milliseconds = 24 hours
 * This determines how long a user stays logged in
 */
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000;

/**
 * POST /api/auth/login - Authenticate user and create session
 *
 * @param req - Next.js request with JSON body containing email, password, provider
 * @returns User object and session token on success
 */
export async function POST(req: NextRequest) {
  try {
    // Step 1: Parse and validate request body using Zod schema
    const body = await req.json();

    // Handle beacon logout for browser close (admins only)
    if (body.action === "logout" && body.token) {
      await prisma.session.deleteMany({ where: { token: body.token } });
      return new NextResponse(null, { status: 204 });
    }
    const validationResult = loginSchema.safeParse(body);

    // Return validation errors if any
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0]?.message || "Validation failed";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { email, password, provider } = validationResult.data;


    // Step 2: Check if LDAP authentication should be used
    // LDAP is used if explicitly requested OR if LDAP_ENABLED env var is set
    const useLdap = provider === "ldap" || process.env.LDAP_ENABLED === "true";

    // Step 3: Try LDAP authentication first if enabled
    if (useLdap) {
      // Extract username from email (e.g., "john@company.com" -> "john")
      const ldapUsername = email.split("@")[0];
      const ldapResult = await authenticateWithLdap(ldapUsername, password);

      // If LDAP login successful, return user with session token
      if (ldapResult.success && ldapResult.user) {

        // Log the successful LDAP login for audit trail
        logAuditEvent({
          userId: (ldapResult.user as LdapUser).id,
          action: "LOGIN",
          details: `User ${ldapUsername} logged in via LDAP`,
        }).catch((err) => console.error("Audit log failed:", err));

        return NextResponse.json({
          user: ldapResult.user,
          token: (ldapResult.user as LdapUser & { sessions?: Array<{ token: string }> }).sessions?.[0]?.token,
        });
      }
    }

    // Step 4: Fall back to local database authentication
    // Look up user by email (stored lowercase for consistency)
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // If no user found or wrong password, return generic error (security best practice)
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // Check if this account uses LDAP (stored as special marker)
    // If so, they must use LDAP to log in, not local password
    if (user.password === "LDAP_AUTH") {
      return NextResponse.json({ error: "This account uses LDAP authentication" }, { status: 401 });
    }

    // Step 5: Verify password using bcrypt
    // bcrypt.compare() hashes the input and compares to stored hash
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // Step 6: Create session token and store in database
    const sessionToken = uuidv4(); // Generate unique token
    const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MS); // Set expiry 24h from now

    await prisma.session.create({
      data: {
        userId: user.id,
        token: sessionToken,
        expiresAt,
      },
    });

    // Step 7: Remove password from user object before sending to frontend
    // This is a security measure - never send password hash to client
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _pw, ...safeUser } = user;


    // Step 8: Log the login event for audit trail
    logAuditEvent({
      userId: user.id,
      action: "LOGIN",
      details: `User ${user.email} logged in`,
    }).catch((err) => console.error("Audit log failed:", err));

    // Return user data and session token
    return NextResponse.json({
      user: { ...safeUser, source: "local" },
      token: sessionToken,
    });
  } catch (error) {
    // Catch any unexpected errors and return generic error message
    console.error(`[AUTH POST] Error:`, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/auth/login - Validate session token
 *
 * @param req - Next.js request with Authorization header containing bearer token
 * @returns User object if token is valid, or error if invalid
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing authorization token" }, { status: 401 });
    }

    const token = authHeader.substring(7);

    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    if (session.expiresAt < new Date()) {
      await prisma.session.delete({ where: { token } });
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _pw, ...safeUser } = session.user;

    return NextResponse.json({
      authenticated: true,
      user: safeUser,
    });
  } catch (error) {
    console.error(`[AUTH GET] Error:`, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/auth/login - Invalidate session token (logout)
 *
 * @param req - Next.js request with Authorization header containing bearer token
 * @returns Success confirmation
 */
export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing authorization token" }, { status: 401 });
    }

    const token = authHeader.substring(7);

    await prisma.session.deleteMany({ where: { token } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`[AUTH DELETE] Error:`, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}