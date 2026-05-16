import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateAuth } from "@/lib/auth";
import logger from "@/lib/logger";

export const dynamic = 'force-dynamic';

/**
 * POST /api/notifications/push - Subscribe to push notifications
 * Saves push subscription to user's record
 */
export async function POST(req: NextRequest) {
  const auth = await validateAuth(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const subscription = await req.json();

    // Store subscription in system config keyed by user ID
    const key = `push-subscription-${auth.userId}`;
    await prisma.systemConfig.upsert({
      where: { key },
      update: { value: JSON.stringify(subscription) },
      create: { key, value: JSON.stringify(subscription) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("[PUSH SUBSCRIBE] Error:", error);
    return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 });
  }
}

/**
 * DELETE /api/notifications/push - Unsubscribe from push notifications
 */
export async function DELETE(req: NextRequest) {
  const auth = await validateAuth(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const key = `push-subscription-${auth.userId}`;
    await prisma.systemConfig.deleteMany({ where: { key } });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("[PUSH UNSUBSCRIBE] Error:", error);
    return NextResponse.json({ error: "Failed to remove subscription" }, { status: 500 });
  }
}
