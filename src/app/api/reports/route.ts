/**
 * ============================================================================
 * REPORTS API ROUTE - Generate Reports for Administrators
 * ============================================================================
 *
 * This endpoint allows Administrators to generate reports with date range filters.
 * Reports include all ticket information with user details.
 *
 * @module /api/reports/route
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

/**
 * GET /api/reports - Generate report with date range (Admin only)
 *
 * Query params:
 * - from: Start date (ISO string)
 * - to: End date (ISO string)
 *
 * Returns all tickets with user information within the date range
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);

  if (!auth) {
    return new NextResponse("Forbidden - Admin only", { status: 403 });
  }

  const url = new URL(req.url);
  const fromDate = url.searchParams.get("from");
  const toDate = url.searchParams.get("to");

  const from = fromDate ? new Date(fromDate) : new Date(0);
  const to = toDate ? new Date(toDate) : new Date(8640000000000000);

  const tickets = await prisma.ticket.findMany({
    where: {
      createdAt: {
        gte: from,
        lte: to,
      },
    },
    include: {
      createdBy: true,
    },
  });

  const summary = {
    totalTickets: tickets.length,
    byStatus: {} as Record<string, number>,
    byPriority: {} as Record<string, number>,
    byCategory: {} as Record<string, number>,
    byDepartment: {} as Record<string, number>,
  };

  tickets.forEach((ticket) => {
    summary.byStatus[ticket.status] =
      (summary.byStatus[ticket.status] || 0) + 1;
    summary.byPriority[ticket.priority] =
      (summary.byPriority[ticket.priority] || 0) + 1;
    summary.byCategory[ticket.category] =
      (summary.byCategory[ticket.category] || 0) + 1;
    summary.byDepartment[ticket.department] =
      (summary.byDepartment[ticket.department] || 0) + 1;
  });

  return NextResponse.json({
    tickets,
    summary,
    generatedAt: new Date().toISOString(),
    dateRange: {
      from: fromDate || "all",
      to: toDate || "all",
    },
  });
}
