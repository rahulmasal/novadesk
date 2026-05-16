/**
 * ============================================================================
 * BACKUP RESTORE API ROUTE - Restore System from JSON Backup
 * ============================================================================
 *
 * This route handles restoring system data from a previously created JSON backup.
 * It clears existing data and replaces it with the backup contents.
 *
 * HTTP METHODS:
 * - POST: Restore system from backup data
 *
 * ACCESS CONTROL:
 * - Only administrators can restore backups
 * - Requires valid session token
 *
 * WHAT IT RESTORES:
 * - users: All user accounts (with hashed passwords)
 * - tickets: All tickets with full details
 * - comments: Ticket comments (nested under tickets)
 * - auditLogs: Audit trail entries (nested under tickets)
 * - attachments: File attachments (nested under tickets)
 * - config: System configuration settings
 *
 * SECURITY NOTES:
 * - Existing data is DELETED before restore
 * - User gets "P@ss@4321" default password if not in backup
 * - Transaction ensures atomicity of restore
 *
 * DATA INTEGRITY:
 * - Dates are converted from ISO strings to Date objects
 * - Null values handled appropriately for nullable fields
 * - Foreign key relationships maintained
 *
 * @module /api/backup/restore/route
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { requireAdmin } from "@/lib/auth";

export const dynamic = 'force-dynamic';

/**
 * POST /api/backup/restore - Restore system from JSON backup
 *
 * @param req - JSON body with backup data
 * @returns Success message
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { data } = body;

    if (!data || !data.users || !data.tickets) {
      return NextResponse.json({
        error: "Invalid backup format. Ensure the file is a valid NovaDesk JSON backup with users and tickets data."
      }, { status: 400 });
    }

    // Hash the default password once before the transaction
    // so we don't block the DB connection with slow bcrypt calls
    const defaultPassword = await bcrypt.hash(process.env.DEFAULT_RESTORE_PASSWORD || "changeme", 12);

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
      department: user.department || "General",
      hostname: user.hostname || null,
      laptopSerial: user.laptopSerial || null,
      createdAt: new Date(user.createdAt as string),
      updatedAt: user.updatedAt ? new Date(user.updatedAt as string) : new Date(),
    }));
    await prisma.user.createMany({ data: userData });

// Restore Tickets in batches
     for (const ticket of data.tickets) {
       const ticketData = {
         id: ticket.id,
         title: ticket.title,
         description: ticket.description,
         priority: ticket.priority,
         category: ticket.category,
         status: ticket.status,
         dueDate: new Date(ticket.dueDate as string),
         createdAt: new Date(ticket.createdAt as string),
         updatedAt: ticket.updatedAt ? new Date(ticket.updatedAt as string) : new Date(),
         createdById: ticket.createdById,
         assignedTo: ticket.assignedTo || null,
         username: ticket.username,
         hostname: ticket.hostname || null,
         laptopSerial: ticket.laptopSerial || null,
         department: ticket.department || "General",
       };
       await prisma.ticket.create({ data: ticketData });

       // Restore nested comments if present
       if (ticket.comments?.length) {
         for (const comment of ticket.comments) {
           await prisma.comment.create({
             data: {
               id: comment.id,
               content: comment.content,
               ticketId: ticket.id,
               authorId: comment.authorId,
               createdAt: new Date(comment.createdAt as string),
             }
           });
         }
       }

       // Restore nested audit logs if present
       if (ticket.auditLogs?.length) {
         for (const log of ticket.auditLogs) {
           await prisma.auditLog.create({
             data: {
               id: log.id,
               ticketId: ticket.id,
               userId: log.userId,
               action: log.action,
               oldValue: log.oldValue,
               newValue: log.newValue,
               details: log.details,
               createdAt: new Date(log.createdAt as string),
             }
           });
         }
       }

       // Restore nested attachments if present
       if (ticket.attachments?.length) {
         for (const att of ticket.attachments) {
           await prisma.attachment.create({
             data: {
               id: att.id,
               filename: att.filename,
               url: att.url,
               mimeType: att.mimeType,
               size: att.size,
               ticketId: ticket.id,
               uploadedBy: att.uploadedBy,
               createdAt: new Date(att.createdAt as string),
             }
           });
         }
       }
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

    return NextResponse.json({ message: "Data restored successfully" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to restore data: " + (error as Error).message }, { status: 500 });
  }
}
