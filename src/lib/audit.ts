/**
 * ============================================================================
 * AUDIT LOGGING SERVICE - Track All Ticket Changes
 * ============================================================================
 *
 * @module /lib/audit
 */

import prisma from "./prisma";

export type AuditAction =
  | "TICKET_CREATED" | "TICKET_UPDATED" | "TICKET_DELETED"
  | "STATUS_CHANGED" | "PRIORITY_CHANGED" | "ASSIGNED" | "UNASSIGNED"
  | "COMMENT_ADDED" | "COMMENT_UPDATED" | "COMMENT_DELETED"
  | "ATTACHMENT_ADDED" | "ATTACHMENT_DELETED"
  | "SLA_WARNING" | "SLA_BREACHED";

export async function logAuditEvent(params: {
  ticketId: string;
  userId: string;
  action: AuditAction;
  oldValue?: string | null;
  newValue?: string | null;
  details?: string;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        ticketId: params.ticketId,
        userId: params.userId,
        action: params.action,
        oldValue: params.oldValue || null,
        newValue: params.newValue || null,
        details: params.details || null,
      },
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
  }
}

export async function getTicketAuditLogs(ticketId: string, limit = 50, offset = 0) {
  return prisma.auditLog.findMany({
    where: { ticketId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: limit, skip: offset,
  });
}

export async function getAuditLogs(filters: {
  ticketId?: string;
  userId?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}) {
  const where: Record<string, unknown> = {};

  if (filters.ticketId) where.ticketId = filters.ticketId;
  if (filters.userId) where.userId = filters.userId;
  if (filters.action) where.action = filters.action;
  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) (where.createdAt as Record<string, Date>).gte = filters.startDate;
    if (filters.endDate) (where.createdAt as Record<string, Date>).lte = filters.endDate;
  }

  return prisma.auditLog.findMany({
    where,
    include: { user: { select: { id: true, name: true, email: true } }, ticket: { select: { id: true, title: true } } },
    orderBy: { createdAt: "desc" },
    take: filters.limit || 50, skip: filters.offset || 0,
  });
}

export async function exportAuditLogs(filters: { startDate?: Date; endDate?: Date }): Promise<string> {
  const logs = await prisma.auditLog.findMany({
    where: {
      createdAt: {
        ...(filters.startDate && { gte: filters.startDate }),
        ...(filters.endDate && { lte: filters.endDate }),
      },
    },
    include: { user: { select: { name: true, email: true } }, ticket: { select: { id: true, title: true } } },
    orderBy: { createdAt: "desc" },
  });

  const headers = ["ID", "Timestamp", "User", "User Email", "Ticket ID", "Ticket Title", "Action", "Old Value", "New Value", "Details"];
  type LogRow = { id: string; createdAt: Date; user: { name: string; email: string }; ticket: { id: string; title: string }; action: string; oldValue: string | null; newValue: string | null; details: string | null };
  const rows = logs.map((log: LogRow) => [
    log.id, log.createdAt.toISOString(), log.user.name, log.user.email,
    log.ticket.id, log.ticket.title, log.action, log.oldValue || "", log.newValue || "", log.details || "",
  ]);

  const csvContent = [headers.join(","), ...rows.map((row: string[]) => row.map((cell: string) => `"${cell.replace(/"/g, '""')}"`).join(","))].join("\n");
  return csvContent;
}

export async function getAuditStats(startDate: Date, endDate: Date) {
  type ActionItem = { action: string; _count: { action: number } };
  type UserItem = { userId: string; _count: { userId: number } };
  
  const [totalLogs, actionBreakdown, userActivity] = await Promise.all([
    prisma.auditLog.count({ where: { createdAt: { gte: startDate, lte: endDate } } }),
    prisma.auditLog.groupBy({ by: ["action"], where: { createdAt: { gte: startDate, lte: endDate } }, _count: { action: true } }),
    prisma.auditLog.groupBy({ by: ["userId"], where: { createdAt: { gte: startDate, lte: endDate } }, _count: { userId: true }, orderBy: { _count: { userId: "desc" } }, take: 10 }),
  ]);

  return {
    totalLogs,
    actionBreakdown: actionBreakdown.map((item: ActionItem) => ({ action: item.action, count: item._count.action })),
    topUsers: userActivity.map((item: UserItem) => ({ userId: item.userId, count: item._count.userId })),
  };
}