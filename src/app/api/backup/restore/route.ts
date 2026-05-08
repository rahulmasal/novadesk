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

export async function POST(req: Request) {
  console.log(`[BACKUP RESTORE POST] Starting data restore`);

  try {
    const body = await req.json();
    const { data } = body;

    if (!data || !data.users || !data.tickets) {
      console.log(`[BACKUP RESTORE POST] Invalid backup format`);
      return NextResponse.json({ error: "Invalid backup format" }, { status: 400 });
    }

    // Hash the default password once before the transaction
    // so we don't block the DB connection with slow bcrypt calls
    const defaultPassword = await bcrypt.hash("P@ss@4321", 12);

    // Using a transaction to ensure data integrity
    await prisma.$transaction(async (tx) => {
      // Clear existing data (caution!)
      // In a real app, you might want to merge or use a different strategy
      await tx.comment.deleteMany();
      await tx.auditLog.deleteMany();
      await tx.attachment.deleteMany();
      await tx.ticket.deleteMany();
      await tx.session.deleteMany();
      await tx.user.deleteMany();

      // Restore Users
      for (const user of data.users) {
        await tx.user.create({
          data: {
            id: user.id,
            email: user.email,
            password: user.password || defaultPassword,
            name: user.name,
            role: user.role,
            department: user.department,
            createdAt: new Date(user.createdAt),
          }
        });
      }

      // Restore Tickets
      for (const ticket of data.tickets) {
        await tx.ticket.create({
          data: {
            id: ticket.id,
            title: ticket.title,
            description: ticket.description,
            priority: ticket.priority,
            category: ticket.category,
            status: ticket.status,
            dueDate: new Date(ticket.dueDate),
            createdAt: new Date(ticket.createdAt),
            createdById: ticket.createdById,
            assignedTo: ticket.assignedTo,
            username: ticket.username,
            hostname: ticket.hostname,
            laptopSerial: ticket.laptopSerial,
            department: ticket.department,
          }
        });

        // Restore Comments if present
        if (ticket.comments) {
          for (const comment of ticket.comments) {
            await tx.comment.create({
              data: {
                id: comment.id,
                content: comment.content,
                ticketId: ticket.id,
                authorId: comment.authorId,
                createdAt: new Date(comment.createdAt),
              }
            });
          }
        }

        // Restore Audit Logs if present
        if (ticket.auditLogs) {
          for (const log of ticket.auditLogs) {
            await tx.auditLog.create({
              data: {
                id: log.id,
                ticketId: ticket.id,
                userId: log.userId,
                action: log.action,
                oldValue: log.oldValue,
                newValue: log.newValue,
                details: log.details,
                createdAt: new Date(log.createdAt),
              }
            });
          }
        }
      }

      // Restore Config
      if (data.config) {
        for (const conf of data.config) {
          await tx.systemConfig.upsert({
            where: { key: conf.key },
            update: { value: conf.value },
            create: { key: conf.key, value: conf.value },
          });
        }
      }
    });

    console.log(`[BACKUP RESTORE POST] Data restored successfully`);

    return NextResponse.json({ message: "Data restored successfully" });
  } catch (error) {
    console.error(`[BACKUP RESTORE POST] Error:`, error);
    return NextResponse.json({ error: "Failed to restore data: " + (error as Error).message }, { status: 500 });
  }
}
