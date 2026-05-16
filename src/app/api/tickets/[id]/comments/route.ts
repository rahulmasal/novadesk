/**
 * ============================================================================
 * COMMENTS API ROUTE - Ticket Comments/Threading
 * ============================================================================
 *
 * @module /api/tickets/[id]/comments/route
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { validateAuth } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { createCommentSchema, updateCommentSchema } from "@/lib/schemas";
import logger from "@/lib/logger";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await validateAuth(req);
  const { id: ticketId } = await params;

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    if (auth.role === "END_USER" && ticket.createdById !== auth.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }


    const comments = await prisma.comment.findMany({
      where: { ticketId },
      include: { author: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    });


    return NextResponse.json(comments.map(formatComment));
  } catch (error) {
    logger.error(`[COMMENTS GET] Error:`, error);
    return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await validateAuth(req);
  const { id: ticketId } = await params;

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validationResult = createCommentSchema.safeParse(body);

    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0]?.message || "Validation failed";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { content } = validationResult.data;

    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    if (auth.role === "END_USER" && ticket.createdById !== auth.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }


    const comment = await prisma.comment.create({
      data: { content, ticketId, authorId: auth.userId },
      include: { author: { select: { id: true, name: true, email: true } } },
    });

    await logAuditEvent({
      ticketId,
      userId: auth.userId,
      action: "COMMENT_ADDED",
      details: `Comment added: ${content.substring(0, 100)}...`,
    });


    return NextResponse.json(formatComment(comment), { status: 201 });
  } catch (error) {
    logger.error(`[COMMENTS POST] Error:`, error);
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await validateAuth(req);
  const { id: ticketId } = await params;

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validationResult = updateCommentSchema.safeParse(body);

    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0]?.message || "Validation failed";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { id, content } = validationResult.data;

    const comment = await prisma.comment.findUnique({ where: { id } });

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    if (comment.ticketId !== ticketId) {
      return NextResponse.json({ error: "Comment does not belong to this ticket" }, { status: 403 });
    }

    if (comment.authorId !== auth.userId && auth.role !== "ADMINISTRATOR") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }


    const updatedComment = await prisma.comment.update({
      where: { id },
      data: { content },
      include: { author: { select: { id: true, name: true, email: true } } },
    });

    await logAuditEvent({
      ticketId: comment.ticketId,
      userId: auth.userId,
      action: "COMMENT_UPDATED",
      oldValue: comment.content,
      newValue: content,
    });


    return NextResponse.json(formatComment(updatedComment));
  } catch (error) {
    logger.error(`[COMMENTS PATCH] Error:`, error);
    return NextResponse.json({ error: "Failed to update comment" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await validateAuth(req);
  const { id: ticketId } = await params;

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "Comment ID is required" }, { status: 400 });
    }

    const comment = await prisma.comment.findUnique({ where: { id } });

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    if (comment.ticketId !== ticketId) {
      return NextResponse.json({ error: "Comment does not belong to this ticket" }, { status: 403 });
    }

    if (comment.authorId !== auth.userId && auth.role !== "ADMINISTRATOR") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }


    await prisma.comment.delete({ where: { id } });

    await logAuditEvent({
      ticketId: comment.ticketId,
      userId: auth.userId,
      action: "COMMENT_DELETED",
      details: "Comment deleted",
    });


    return new NextResponse(null, { status: 204 });
  } catch (error) {
    logger.error(`[COMMENTS DELETE] Error:`, error);
    return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 });
  }
}

function formatComment(comment: {
  id: string;
  content: string;
  ticketId: string;
  authorId: string;
  author: { id: string; name: string; email: string };
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: comment.id,
    content: comment.content,
    ticketId: comment.ticketId,
    authorId: comment.authorId,
    author: comment.author,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
  };
}