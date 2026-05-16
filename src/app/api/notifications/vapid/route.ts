import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

/**
 * GET /api/notifications/vapid - Returns the VAPID public key for push subscription
 */
export async function GET() {
  return NextResponse.json({
    publicKey: process.env.VAPID_PUBLIC_KEY || "BOnIgI8x2uEDpVx3kkL5jcPyQ64Y1uZzqgIfwgwXSVa-48TmAsg30P_D-E8YCNtH7Z9KRbp2w4JaGrus4cL6_pc",
  });
}
