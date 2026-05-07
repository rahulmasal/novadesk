/**
 * ============================================================================
 * SETUP STATUS API ROUTE
 * ============================================================================
 *
 * This endpoint checks if the initial setup has been completed.
 * Returns whether the setup wizard should be shown.
 *
 * @module /api/setup/status/route
 */

import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Check if DATABASE_URL is set
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      return NextResponse.json({
        needsSetup: true,
        hasDatabase: false,
        reason: "Database URL not configured",
      });
    }

    // Check if setup has been completed by looking for SystemConfig
    const prisma = (await import("@/lib/prisma")).default;
    
    const systemConfig = await prisma.systemConfig.findUnique({
      where: { key: "setup_completed" },
    });

    const isSetupComplete = systemConfig?.value === "true";

    if (isSetupComplete) {
      return NextResponse.json({
        needsSetup: false,
        hasDatabase: true,
        setupComplete: true,
      });
    }

    // Setup not completed - check if database is accessible
    try {
      // Quick connection test
      await prisma.$queryRaw`SELECT 1`;
      
      return NextResponse.json({
        needsSetup: true,
        hasDatabase: true,
        setupComplete: false,
      });
    } catch {
      return NextResponse.json({
        needsSetup: true,
        hasDatabase: false,
        reason: "Database connection failed",
      });
    }
  } catch (error) {
    console.error("Setup status check error:", error);
    return NextResponse.json(
      { needsSetup: true, error: "Failed to check setup status" },
      { status: 500 }
    );
  }
}