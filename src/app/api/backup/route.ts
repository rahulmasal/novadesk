/**
 * ============================================================================
 * BACKUP API ROUTE - Generate System Backup
 * ============================================================================
 *
 * @module /api/backup/route
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';

/**
 * GET /api/backup - Generate system backup (JSON export)
 * 
 * @returns JSON file with users, tickets, and config data
 */
export async function GET(req: NextRequest) {
  console.log(`[BACKUP GET] Generating system backup`);

  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });
    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "ADMINISTRATOR") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
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
