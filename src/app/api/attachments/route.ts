/**
 * ATTACHMENTS API ROUTE - File Upload Management
 *
 * @module /api/attachments/route
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import prisma from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { supabaseAdmin, STORAGE_BUCKETS, getAttachmentUrl, getLocalAttachmentUrl, isSupabaseConfigured } from "@/lib/supabase";
import { writeFile, mkdir, unlink } from "fs/promises";
import { join, dirname } from "path";

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_MIME_TYPES = [
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
];

/**
 * Extracts and validates authenticated user from request header
 * 
 * @param req - Next.js request with Authorization header containing Bearer token
 * @returns User object with role, userId, email or null if not authenticated
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

/**
 * POST /api/attachments - Upload a file attachment to a ticket
 * 
 * @param req - FormData containing file and ticketId
 * @returns Created attachment object
 */
export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log(`[ATTACHMENTS POST] Uploading attachment`, { user: auth.email });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const ticketId = formData.get("ticketId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ticketId) {
      return NextResponse.json({ error: "Ticket ID is required" }, { status: 400 });
    }

    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    if (auth.role === "END_USER" && ticket.createdById !== auth.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB` }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
    }

    const fileExt = file.name.split(".").pop() || "";
    const uniqueFilename = `${ticketId}/${uuidv4()}.${fileExt}`;

    const arrayBuffer = await file.arrayBuffer();

    let fileUrl: string;

    if (isSupabaseConfigured()) {
      const buffer = Buffer.from(arrayBuffer);
      const { error: uploadError } = await supabaseAdmin.storage
        .from(STORAGE_BUCKETS.ATTACHMENTS)
        .upload(uniqueFilename, buffer, { contentType: file.type, upsert: false });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
      }
      fileUrl = getAttachmentUrl(uniqueFilename);
    } else {
      // Local file storage for non-Supabase setups
      try {
        const uploadDir = join(process.cwd(), "uploads", uniqueFilename);
        const dirPath = dirname(uploadDir);
        await mkdir(dirPath, { recursive: true });
        await writeFile(uploadDir, new Uint8Array(arrayBuffer));
        fileUrl = getLocalAttachmentUrl(uniqueFilename);
      } catch (writeErr: unknown) {
        const errMsg = writeErr instanceof Error ? writeErr.message : String(writeErr);
        console.error("[ATTACHMENTS] Local file write error:", writeErr);
        return NextResponse.json({ error: `Failed to save file locally: ${errMsg}` }, { status: 500 });
      }
    }

    const attachment = await prisma.attachment.create({
      data: {
        filename: file.name,
        url: fileUrl,
        mimeType: file.type,
        size: file.size,
        ticketId,
        uploadedBy: auth.userId,
      },
    });

    await logAuditEvent({
      ticketId,
      userId: auth.userId,
      action: "ATTACHMENT_ADDED",
      newValue: file.name,
      details: `File uploaded: ${file.name} (${(file.size / 1024).toFixed(1)}KB)`,
    });

    console.log(`[ATTACHMENTS POST] Attachment uploaded`, { attachmentId: attachment.id, filename: file.name, ticketId });

    return NextResponse.json({
      id: attachment.id,
      filename: attachment.filename,
      url: attachment.url,
      mimeType: attachment.mimeType,
      size: attachment.size,
      createdAt: attachment.createdAt.toISOString(),
    }, { status: 201 });
  } catch (error) {
    console.error(`[ATTACHMENTS POST] Error:`, error);
    return NextResponse.json({ error: "Failed to create attachment" }, { status: 500 });
  }
}

/**
 * GET /api/attachments - Fetch attachments for a specific ticket
 * 
 * @param req - Next.js request with ticketId query parameter
 * @returns Array of attachment objects
 */
export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const ticketId = searchParams.get("ticketId");

  if (!ticketId) {
    return NextResponse.json({ error: "Ticket ID is required" }, { status: 400 });
  }

  console.log(`[ATTACHMENTS GET] Fetching attachments`, { ticketId, user: auth.email });

  try {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    if (auth.role === "END_USER" && ticket.createdById !== auth.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const attachments = await prisma.attachment.findMany({
      where: { ticketId },
      orderBy: { createdAt: "desc" },
    });

    console.log(`[ATTACHMENTS GET] Returning ${attachments.length} attachments`);

    return NextResponse.json(attachments.map((a: { id: string; filename: string; url: string; mimeType: string; size: number; createdAt: Date }) => ({
      id: a.id, filename: a.filename, url: a.url, mimeType: a.mimeType, size: a.size, createdAt: a.createdAt.toISOString(),
    })));
  } catch (error) {
    console.error(`[ATTACHMENTS GET] Error:`, error);
    return NextResponse.json({ error: "Failed to fetch attachments" }, { status: 500 });
  }
}

/**
 * DELETE /api/attachments - Delete an attachment
 * 
 * @param req - Request containing attachment ID in JSON body
 * @returns Success confirmation
 */
export async function DELETE(req: NextRequest) {
  const auth = await getAuthUser(req);

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log(`[ATTACHMENTS DELETE] Deleting attachment`, { user: auth.email });

  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "Attachment ID is required" }, { status: 400 });
    }

    const attachment = await prisma.attachment.findUnique({ where: { id } });

    if (!attachment) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }

    const ticket = await prisma.ticket.findUnique({ where: { id: attachment.ticketId } });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    if (attachment.uploadedBy !== auth.userId && ticket.createdById !== auth.userId && auth.role !== "ADMINISTRATOR") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (isSupabaseConfigured()) {
      const urlPath = attachment.url.split(`${STORAGE_BUCKETS.ATTACHMENTS}/`)[1];
      if (urlPath) {
        await supabaseAdmin.storage.from(STORAGE_BUCKETS.ATTACHMENTS).remove([urlPath]);
      }
    } else {
      // Delete local file
      const filePath = join(process.cwd(), "uploads", attachment.url.split("/api/attachments/file/")[1]);
      try {
        await unlink(filePath);
      } catch (err) {
        console.error("Failed to delete local file:", err);
      }
    }

    await prisma.attachment.delete({ where: { id } });

    await logAuditEvent({
      ticketId: attachment.ticketId,
      userId: auth.userId,
      action: "ATTACHMENT_DELETED",
      oldValue: attachment.filename,
    });

    console.log(`[ATTACHMENTS DELETE] Attachment deleted`, { attachmentId: id });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(`[ATTACHMENTS DELETE] Error:`, error);
    return NextResponse.json({ error: "Failed to delete attachment" }, { status: 500 });
  }
}