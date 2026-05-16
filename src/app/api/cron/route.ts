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
import { notify } from "@/lib/notify";
import { sendReportEmail } from "@/lib/email";
import logger from "@/lib/logger";

const SLA_WARNING_THRESHOLD = 0.8;
const SLA_BREACH_THRESHOLD = 1.0;

/**
 * Processes SLA escalation for all open tickets
 * Checks ticket progress against due date and creates warnings/breach records
 * Uses SLA thresholds from settings (default: warning at 80%, breach at 100%)
 *
 * @returns Object with warnings count, breached count, and any errors encountered
 */
async function runSlaEscalation(): Promise<{ warnings: number; breached: number; errors: string[] }> {
  const result = { warnings: 0, breached: 0, errors: [] as string[] };

  try {
    // Load SLA settings from database
    let slaWarningThreshold = SLA_WARNING_THRESHOLD;
    let slaBreachThreshold = SLA_BREACH_THRESHOLD;
    try {
      const config = await prisma.systemConfig.findUnique({ where: { key: "user-settings" } });
      if (config) {
        const settings = JSON.parse(config.value);
        const responseMinutes = (settings.advanced?.slaResponseHours ?? 0) * 60 + (settings.advanced?.slaResponseMinutes ?? 0);
        const resolutionMinutes = (settings.advanced?.slaResolutionHours ?? 0) * 60 + (settings.advanced?.slaResolutionMinutes ?? 0);
        if (responseMinutes > 0) {
          slaWarningThreshold = 0.8;
        }
        if (resolutionMinutes > 0) {
          slaBreachThreshold = 1.0;
        }
      }
    } catch {
      // Use defaults if settings can't be loaded
    }

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
        if (progressPercent >= slaBreachThreshold) breachLevel = "BREACHED";
        else if (progressPercent >= slaWarningThreshold) breachLevel = "WARNING";
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

            const warnUserId = ticket.assignedTo || ticket.createdById;
            notify({
              userId: warnUserId,
              type: "SLA_WARNING",
              subject: `SLA Warning: Ticket #${ticket.id.substring(0, 8)}`,
              body: `Ticket "${ticket.title}" is at ${Math.round(progressPercent * 100)}% of its SLA time.`,
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
            notify({
              userId: notifyUserId,
              type: "SLA_BREACH",
              subject: `SLA Breach: Ticket #${ticket.id.substring(0, 8)}`,
              body: `Ticket "${ticket.title}" has breached its SLA. Created by: ${ticket.createdBy.name}`,
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
/**
 * Auto-close resolved tickets after configured days of inactivity
 */
async function runAutoClose(): Promise<{ closed: number; errors: string[] }> {
  const result = { closed: 0, errors: [] as string[] };

  try {
    // Load auto-close days from settings (default: 7 days)
    let autoCloseDays = 7;
    try {
      const config = await prisma.systemConfig.findUnique({ where: { key: "user-settings" } });
      if (config) {
        const settings = JSON.parse(config.value);
        if (typeof settings.advanced?.autoCloseDays === "number") {
          autoCloseDays = settings.advanced.autoCloseDays;
        }
      }
    } catch { /* use default */ }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - autoCloseDays);

    // Find resolved tickets that haven't been updated in X days
    const staleTickets = await prisma.ticket.findMany({
      where: {
        status: "RESOLVED",
        updatedAt: { lt: cutoffDate },
      },
    });

    for (const ticket of staleTickets) {
      try {
        await prisma.ticket.update({
          where: { id: ticket.id },
          data: { status: "CLOSED" },
        });

        await logAuditEvent({
          ticketId: ticket.id,
          userId: "system",
          action: "STATUS_CHANGED",
          details: `Auto-closed after ${autoCloseDays} days of inactivity`,
        });

        result.closed++;
      } catch (error) {
        result.errors.push(`Failed to auto-close ${ticket.id}: ${error}`);
      }
    }

    logger.info(`[AUTO CLOSE] Closed ${result.closed} tickets`);
  } catch (error) {
    result.errors.push(String(error));
  }

  return result;
}

async function runDailyReport(): Promise<{ sent: boolean; error?: string }> {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const [created, resolved, openTickets, breachedTickets] = await Promise.all([
      prisma.ticket.count({ where: { createdAt: { gte: startOfDay, lte: endOfDay } } }),
      prisma.ticket.count({ where: { status: "RESOLVED", updatedAt: { gte: startOfDay, lte: endOfDay } } }),
      prisma.ticket.count({ where: { status: { notIn: ["RESOLVED", "CLOSED"] } } }),
      prisma.slaEscalation.count({ where: { breachLevel: "BREACHED" } }),
    ]);

    logger.info(`[DAILY REPORT] Created: ${created}, Resolved: ${resolved}, Open: ${openTickets}, Breached: ${breachedTickets}`);

    // Fetch all tickets for the CSV report
    const tickets = await prisma.ticket.findMany({
      where: { status: { notIn: ["RESOLVED", "CLOSED"] } },
      include: {
        createdBy: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const reportTickets = tickets.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      category: t.category,
      department: t.department,
      createdAt: t.createdAt.toISOString(),
      dueDate: t.dueDate.toISOString(),
      username: t.username,
    }));

    await sendReportEmail(reportTickets as never[]);

    return { sent: true };
  } catch (error) {
    logger.error("[DAILY REPORT] Failed:", error);
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

    if (action === "all" || action === "autoclose") {
      const autoCloseResult = await runAutoClose();
      results.autoClose = autoCloseResult;
    }

    if (action === "all" || action === "report") {
      const reportResult = await runDailyReport();
      results.dailyReport = reportResult;
    }

    return NextResponse.json({
      success: true, action, results, timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error(`[CRON GET] Error:`, error);
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
  return GET(req);
}