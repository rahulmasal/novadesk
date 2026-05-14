/**
 * ============================================================================
 * REPORTS API ROUTE - Generate Reports for Administrators
 * ============================================================================
 *
 * This endpoint allows Administrators to generate custom reports with filtering
 * options. Reports include ticket information, user details, and summary statistics.
 *
 * HTTP METHODS:
 * - GET: Generate report with optional date range and type filters
 *
 * ACCESS CONTROL:
 * - Only administrators can access this endpoint
 * - Requires valid session token in Authorization header
 *
 * QUERY PARAMETERS:
 * - from: Start date filter (ISO string, optional)
 * - to: End date filter (ISO string, optional)
 * - type: Report type filter (all, status, priority, category, department)
 *
 * RESPONSE FORMAT:
 * - tickets: Array of ticket objects with user info
 * - summary: Statistics breakdown by status, priority, category, department
 * - generatedAt: Timestamp when report was generated
 * - dateRange: Applied date filter
 *
 * REPORT TYPES:
 * - all: All tickets within date range
 * - status: Tickets with NEW status
 * - priority: Tickets with URGENT or HIGH priority
 * - category: Hardware category tickets
 * - department: IT department tickets
 *
 * @module /api/reports/route
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const dynamic = 'force-dynamic';

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
  console.log(`[REPORTS GET] Generating report`);

  const auth = await requireAdmin(req);

  if (!auth) {
    return new NextResponse("Forbidden - Admin only", { status: 403 });
  }

  const url = new URL(req.url);
  const fromDate = url.searchParams.get("from");
  const toDate = url.searchParams.get("to");
  const reportType = url.searchParams.get("type") || "all";

  const from = fromDate ? new Date(fromDate) : new Date(0);
  const to = toDate ? new Date(toDate) : new Date(8640000000000000);

  try {
  const whereClause: Record<string, unknown> = {
    createdAt: {
      gte: from,
      lte: to,
    },
  };

  switch (reportType) {
    case "status":
      whereClause.status = "NEW";
      break;
    case "priority":
      whereClause.priority = { in: ["URGENT", "HIGH"] };
      break;
    case "category":
      whereClause.category = "Hardware";
      break;
    case "department":
      whereClause.department = "IT";
      break;
    default:
      break;
  }

  const ticketsRaw = await prisma.ticket.findMany({
    where: whereClause,
    include: {
      createdBy: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          department: true,
        }
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const tickets = ticketsRaw.map(t => ({
    ...t,
    userInfo: t.createdBy,
    dueDate: t.dueDate?.toISOString() || null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }));

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

  console.log(`[REPORTS GET] Report generated`, { totalTickets: tickets.length, dateRange: { from: fromDate || "all", to: toDate || "all" }, type: reportType });

  return NextResponse.json({
    tickets,
    summary,
    generatedAt: new Date().toISOString(),
    dateRange: {
      from: fromDate || "all",
      to: toDate || "all",
    },
    reportType,
  });
  } catch (error) {
    console.error(`[REPORTS GET] Error:`, error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
