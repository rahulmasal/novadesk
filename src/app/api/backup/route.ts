/**
 * ============================================================================
 * BACKUP API ROUTE - Generate System Backup (JSON Export)
 * ============================================================================
 *
 * This route handles generating system backup data for download.
 * It exports all users, tickets, and configuration data in JSON format.
 *
 * HTTP METHODS:
 * - GET: Generate and download JSON backup file
 *
 * ACCESS CONTROL:
 * - Only administrators can access this endpoint
 * - Requires valid session token in Authorization header
 *
 * WHAT GET RETURNS:
 * - version: Backup format version
 * - timestamp: When backup was created
 * - data.users: All users with sensitive data (passwords)
 * - data.tickets: All tickets with nested comments, auditLogs, attachments
 * - data.config: System configuration settings
 *
 * SECURITY NOTES:
 * - User passwords are included in backup (bcrypt hashed)
 * - Downloaded file uses Content-Disposition for browser download
 * - Session is validated before allowing backup
 *
 * @module /api/backup/route
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const dynamic = 'force-dynamic';

/**
 * GET /api/backup - Generate system backup (JSON export)
 *
 * @returns JSON file with users, tickets, and config data
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    
    // Fetch all data from major tables
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        role: true,
        department: true,
        hostname: true,
        laptopSerial: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    const tickets = await prisma.ticket.findMany({
      include: {
        comments: true,
        auditLogs: true,
        attachments: true,
      }
    });

    const config = await prisma.systemConfig.findMany();

    const backupData = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      data: {
        users,
        tickets,
        config,
      }
    };

    return new NextResponse(JSON.stringify(backupData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename=novadesk-backup-${Date.now()}.json`,
      },
    });
  } catch (error) {
    console.error(`[BACKUP GET] Error:`, error);
    return NextResponse.json({ error: "Failed to generate backup" }, { status: 500 });
  }
}
