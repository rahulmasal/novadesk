/**
 * ============================================================================
 * USERS API ROUTE - User Management for Administrators
 * ============================================================================
 *
 * This file handles all user-related HTTP requests:
 * - GET    : Retrieve all users (Agents and Admins)
 * - POST   : Create a new user (Admins only)
 * - PATCH  : Update user details (Admins only)
 * - DELETE : Remove a user (Admins only)
 *
 * AUTHENTICATION:
 * - All endpoints require valid session token
 * - Most operations restricted to Administrators
 * - Agents can view user list but not modify
 *
 * @module /api/users/route
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { createUserSchema, updateUserSchema } from "@/lib/schemas";
import { logAuditEvent } from "@/lib/audit";

export const dynamic = 'force-dynamic';

/**
 * Number of salt rounds for bcrypt password hashing
 * Higher = more secure but slower (12 is industry standard)
 */
const BCRYPT_SALT_ROUNDS = 12;

/**
 * getAuthUser - Extracts and validates the authenticated user from request
 * 
 * WHAT IT DOES:
 * 1. Extracts Bearer token from Authorization header
 * 2. Looks up session in database
 * 3. Returns user info if valid, null if invalid/expired
 * 
 * @param req - Next.js request with Authorization header
 * @returns User object with role, userId, email or null
 */
async function getAuthUser(req: NextRequest): Promise<{ role: string; userId: string; email: string } | null> {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) return null;

  try {
    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      return null;
    }

    return { role: session.user.role, userId: session.userId, email: session.user.email };
  } catch {
    return null;
  }
}

/**
 * GET /api/users - Fetch all users (Administrators and Agents only)
 * 
 * @param req - Next.js request with Authorization header
 * @returns Array of user objects
 */
export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);

  if (!auth || (auth.role !== "ADMINISTRATOR" && auth.role !== "AGENT")) {
    console.log(`[USERS GET] Forbidden - role: ${auth?.role}, user: ${auth?.email}`);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  console.log(`[USERS GET] Fetching users`, { role: auth.role, user: auth.email });

  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, department: true, hostname: true, laptopSerial: true, createdAt: true, updatedAt: true },
      orderBy: { createdAt: "desc" },
    });
    console.log(`[USERS GET] Returning ${users.length} users`);
    return NextResponse.json(users);
  } catch (error) {
    console.error(`[USERS GET] Error:`, error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

/**
 * POST /api/users - Create a new user (Administrators only)
 * 
 * @param req - Request containing user data in JSON body
 * @returns Created user object
 */
export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);

  if (!auth || auth.role !== "ADMINISTRATOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  console.log(`[USERS POST] Creating user`, { adminUser: auth.email });

  try {
    const body = await req.json();
    const validationResult = createUserSchema.safeParse(body);

    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0]?.message || "Validation failed";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const data = validationResult.data;

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(data.password, BCRYPT_SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        password: hashedPassword,
        name: data.name,
        role: data.role,
        department: data.department,
        hostname: data.hostname,
        laptopSerial: data.laptopSerial,
      },
      select: { id: true, email: true, name: true, role: true, department: true, hostname: true, laptopSerial: true, createdAt: true },
    });

    await logAuditEvent({
      userId: auth.userId,
      action: "USER_CREATED",
      details: `User ${user.email} created by ${auth.email}`,
    }).catch(() => {});

    console.log(`[USERS POST] User created`, { userId: user.id, email: user.email, role: user.role });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error(`[USERS POST] Error:`, error);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}

/**
 * PATCH /api/users - Update an existing user (Administrators only)
 * 
 * @param req - Request containing user ID and fields to update
 * @returns Updated user object
 */
export async function PATCH(req: NextRequest) {
  const auth = await getAuthUser(req);

  if (!auth || auth.role !== "ADMINISTRATOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  console.log(`[USERS PATCH] Updating user`, { adminUser: auth.email });

  try {
    const body = await req.json();
    const validationResult = updateUserSchema.safeParse(body);

    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0]?.message || "Validation failed";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { id, ...updates } = validationResult.data;

    if (id === auth.userId && updates.role && updates.role !== "ADMINISTRATOR") {
      return NextResponse.json({ error: "Cannot demote yourself" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (updates.name) updateData.name = updates.name;
    if (updates.role) updateData.role = updates.role;
    if (updates.department) updateData.department = updates.department;
    if (updates.hostname !== undefined) updateData.hostname = updates.hostname;
    if (updates.laptopSerial !== undefined) updateData.laptopSerial = updates.laptopSerial;

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, email: true, name: true, role: true, department: true, hostname: true, laptopSerial: true, createdAt: true },
    });

    await logAuditEvent({
      userId: auth.userId,
      action: "USER_UPDATED",
      details: `User ${user.email} updated by ${auth.email}`,
    }).catch(() => {});

    console.log(`[USERS PATCH] User updated`, { userId: id, updatedBy: auth.userId });

    return NextResponse.json(user);
  } catch (error) {
    console.error(`[USERS PATCH] Error:`, error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

/**
 * DELETE /api/users - Delete a user (Administrators only)
 * 
 * @param req - Request containing user ID in JSON body
 * @returns Success confirmation
 */
export async function DELETE(req: NextRequest) {
  const auth = await getAuthUser(req);

  if (!auth || auth.role !== "ADMINISTRATOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  console.log(`[USERS DELETE] Deleting user`, { adminUser: auth.email });

  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    if (id === auth.userId) {
      return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    await prisma.user.delete({ where: { id } });

    if (targetUser) {
      await logAuditEvent({
        userId: auth.userId,
        action: "USER_DELETED",
        details: `User ${targetUser.email} deleted by ${auth.email}`,
      }).catch(() => {});
    }

    console.log(`[USERS DELETE] User deleted`, { userId: id, deletedBy: auth.userId });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(`[USERS DELETE] Error:`, error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}