/**
 * ============================================================================
 * DATABASE CONNECTION CHECK API ROUTE
 * ============================================================================
 *
 * This endpoint tests the database connection.
 * Used by the setup wizard to verify DATABASE_URL is valid.
 *
 * @module /api/setup/check-db/route
 */

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

/**
 * POST /api/setup/check-db - Test database connection with provided credentials
 * 
 * @param req - JSON body with host, port, user, pass, name
 * @returns Connection status and URL if successful
 */
export async function POST(req: Request) {

  try {
    const { host, port, user, pass, name } = await req.json();

    if (!host || !port || !user || !name) {
      return NextResponse.json(
        { connected: false, error: "Missing required connection details" },
        { status: 400 },
      );
    }

    // Construct connection string
    // Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE
    const databaseUrl = `postgresql://${user}:${encodeURIComponent(pass)}@${host}:${port}/${name}`;

    // Create a temporary prisma client to test connection
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
    });

    try {
      // Attempt a simple query to test connection
      await prisma.$queryRaw`SELECT 1`;
      await prisma.$disconnect();

      return NextResponse.json({
        connected: true,
        message: "Database connection successful",
        url: databaseUrl, // Return the URL so it can be used in the final step
      });
    } catch (dbError) {
      console.error(`[SETUP CHECK-DB POST] Database test failed:`, dbError);
      await prisma.$disconnect();
      throw dbError;
    }
  } catch (error) {
    console.error(`[SETUP CHECK-DB POST] Error:`, error);

    const errorMessage =
      error instanceof Error ? error.message : "Failed to connect to database";

    return NextResponse.json(
      {
        connected: false,
        error: errorMessage,
        hint: "Check your database credentials and ensure the database exists and is accessible.",
      },
      { status: 200 },
    );
  }
}

// Keep GET for compatibility or status check if needed
export async function GET() {
  const databaseUrl = process.env.DATABASE_URL;
  return NextResponse.json({
    configured: !!databaseUrl,
    hasEnv: !!process.env.DATABASE_URL,
  });
}
