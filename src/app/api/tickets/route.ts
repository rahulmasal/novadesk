/**
 * ============================================================================
 * TICKETS API ROUTE - Main CRUD Operations for IT Support Tickets
 * ============================================================================
 *
 * This file handles all ticket-related HTTP requests:
 * - GET    : Retrieve tickets (filtered by user role)
 * - POST   : Create a new ticket
 * - PATCH  : Update ticket status (Agents/Admins only)
 * - DELETE : Remove a ticket (Admins only)
 *
 * @module /api/tickets/route
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import {
  createTicketSchema,
  updateTicketSchema,
  paginationSchema,
} from "@/lib/schemas";

export const dynamic = 'force-dynamic';

/**
 * GET /api/tickets - Retrieve tickets
 */
export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  const { searchParams } = new URL(req.url);

  const paginationResult = paginationSchema.safeParse({
    limit: searchParams.get("limit"),
    offset: searchParams.get("offset"),
  });

  const limit = paginationResult.success ? paginationResult.data.limit : 20;
  const offset = paginationResult.success ? paginationResult.data.offset : 0;

  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const category = searchParams.get("category");

  try {
    const where: Record<string, unknown> = {};

    if (auth?.role === "END_USER") {
      where.createdById = auth.userId;
    }

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (category) where.category = category;

    const tickets = await prisma.ticket.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    console.log(`[GET TICKETS] Returning ${tickets.length} tickets for role ${auth?.role} user ${auth?.email} (ids: ${tickets.map(t => t.id).join(",")})`);

    return NextResponse.json(tickets.map(formatTicket));
  } catch (error) {
    console.error("Error fetching tickets:", error);
    return NextResponse.json({ error: "Failed to fetch tickets" }, { status: 500 });
  }
}

/**
 * POST /api/tickets - Create a new ticket
 */
export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    console.log("[POST TICKET] Body:", JSON.stringify(body));
    const validationResult = createTicketSchema.safeParse(body);

    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0]?.message || "Validation failed";
      console.error("[POST TICKET] Validation failed:", JSON.stringify(validationResult.error.issues));
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const data = validationResult.data;

    let dueDate: Date;
    if (data.dueDate) {
      dueDate = new Date(data.dueDate);
    } else {
      const hours = data.priority === "URGENT" ? 2 : data.priority === "HIGH" ? 8 : data.priority === "LOW" ? 72 : 24;
      dueDate = new Date(Date.now() + hours * 60 * 60 * 1000);
    }

    const ticket = await prisma.ticket.create({
      data: {
        title: data.title,
        description: data.description,
        priority: data.priority || "MEDIUM",
        category: data.category || "SOFTWARE",
        status: "NEW",
        dueDate,
        createdById: auth.userId,
        username: data.username || auth.email.split("@")[0],
        hostname: data.hostname,
        laptopSerial: data.laptopSerial,
        department: data.department || "General",
      },
    });

    await logAuditEvent({
      ticketId: ticket.id,
      userId: auth.userId,
      action: "TICKET_CREATED",
      details: `Ticket created: ${ticket.title}`,
    });

    return NextResponse.json(formatTicket(ticket), { status: 201 });
  } catch (error) {
    console.error("Error creating ticket:", error);
    return NextResponse.json({ error: "Failed to create ticket" }, { status: 500 });
  }
}

/**
 * PATCH /api/tickets - Update ticket status or fields
 */
export async function PATCH(req: NextRequest) {
  const auth = await getAuthUser(req);

  if (!auth || (auth.role !== "AGENT" && auth.role !== "ADMINISTRATOR")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const validationResult = updateTicketSchema.safeParse(body);

    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0]?.message || "Validation failed";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { id, ...updates } = validationResult.data;

    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (updates.title) updateData.title = updates.title;
    if (updates.description) updateData.description = updates.description;
    if (updates.priority) updateData.priority = updates.priority;
    if (updates.category) updateData.category = updates.category;
    if (updates.status) updateData.status = updates.status;
    if (updates.dueDate) updateData.dueDate = new Date(updates.dueDate);
    if (updates.assignedTo !== undefined) updateData.assignedTo = updates.assignedTo;

    const updatedTicket = await prisma.ticket.update({
      where: { id },
      data: updateData,
    });

    await logAuditEvent({
      ticketId: id,
      userId: auth.userId,
      action: "TICKET_UPDATED",
      details: JSON.stringify(updates),
    });

    return NextResponse.json(formatTicket(updatedTicket));
  } catch (error) {
    console.error("Error updating ticket:", error);
    return NextResponse.json({ error: "Failed to update ticket" }, { status: 500 });
  }
}

/**
 * DELETE /api/tickets - Remove a ticket (Admin only)
 */
export async function DELETE(req: NextRequest) {
  console.log("[DELETE TICKET] Request received");
  const auth = await getAuthUser(req);
  console.log("[DELETE TICKET] Auth result:", JSON.stringify({ hasAuth: !!auth, role: auth?.role, userId: auth?.userId, email: auth?.email }));

  if (!auth) {
    console.error("[DELETE TICKET] No auth - returning 401");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (auth.role !== "ADMINISTRATOR") {
    console.error("[DELETE TICKET] Forbidden - role mismatch - got:", auth.role, "expected: ADMINISTRATOR");
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { id } = body;
    console.log("[DELETE TICKET] Request body:", body);

    if (!id) {
      console.error("[DELETE TICKET] Missing ID");
      return NextResponse.json({ error: "Ticket ID is required" }, { status: 400 });
    }

    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) {
      console.error("[DELETE TICKET] Not found - id:", id);
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    console.log("[DELETE TICKET] Deleting:", { id, title: ticket.title, user: auth.email });

    await prisma.$transaction(async (tx) => {
      await tx.auditLog.create({
        data: {
          ticketId: id,
          userId: auth.userId,
          action: "TICKET_DELETED",
          details: `Ticket deleted: ${ticket.title}`,
        },
      });

      await tx.ticket.delete({ where: { id } });
    });

    const verify = await prisma.ticket.findUnique({ where: { id } });
    console.log("[DELETE TICKET] Verification - still exists:", verify !== null);

    if (verify !== null) {
      console.error("[DELETE TICKET] FATAL: Ticket still exists after delete!");
      return NextResponse.json({ error: "Delete verification failed" }, { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[DELETE TICKET] Error:", error);
    return NextResponse.json({ error: "Failed to delete ticket" }, { status: 500 });
  }
}

// Helper functions
async function getAuthUser(req: NextRequest): Promise<{ role: string; userId: string; email: string } | null> {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) return null;

  try {
    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      return null;
    }

    return { role: session.user.role, userId: session.userId, email: session.user.email };
  } catch {
    return null;
  }
}

function formatTicket(ticket: {
  id: string;
  title: string;
  description: string;
  priority: string;
  category: string;
  status: string;
  dueDate: Date;
  createdById: string;
  assignedTo: string | null;
  username: string;
  hostname: string | null;
  laptopSerial: string | null;
  department: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: ticket.id,
    title: ticket.title,
    description: ticket.description,
    priority: ticket.priority,
    category: ticket.category,
    status: ticket.status,
    dueDate: ticket.dueDate.toISOString(),
    createdBy: ticket.createdById,
    assignedTo: ticket.assignedTo,
    username: ticket.username,
    hostname: ticket.hostname,
    laptopSerial: ticket.laptopSerial,
    department: ticket.department,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
  };
}