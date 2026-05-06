/**
 * ============================================================================
 * AUDIT LOGS API ROUTE - Query and Export Audit Logs
 * ============================================================================
 *
 * @module /api/audit/route
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getAuditLogs, exportAuditLogs } from "@/lib/audit";

async function getAuthUser(req: NextRequest): Promise<{ role: string; userId: string; email: string } | null> {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) return null;

  try {
    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      return null;
    }

    return { role: session.user.role, userId: session.userId, email: session.user.email };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);

  if (!auth || auth.role !== "ADMINISTRATOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") || "json";

  try {
    const ticketId = searchParams.get("ticketId") || undefined;
    const userId = searchParams.get("userId") || undefined;
    const action = searchParams.get("action") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    if (format === "csv") {
      const csv = await exportAuditLogs({
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      });

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="audit-logs-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    const logs = await getAuditLogs({
      ticketId, userId, action,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit, offset,
    });

    return NextResponse.json(logs.map((log: { id: string; ticketId: string; ticket: { id: string; title: string }; userId: string; user: { id: string; name: string; email: string }; action: string; oldValue: string | null; newValue: string | null; details: string | null; createdAt: Date }) => ({
      id: log.id, ticketId: log.ticketId, ticket: log.ticket, userId: log.userId,
      user: log.user, action: log.action, oldValue: log.oldValue,
      newValue: log.newValue, details: log.details, createdAt: log.createdAt.toISOString(),
    })));
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
  }
}