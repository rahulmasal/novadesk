/**
 * ============================================================================
 * CRON API ROUTE - Automated Tasks
 * ============================================================================
 *
 * @module /api/cron/route
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";

const SLA_WARNING_THRESHOLD = 0.8;
const SLA_BREACH_THRESHOLD = 1.0;

/**
 * Processes SLA escalation for all open tickets
 * Checks ticket progress against due date and creates warnings/breach records
 * 
 * @returns Object with warnings count, breached count, and any errors encountered
 */
async function runSlaEscalation(): Promise<{ warnings: number; breached: number; errors: string[] }> {
  const result = { warnings: 0, breached: 0, errors: [] as string[] };

  try {
    const tickets = await prisma.ticket.findMany({
      where: { status: { notIn: ["RESOLVED", "CLOSED"] } },
      include: {
        slaEscalation: true,
        createdBy: true,
      },
    });

    const now = new Date();

    for (const ticket of tickets) {
      try {
        const dueDate = ticket.dueDate;
        const createdAt = ticket.createdAt;
        const totalDuration = dueDate.getTime() - createdAt.getTime();
        const elapsed = now.getTime() - createdAt.getTime();
        const progressPercent = elapsed / totalDuration;

        let breachLevel: "NONE" | "WARNING" | "BREACHED";
        if (progressPercent >= SLA_BREACH_THRESHOLD) breachLevel = "BREACHED";
        else if (progressPercent >= SLA_WARNING_THRESHOLD) breachLevel = "WARNING";
        else breachLevel = "NONE";

        const currentLevel = ticket.slaEscalation?.breachLevel || "NONE";

        if (breachLevel !== currentLevel) {
          if (breachLevel === "WARNING" && currentLevel === "NONE") {
            await prisma.slaEscalation.upsert({
              where: { ticketId: ticket.id },
              create: { ticketId: ticket.id, breachLevel: "WARNING" },
              update: { breachLevel: "WARNING", notifiedAt: null },
            });
            result.warnings++;

            await logAuditEvent({
              ticketId: ticket.id,
              userId: ticket.createdById,
              action: "SLA_WARNING",
              details: `SLA warning: ${Math.round(progressPercent * 100)}% of time elapsed`,
            });
          } else if (breachLevel === "BREACHED") {
            await prisma.slaEscalation.upsert({
              where: { ticketId: ticket.id },
              create: { ticketId: ticket.id, breachLevel: "BREACHED", escalatedAt: now },
              update: { breachLevel: "BREACHED", escalatedAt: now, notifiedAt: null },
            });
            result.breached++;

            await logAuditEvent({
              ticketId: ticket.id,
              userId: ticket.createdById,
              action: "SLA_BREACHED",
              details: `SLA breached! Ticket is past due date.`,
            });

            const notifyUserId = ticket.assignedTo || ticket.createdById;
            await prisma.notification.create({
              data: {
                userId: notifyUserId,
                type: "SLA_BREACH",
                subject: `SLA Breach: Ticket #${ticket.id.substring(0, 8)}`,
                body: `Ticket "${ticket.title}" has breached its SLA. Created by: ${ticket.createdBy.name}`,
              },
            });
          }
        }
      } catch (ticketError) {
        result.errors.push(`Ticket ${ticket.id}: ${String(ticketError)}`);
      }
    }
  } catch (error) {
    result.errors.push(`Fatal error: ${String(error)}`);
  }

  return result;
}

/**
 * Generates daily report with ticket statistics
 * Counts created, resolved, open, and breached tickets
 * 
 * @returns Object indicating if report was sent successfully
 */
async function runDailyReport(): Promise<{ sent: boolean; error?: string }> {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const [created, resolved] = await Promise.all([
      prisma.ticket.count({ where: { createdAt: { gte: startOfDay, lte: endOfDay } } }),
      prisma.ticket.count({ where: { status: "RESOLVED", updatedAt: { gte: startOfDay, lte: endOfDay } } }),
    ]);

    const openTickets = await prisma.ticket.count({ where: { status: { notIn: ["RESOLVED", "CLOSED"] } } });
    const breachedTickets = await prisma.slaEscalation.count({ where: { breachLevel: "BREACHED" } });

    console.log(`[CRON REPORT] Daily report`, { created, resolved, open: openTickets, breached: breachedTickets });

    return { sent: true };
  } catch (error) {
    return { sent: false, error: String(error) };
  }
}

/**
 * GET /api/cron - Run scheduled tasks (requires CRON_SECRET auth)
 * 
 * @param req - Next.js request with optional 'action' query param
 * @returns Results of scheduled tasks (SLA escalation, daily report)
 */
export async function GET(req: NextRequest) {
  console.log(`[CRON GET] Running scheduled tasks`);

  const authHeader = req.headers.get("authorization");
  const expectedToken = process.env.CRON_SECRET;

  if (!expectedToken) {
    return NextResponse.json({ error: "Cron secret not configured" }, { status: 500 });
  }

  if (authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "all";

  try {
    const results: Record<string, unknown> = {};
    const slaResult = await runSlaEscalation();
    results.slaEscalation = slaResult;

    if (action === "all" || action === "report") {
      const reportResult = await runDailyReport();
      results.dailyReport = reportResult;
    }

    return NextResponse.json({
      success: true, action, results, timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`[CRON GET] Error:`, error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

/**
 * POST /api/cron - Run scheduled tasks (alias for GET)
 * 
 * @param req - Next.js request
 * @returns Results of scheduled tasks
 */
export async function POST(req: NextRequest) {
  console.log(`[CRON POST] Running scheduled tasks`);
  return GET(req);
}