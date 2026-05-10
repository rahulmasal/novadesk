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
  | "SLA_WARNING" | "SLA_BREACHED"
  | "LOGIN" | "LOGOUT"
  | "PASSWORD_CHANGED" | "PASSWORD_RESET"
  | "USER_CREATED" | "USER_UPDATED" | "USER_DELETED";

/**
 * Creates an audit log entry in the database
 *
 * @param params - Object containing ticketId, userId, action, and optional oldValue/newValue/details
 * @returns Promise that resolves when the audit log is created
 */
export async function logAuditEvent(params: {
  ticketId?: string;
  userId: string;
  action: AuditAction;
  oldValue?: string | null;
  newValue?: string | null;
  details?: string;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        ticketId: params.ticketId || null,
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

/**
 * Retrieves audit logs for a specific ticket
 *
 * @param ticketId - The ID of the ticket to fetch logs for
 * @param limit - Maximum number of logs to return (default 50)
 * @param offset - Number of logs to skip for pagination (default 0)
 * @returns List of audit log entries with associated user details
 */
export async function getTicketAuditLogs(ticketId: string, limit = 50, offset = 0) {
  return prisma.auditLog.findMany({
    where: { ticketId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: limit, skip: offset,
  });
}

/**
 * Retrieves all audit logs with pagination and optional filters
 *
 * @param filters - Object with optional ticketId, userId, action, startDate, endDate, limit, and offset
 * @returns List of matching audit log entries with user and ticket details
 */
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

/**
 * Exports audit logs as CSV
 *
 * @param filters - Object with optional startDate and endDate to filter the exported logs
 * @returns CSV-formatted string of audit log entries
 */
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
  type LogRow = { id: string; createdAt: Date; user: { name: string; email: string }; ticket: { id: string; title: string } | null; action: string; oldValue: string | null; newValue: string | null; details: string | null };
  const rows = logs.map((log: LogRow) => [
    log.id, log.createdAt.toISOString(), log.user.name, log.user.email,
    log.ticket?.id ?? "", log.ticket?.title ?? "", log.action, log.oldValue || "", log.newValue || "", log.details || "",
  ]);

  const csvContent = [headers.join(","), ...rows.map((row: string[]) => row.map((cell: string) => `"${cell.replace(/"/g, '""')}"`).join(","))].join("\n");
  return csvContent;
}

/**
 * Gets audit statistics including total log count, action breakdown, and top users
 *
 * @param startDate - Start of the date range for statistics
 * @param endDate - End of the date range for statistics
 * @returns Object with totalLogs, actionBreakdown array, and topUsers array
 */
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