import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { changePasswordSchema, adminResetPasswordSchema } from "@/lib/schemas";
import { logAuditEvent } from "@/lib/audit";

export const dynamic = 'force-dynamic';

const BCRYPT_SALT_ROUNDS = 12;

async function getAuthUser(req: NextRequest): Promise<{ role: string; userId: string; email: string } | null> {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return null;
  try {
    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });
    if (!session || session.expiresAt < new Date()) return null;
    return { role: session.user.role, userId: session.userId, email: session.user.email };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    // Admin reset for another user
    if (body.userId) {
      if (auth.role !== "ADMINISTRATOR") {
        return NextResponse.json({ error: "Only administrators can reset other users' passwords" }, { status: 403 });
      }

      const validationResult = adminResetPasswordSchema.safeParse(body);
      if (!validationResult.success) {
        const firstError = validationResult.error.issues[0]?.message || "Validation failed";
        return NextResponse.json({ error: firstError }, { status: 400 });
      }

      const { userId, newPassword } = validationResult.data;
      const targetUser = await prisma.user.findUnique({ where: { id: userId } });
      if (!targetUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });

      await logAuditEvent({
        ticketId: "system",
        userId: auth.userId,
        action: "PASSWORD_RESET",
        details: `Password reset for ${targetUser.email} by ${auth.email}`,
      }).catch(() => {});

      return NextResponse.json({ success: true, message: "Password reset successfully" });
    }

    // Self password change
    const validationResult = changePasswordSchema.safeParse(body);
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0]?.message || "Validation failed";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { oldPassword, newPassword } = validationResult.data;

    const user = await prisma.user.findUnique({ where: { id: auth.userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
    await prisma.user.update({
      where: { id: auth.userId },
      data: { password: hashedPassword },
    });

    await logAuditEvent({
      ticketId: "system",
      userId: auth.userId,
      action: "PASSWORD_CHANGED",
      details: `Password changed for ${auth.email}`,
    }).catch(() => {});

    return NextResponse.json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    console.error("Error changing password:", error);
    return NextResponse.json({ error: "Failed to change password" }, { status: 500 });
  }
}
