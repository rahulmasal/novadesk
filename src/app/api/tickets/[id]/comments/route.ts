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
import { logAuditEvent } from "@/lib/audit";
import { createCommentSchema, updateCommentSchema } from "@/lib/schemas";

/**
 * Extracts and validates authenticated user from request header
 */
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

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUser(req);
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

    console.log(`[COMMENTS GET] Fetching comments for ticket`, { ticketId, user: auth.email });

    const comments = await prisma.comment.findMany({
      where: { ticketId },
      include: { author: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    });

    console.log(`[COMMENTS GET] Returning ${comments.length} comments`);

    return NextResponse.json(comments.map(formatComment));
  } catch (error) {
    console.error(`[COMMENTS GET] Error:`, error);
    return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUser(req);
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

    console.log(`[COMMENTS POST] Creating comment for ticket`, { ticketId, user: auth.email });

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

    console.log(`[COMMENTS POST] Comment created`, { commentId: comment.id });

    return NextResponse.json(formatComment(comment), { status: 201 });
  } catch (error) {
    console.error(`[COMMENTS POST] Error:`, error);
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUser(req);
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

    console.log(`[COMMENTS PATCH] Updating comment`, { commentId: id, ticketId, user: auth.email });

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

    console.log(`[COMMENTS PATCH] Comment updated`, { commentId: updatedComment.id });

    return NextResponse.json(formatComment(updatedComment));
  } catch (error) {
    console.error(`[COMMENTS PATCH] Error:`, error);
    return NextResponse.json({ error: "Failed to update comment" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUser(req);
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

    console.log(`[COMMENTS DELETE] Deleting comment`, { commentId: id, ticketId, user: auth.email });

    await prisma.comment.delete({ where: { id } });

    await logAuditEvent({
      ticketId: comment.ticketId,
      userId: auth.userId,
      action: "COMMENT_DELETED",
      details: "Comment deleted",
    });

    console.log(`[COMMENTS DELETE] Comment deleted`, { commentId: id });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(`[COMMENTS DELETE] Error:`, error);
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