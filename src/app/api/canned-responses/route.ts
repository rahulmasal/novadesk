import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateAuth } from "@/lib/auth";
import logger from "@/lib/logger";

export const dynamic = 'force-dynamic';

/**
 * GET /api/canned-responses - List all canned responses
 */
export async function GET(req: NextRequest) {
  const auth = await validateAuth(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const responses = await prisma.cannedResponse.findMany({
      orderBy: { title: "asc" },
    });
    return NextResponse.json(responses);
  } catch (error) {
    logger.error("[CANNED RESPONSES GET] Error:", error);
    return NextResponse.json({ error: "Failed to fetch canned responses" }, { status: 500 });
  }
}

/**
 * POST /api/canned-responses - Create a canned response (admin/agent only)
 */
export async function POST(req: NextRequest) {
  const auth = await validateAuth(req);
  if (!auth || auth.role === "END_USER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { title, content, category } = await req.json();

    if (!title || !content) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
    }

    const response = await prisma.cannedResponse.create({
      data: { title, content, category },
    });

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    logger.error("[CANNED RESPONSES POST] Error:", error);
    return NextResponse.json({ error: "Failed to create canned response" }, { status: 500 });
  }
}

/**
 * DELETE /api/canned-responses - Delete a canned response (admin only)
 */
export async function DELETE(req: NextRequest) {
  const auth = await validateAuth(req);
  if (!auth || auth.role !== "ADMINISTRATOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    await prisma.cannedResponse.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    logger.error("[CANNED RESPONSES DELETE] Error:", error);
    return NextResponse.json({ error: "Failed to delete canned response" }, { status: 500 });
  }
}
