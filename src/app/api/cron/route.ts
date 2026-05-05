/**
 * ============================================================================
 * CRON API ROUTE - Automated Report Generation Endpoint
 * ============================================================================
 *
 * This file handles scheduled/automated tasks triggered by external schedulers:
 * - GET   : Generate and email a CSV report of all tickets
 *
 * WHAT IS A CRON JOB?
 * - A "cron job" is a scheduled task that runs automatically at specific times
 * - This endpoint is called by an external scheduler (see scheduler.mjs)
 * - The scheduler runs daily at 11:59 PM and monthly on the 1st
 *
 * SECURITY:
 * - This endpoint is PROTEECTED by a secret token (CRON_SECRET env variable)
 * - Only requests with the correct Bearer token can trigger reports
 * - The token should be a long, random string (like a password)
 *
 * BEGINNER NOTES:
 * - In production, use services like AWS CloudWatch Events or Vercel Cron
 * - Next.js API routes can also be triggered by webhooks
 * - Never expose cron endpoints without authentication!
 *
 * @module /api/cron/route
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import fs from "fs";
import path from "path";

// Import the email sending utility
import { sendReportEmail } from "@/lib/email";

/**
 * Path to the tickets data file
 */
const ticketsPath = path.join(process.cwd(), "src/data/tickets.json");

/**
 * Reads all tickets from the JSON file
 *
 * @returns {any[]} Array of ticket objects
 */
function getTickets() {
  try {
    const data = fs.readFileSync(ticketsPath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

/**
 * GET /api/cron - Trigger report generation and email
 *
 * WHAT IT DOES:
 * 1. Validates the CRON_SECRET Bearer token
 * 2. Reads all tickets from the database
 * 3. Generates a CSV report of tickets
 * 4. Sends the CSV report via email to configured recipient
 *
 * WHEN IS THIS CALLED?
 * - By scheduler.mjs: Daily at 11:59 PM and Monthly on the 1st
 * - You can also test it manually using curl or Postman
 *
 * ENVIRONMENT VARIABLES NEEDED:
 * - CRON_SECRET: Secret token to authorize cron requests
 * - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS: Email server settings
 * - REPORT_RECIPIENT: Email address to send reports to
 *
 * @param {NextRequest} req - Authorization header must contain correct Bearer token
 * @returns {NextResponse} { success: boolean, message?: string, error?: string }
 */
export async function GET(req: NextRequest) {
  // Step 1: Validate authorization token
  // This prevents unauthorized access to the report generation endpoint
  // process.env.CRON_SECRET should be set in .env.local file
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET || "secret123"}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    // Step 2: Get all tickets from storage
    const tickets = getTickets();

    // Step 3: Send the report email
    // This converts tickets to CSV format and emails them
    await sendReportEmail(tickets);

    // Step 4: Return success response
    return NextResponse.json({
      success: true,
      message: "Report sent successfully",
    });
  } catch (error: any) {
    // Log the error for debugging, return generic error to client
    console.error("Error sending report:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
