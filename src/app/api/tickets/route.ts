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
import { validateAuth } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import {
  createTicketSchema,
  updateTicketSchema,
  paginationSchema,
} from "@/lib/schemas";

export const dynamic = 'force-dynamic';

/**
 * GET /api/tickets - Retrieve tickets
 * 
 * WHAT IT DOES:
 * - Fetches tickets based on user role:
 *   - ADMINISTRATOR: sees all tickets
 *   - AGENT: sees tickets (assigned ones shown to agents)
 *   - END_USER: sees only their own created tickets
 * - Supports filtering by status, priority, category
 * - Supports pagination via limit/offset
 * 
 * @param req - Next.js request object with auth headers
 * @returns Array of formatted tickets
 */
export async function GET(req: NextRequest) {
  const auth = await validateAuth(req);
  const { searchParams } = new URL(req.url);

  const paginationResult = paginationSchema.safeParse({
    limit: searchParams.get("limit"),
    offset: searchParams.get("offset"),
  });

  const limit = paginationResult.success ? paginationResult.data.limit : 100;
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


    return NextResponse.json(tickets.map(formatTicket));
  } catch (error) {
    console.error("Error fetching tickets:", error);
    return NextResponse.json({ error: "Failed to fetch tickets" }, { status: 500 });
  }
}

/**
 * POST /api/tickets - Create a new ticket
 * 
 * WHAT IT DOES:
 * 1. Validates user authentication - rejects unauthenticated requests
 * 2. Validates request body against schema (title, description, etc.)
 * 3. Calculates due date based on priority if not provided:
 *    - URGENT: 2 hours
 *    - HIGH: 8 hours
 *    - MEDIUM: 24 hours
 *    - LOW: 72 hours
 * 4. Auto-assigns ticket to an AGENT using round-robin:
 *    - Finds all users with AGENT role
 *    - Uses systemConfig to track last assigned agent index
 *    - Distributes tickets evenly across all agents
 * 5. Creates ticket in database with creator info
 * 6. Logs audit event for tracking
 * 
 * @param req - Request containing ticket data in JSON body
 * @returns Created ticket with formatting applied
 * 
 * ROUND-ROBIN ASSIGNMENT LOGIC:
 * - Stores last assigned agent index in systemConfig table
 * - Next ticket goes to next agent in sequence (wraps around)
 * - Ensures fair distribution of workload
 */
export async function POST(req: NextRequest) {
  const auth = await validateAuth(req);

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
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

    /* ========================================
     * ROUND-ROBIN AUTO-ASSIGNMENT
     * ========================================
     * Finds all AGENTS and assigns ticket to next agent
     * in rotation to distribute workload evenly
     * ======================================== */
    let assignedToId: string | undefined;
    const agents = await prisma.user.findMany({
      where: { role: "AGENT" },
      orderBy: { id: "asc" },
    });
    
    if (agents.length > 0) {
      const lastAssignment = await prisma.systemConfig.findUnique({
        where: { key: "lastAssignedAgentIndex" },
      });
      let nextIndex = 0;
      // Increment index (wraps around using modulo)
      if (lastAssignment) {
        nextIndex = (parseInt(lastAssignment.value, 10) + 1) % agents.length;
        await prisma.systemConfig.update({
          where: { key: "lastAssignedAgentIndex" },
          data: { value: nextIndex.toString() },
        });
      } else {
        // First ticket - initialize config
        await prisma.systemConfig.create({
          data: { key: "lastAssignedAgentIndex", value: "0" },
        });
      }
      assignedToId = agents[nextIndex].id;
    }

    /* ========================================
     * CREATE TICKET IN DATABASE
     * ======================================== */
    const ticket = await prisma.ticket.create({
      data: {
        title: data.title,
        description: data.description,
        priority: data.priority || "MEDIUM",
        category: data.category || "SOFTWARE",
        status: "NEW",
        dueDate,
        createdById: auth.userId,
        assignedTo: assignedToId,
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
 * 
 * WHAT IT DOES:
 * - Only AGENTS and ADMINISTRATORS can update tickets
 * - Supports partial updates (only provided fields are changed)
 * - Validates updates against schema
 * - Logs audit event for tracking
 * 
 * UPDATABLE FIELDS:
 * - status: NEW, IN_PROGRESS, PENDING_VENDOR, RESOLVED, CLOSED
 * - assignedTo: Agent ID to reassign ticket
 * - priority: LOW, MEDIUM, HIGH, URGENT
 * 
 * @param req - Request with ticket ID and fields to update
 * @returns Updated ticket
 */
export async function PATCH(req: NextRequest) {
  const auth = await validateAuth(req);

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

    const { assignedTo, ...restUpdates } = updates;
    const updateData: Record<string, unknown> = {};
    if (restUpdates.title) updateData.title = restUpdates.title;
    if (restUpdates.description) updateData.description = restUpdates.description;
    if (restUpdates.priority) updateData.priority = restUpdates.priority;
    if (restUpdates.category) updateData.category = restUpdates.category;
    if (restUpdates.status) updateData.status = restUpdates.status;
    if (restUpdates.dueDate) updateData.dueDate = new Date(restUpdates.dueDate);
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo;

    const updatedTicket = await prisma.ticket.update({
      where: { id },
      data: updateData,
    });

    // Create notification when ticket is assigned
    if (assignedTo && assignedTo !== ticket.assignedTo) {
      await prisma.notification.create({
        data: {
          userId: assignedTo,
          type: "TICKET_ASSIGNED",
          subject: `Ticket Assigned: ${updatedTicket.title}`,
          body: `You have been assigned ticket #${updatedTicket.id.substring(0, 8)}`,
        },
      });
    }

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
 * 
 * WHAT IT DOES:
 * - Only ADMINISTRATORS can delete tickets (destructive operation)
 * - Deletes ticket and all related comments/attachments
 * - Logs audit event for tracking
 * 
 * @param req - Request with ticket ID in JSON body
 * @returns Success message
 */
export async function DELETE(req: NextRequest) {
  const auth = await validateAuth(req);

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

    if (!id) {
      console.error("[DELETE TICKET] Missing ID");
      return NextResponse.json({ error: "Ticket ID is required" }, { status: 400 });
    }

    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) {
      console.error("[DELETE TICKET] Not found - id:", id);
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }


await prisma.$transaction(async (tx) => {
       await tx.auditLog.create({
         data: {
           ticketId: id,
           userId: auth.userId,
           action: "TICKET_DELETED",
           details: `Ticket ${ticket.id} deleted`,
         },
       });

       await tx.ticket.delete({ where: { id } });
     });

    const verify = await prisma.ticket.findUnique({ where: { id } });

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

/**
 * formatTicket - Converts database ticket to frontend-friendly format
 * 
 * WHY NEEDED:
 * - Database returns Date objects, frontend needs ISO strings
 * - Renames createdById to createdBy for clarity
 * - Can be extended to include related user/tick info
 * 
 * @param ticket - Raw ticket from database
 * @returns Formatted ticket with ISO date strings
 */
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
    dueDate: ticket.dueDate?.toISOString() ?? new Date().toISOString(),
    createdBy: ticket.createdById,
    assignedTo: ticket.assignedTo,
    username: ticket.username,
    hostname: ticket.hostname,
    laptopSerial: ticket.laptopSerial,
    department: ticket.department,
    createdAt: ticket.createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAt: ticket.updatedAt?.toISOString() ?? new Date().toISOString(),
  };
}