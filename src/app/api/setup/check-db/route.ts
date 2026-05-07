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

export async function GET() {
  try {
    // Check if DATABASE_URL is set
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      return NextResponse.json(
        { connected: false, error: "DATABASE_URL environment variable is not set" },
        { status: 200 }
      );
    }

    // Try to import prisma and test connection
    const prisma = (await import("@/lib/prisma")).default;
    
    // Attempt a simple query to test connection
    await prisma.$queryRaw`SELECT 1`;
    
    return NextResponse.json({
      connected: true,
      message: "Database connection successful",
    });
  } catch (error) {
    console.error("Database connection check failed:", error);
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : "Failed to connect to database";
    
    return NextResponse.json(
      { 
        connected: false, 
        error: errorMessage,
        hint: "Check your DATABASE_URL environment variable. For Supabase, use the Connection string from Settings > Database."
      },
      { status: 200 }
    );
  }
}