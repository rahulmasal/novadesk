/**
 * ============================================================================
 * BACKUP API ROUTE - Generate System Backup
 * ============================================================================
 *
 * @module /api/backup/route
 */

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';

/**
 * GET /api/backup - Generate system backup (JSON export)
 * 
 * @returns JSON file with users, tickets, and config data
 */
export async function GET() {
  console.log(`[BACKUP GET] Generating system backup`);

  try {
    // Basic auth check would go here in production
    
    // Fetch all data from major tables
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        createdAt: true,
      }
    });

    const tickets = await prisma.ticket.findMany({
      include: {
        comments: true,
        auditLogs: true,
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

    console.log(`[BACKUP GET] Backup generated`, { userCount: users.length, ticketCount: tickets.length, configCount: config.length });

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
