/**
 * ============================================================================
 * BACKUP RESTORE API ROUTE - Restore System from Backup
 * ============================================================================
 *
 * @module /api/backup/restore/route
 */

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = 'force-dynamic';

/**
 * POST /api/backup/restore - Restore system from JSON backup
 * 
 * @param req - JSON body with backup data
 * @returns Success message
 */
export async function POST(req: Request) {
  console.log(`[BACKUP RESTORE POST] Starting data restore`);

  try {
    const body = await req.json();
    const { data } = body;

    if (!data || !data.users || !data.tickets) {
      console.log(`[BACKUP RESTORE POST] Invalid backup format`);
      return NextResponse.json({ 
        error: "Invalid backup format. Ensure the file is a valid NovaDesk JSON backup with users and tickets data." 
      }, { status: 400 });
    }

    // Hash the default password once before the transaction
    // so we don't block the DB connection with slow bcrypt calls
    const defaultPassword = await bcrypt.hash("P@ss@4321", 12);

    // Clear existing data (caution!)
    // In a real app, you might want to merge or use a different strategy
    await prisma.comment.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.attachment.deleteMany();
    await prisma.ticket.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();

    // Restore Users in batches using createMany
    const userData = data.users.map((user: Record<string, unknown>) => ({
      id: user.id,
      email: user.email,
      password: (user.password as string) || defaultPassword,
      name: user.name,
      role: user.role,
      department: user.department,
      hostname: user.hostname,
      laptopSerial: user.laptopSerial,
      createdAt: new Date(user.createdAt as string),
      updatedAt: user.updatedAt ? new Date(user.updatedAt as string) : new Date(),
    }));
    await prisma.user.createMany({ data: userData });

    // Restore Tickets in batches
    const ticketData = data.tickets.map((ticket: Record<string, unknown>) => ({
      id: ticket.id,
      title: ticket.title,
      description: ticket.description,
      priority: ticket.priority,
      category: ticket.category,
      status: ticket.status,
      dueDate: new Date(ticket.dueDate as string),
      createdAt: new Date(ticket.createdAt as string),
      createdById: ticket.createdById,
      assignedTo: ticket.assignedTo,
      username: ticket.username,
      hostname: ticket.hostname,
      laptopSerial: ticket.laptopSerial,
      department: ticket.department,
    }));
    await prisma.ticket.createMany({ data: ticketData });

    // Restore Comments if present
    if (data.comments?.length) {
      const commentData = data.comments.map((comment: Record<string, unknown>) => ({
        id: comment.id,
        content: comment.content,
        ticketId: comment.ticketId,
        authorId: comment.authorId,
        createdAt: new Date(comment.createdAt as string),
      }));
      await prisma.comment.createMany({ data: commentData });
    }

    // Restore Audit Logs if present
    if (data.auditLogs?.length) {
      const auditLogData = data.auditLogs.map((log: Record<string, unknown>) => ({
        id: log.id,
        ticketId: log.ticketId,
        userId: log.userId,
        action: log.action,
        oldValue: log.oldValue,
        newValue: log.newValue,
        details: log.details,
        createdAt: new Date(log.createdAt as string),
      }));
      await prisma.auditLog.createMany({ data: auditLogData });
    }

    // Restore Config
    if (data.config?.length) {
      for (const conf of data.config) {
        await prisma.systemConfig.upsert({
          where: { key: conf.key },
          update: { value: conf.value },
          create: { key: conf.key, value: conf.value },
        });
      }
    }

    console.log(`[BACKUP RESTORE POST] Data restored successfully`);

    return NextResponse.json({ message: "Data restored successfully" });
  } catch (error) {
    console.error(`[BACKUP RESTORE POST] Error:`, error);
    return NextResponse.json({ error: "Failed to restore data: " + (error as Error).message }, { status: 500 });
  }
}
