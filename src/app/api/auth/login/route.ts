/**
 * ============================================================================
 * AUTHENTICATION API ROUTE - Login, Logout, and Session Management
 * ============================================================================
 *
 * This file handles all authentication-related HTTP requests:
 * - POST   : Login (verify credentials and create session)
 * - GET    : Check if current session is valid
 * - DELETE : Logout (destroy session)
 * - PUT    : Register a new user
 *
 * SECURITY ENHANCEMENTS:
 * - Zod input validation for all request bodies
 * - bcrypt password hashing (never store plain passwords!)
 * - Prisma database integration for users and sessions
 *
 * @module /api/auth/login/route
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import prisma from "@/lib/prisma";
import { loginSchema, registerSchema } from "@/lib/schemas";
import { logAuditEvent } from "@/lib/audit";

// Session expiry time in milliseconds (24 hours)
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000;

// bcrypt salt rounds (higher = more secure but slower)
const BCRYPT_SALT_ROUNDS = 12;

/**
 * POST /api/auth/login - Authenticate user and create session
 */
export async function POST(req: NextRequest) {
  try {
    // Parse and validate request body with Zod
    const body = await req.json();
    const validationResult = loginSchema.safeParse(body);

    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0]?.message || "Validation failed";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { email, password } = validationResult.data;

    console.log(`[AUTH POST] Login attempt`, { email });

    // Authenticate against Prisma database with bcrypt
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // Verify password with bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // Create session
    const sessionToken = uuidv4();
    const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MS);

    await prisma.session.create({
      data: {
        userId: user.id,
        token: sessionToken,
        expiresAt,
      },
    });

    // Return user without password
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _pw, ...safeUser } = user;

    console.log(`[AUTH POST] Login successful`, { userId: user.id, email: user.email });

    await logAuditEvent({
      userId: user.id,
      action: "LOGIN",
      details: `User ${user.email} logged in`,
    }).catch(() => {});

    return NextResponse.json({
      user: safeUser,
      token: sessionToken,
    });
  } catch (error) {
    console.error(`[AUTH POST] Error:`, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/auth/login - Check if current session is valid
 */
export async function GET(req: NextRequest) {
  console.log(`[AUTH GET] Checking session`);

  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  try {
    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await prisma.session.delete({ where: { id: session.id } });
      }
      console.log(`[AUTH GET] Session invalid or expired`);
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Optionally extend session on activity
    const timeRemaining = session.expiresAt.getTime() - Date.now();
    if (timeRemaining < SESSION_EXPIRY_MS * 0.5) {
      await prisma.session.update({
        where: { id: session.id },
        data: { expiresAt: new Date(Date.now() + SESSION_EXPIRY_MS) },
      });
    }

    console.log(`[AUTH GET] Session valid`, { userId: session.user.id, email: session.user.email });

    return NextResponse.json({
      authenticated: true,
      user: session.user,
    });
  } catch (error) {
    console.error(`[AUTH GET] Error:`, error);
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}

/**
 * DELETE /api/auth/login - Logout (destroy session)
 */
export async function DELETE(req: NextRequest) {
  console.log(`[AUTH DELETE] Logging out`);

  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (token) {
    try {
      const session = await prisma.session.findUnique({
        where: { token },
        include: { user: true },
      });

if (session) {
         await logAuditEvent({
           userId: session.userId,
           action: "LOGOUT",
           details: `User ${session.user.email} logged out`,
         }).catch(() => {});
       }

      await prisma.session.deleteMany({ where: { token } });
    } catch (error) {
      console.error(`[AUTH DELETE] Error:`, error);
    }
  }

  return NextResponse.json({ success: true });
}

/**
 * PUT /api/auth/register - Register a new user
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const validationResult = registerSchema.safeParse(body);

    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0]?.message || "Validation failed";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { email, password, name, department } = validationResult.data;

    console.log(`[AUTH PUT] Registering user`, { email, name });

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        name,
        department: department || "General",
        role: "END_USER",
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _pw, ...safeUser } = user;

    console.log(`[AUTH PUT] User registered`, { userId: user.id, email: user.email });

    return NextResponse.json(safeUser, { status: 201 });
  } catch (error) {
    console.error(`[AUTH PUT] Error:`, error);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}