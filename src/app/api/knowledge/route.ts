/**
 * ============================================================================
 * KNOWLEDGE BASE API ROUTE - Self-Service Knowledge Articles
 * ============================================================================
 *
 * @module /api/knowledge/route
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { createKnowledgeArticleSchema, updateKnowledgeArticleSchema } from "@/lib/schemas";

export const dynamic = 'force-dynamic';

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

export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  const { searchParams } = new URL(req.url);

  console.log(`[KNOWLEDGE GET] Fetching articles`, { query: searchParams.get("query"), category: searchParams.get("category"), user: auth?.email });

  try {
    const query = searchParams.get("query") || "";
    const category = searchParams.get("category") || undefined;
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const where: Record<string, unknown> = {};

    if (!auth || auth.role !== "ADMINISTRATOR") {
      where.isPublished = true;
    }

    if (category) where.category = category;

    if (query) {
      where.OR = [
        { title: { contains: query, mode: "insensitive" } },
        { content: { contains: query, mode: "insensitive" } },
      ];
    }

    const [articles, total] = await Promise.all([
      prisma.knowledgeBaseArticle.findMany({
        where,
        orderBy: [{ viewCount: "desc" }, { createdAt: "desc" }],
        take: limit, skip: offset,
      }),
      prisma.knowledgeBaseArticle.count({ where }),
    ]);

    console.log(`[KNOWLEDGE GET] Returning ${articles.length} of ${total} articles`);

    return NextResponse.json({
      articles: articles.map(formatArticle),
      total, limit, offset,
    });
  } catch (error) {
    console.error(`[KNOWLEDGE GET] Error:`, error);
    return NextResponse.json({ error: "Failed to fetch articles" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);

  if (!auth || auth.role !== "ADMINISTRATOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  console.log(`[KNOWLEDGE POST] Creating article`, { user: auth.email });

  try {
    const body = await req.json();
    const validationResult = createKnowledgeArticleSchema.safeParse(body);

    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0]?.message || "Validation failed";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const data = validationResult.data;

    const article = await prisma.knowledgeBaseArticle.create({
      data: {
        title: data.title,
        content: data.content,
        category: data.category,
        tags: data.tags || [],
        isPublished: data.isPublished || false,
        createdBy: auth.userId,
      },
    });

    console.log(`[KNOWLEDGE POST] Article created`, { articleId: article.id, title: article.title });

    return NextResponse.json(formatArticle(article), { status: 201 });
  } catch (error) {
    console.error(`[KNOWLEDGE POST] Error:`, error);
    return NextResponse.json({ error: "Failed to create article" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await getAuthUser(req);

  if (!auth || auth.role !== "ADMINISTRATOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  console.log(`[KNOWLEDGE PATCH] Updating article`, { user: auth.email });

  try {
    const body = await req.json();
    const validationResult = updateKnowledgeArticleSchema.safeParse(body);

    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0]?.message || "Validation failed";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { id, ...updates } = validationResult.data;

    const article = await prisma.knowledgeBaseArticle.update({
      where: { id },
      data: updates,
    });

    console.log(`[KNOWLEDGE PATCH] Article updated`, { articleId: id });

    return NextResponse.json(formatArticle(article));
  } catch (error) {
    console.error(`[KNOWLEDGE PATCH] Error:`, error);
    return NextResponse.json({ error: "Failed to update article" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await getAuthUser(req);

  if (!auth || auth.role !== "ADMINISTRATOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  console.log(`[KNOWLEDGE DELETE] Deleting article`, { user: auth.email });

  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "Article ID is required" }, { status: 400 });
    }

    await prisma.knowledgeBaseArticle.delete({ where: { id } });

    console.log(`[KNOWLEDGE DELETE] Article deleted`, { articleId: id });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(`[KNOWLEDGE DELETE] Error:`, error);
    return NextResponse.json({ error: "Failed to delete article" }, { status: 500 });
  }
}

function formatArticle(article: {
  id: string; title: string; content: string; category: string; tags: string[];
  relatedTickets: string[]; viewCount: number; isPublished: boolean;
  createdBy: string; createdAt: Date; updatedAt: Date;
}) {
  return {
    id: article.id, title: article.title, content: article.content,
    category: article.category, tags: article.tags, relatedTickets: article.relatedTickets,
    viewCount: article.viewCount, isPublished: article.isPublished,
    createdBy: article.createdBy, createdAt: article.createdAt.toISOString(),
    updatedAt: article.updatedAt.toISOString(),
  };
}