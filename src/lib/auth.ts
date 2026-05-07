/**
 * ============================================================================
 * AUTH UTILITY - Centralized Authentication Helper
 * ============================================================================
 *
 * This module provides a standardized way to authenticate API requests
 * using Prisma sessions. All API routes should use this utility instead of
 * implementing their own authentication logic.
 *
 * @module /lib/auth
 */

import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";

export interface AuthUser {
  role: string;
  userId: string;
  email: string;
  name: string;
  department: string;
}

export interface AuthResult {
  user: AuthUser;
  sessionId: string;
  token: string;
}

/**
 * Extracts and validates Bearer token from Authorization header
 */
function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization");
  return authHeader?.replace("Bearer ", "") || null;
}

/**
 * Validates a session token and returns the associated user
 *
 * @param req - Next.js request object
 * @returns AuthUser object if valid, null if not authenticated
 */
export async function validateAuth(
  req: NextRequest,
): Promise<AuthUser | null> {
  const token = extractToken(req);

  if (!token) return null;

  try {
    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      return null;
    }

    return {
      role: session.user.role,
      userId: session.userId,
      email: session.user.email,
      name: session.user.name,
      department: session.user.department,
    };
  } catch {
    return null;
  }
}

/**
 * Validates authentication and checks for required role
 *
 * @param req - Next.js request object
 * @param requiredRole - Role that the user must have (e.g., "ADMINISTRATOR")
 * @returns AuthUser object if authenticated with correct role, null otherwise
 */
export async function validateAuthWithRole(
  req: NextRequest,
  requiredRole: string,
): Promise<AuthUser | null> {
  const user = await validateAuth(req);

  if (!user) return null;
  if (user.role !== requiredRole) return null;

  return user;
}

/**
 * Shortcut for admin-only routes
 */
export async function requireAdmin(
  req: NextRequest,
): Promise<AuthUser | null> {
  return validateAuthWithRole(req, "ADMINISTRATOR");
}