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

    console.log(`[BACKUP RESTORE POST] Data restored successfully`);

    return NextResponse.json({ message: "Data restored successfully" });
  } catch (error) {
    console.error(`[BACKUP RESTORE POST] Error:`, error);
    return NextResponse.json({ error: "Failed to restore data: " + (error as Error).message }, { status: 500 });
  }
}
