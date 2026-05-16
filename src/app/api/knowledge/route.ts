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
import { validateAuth } from "@/lib/auth";
import { createKnowledgeArticleSchema, updateKnowledgeArticleSchema } from "@/lib/schemas";
import logger from "@/lib/logger";

export const dynamic = 'force-dynamic';

/**
 * GET /api/knowledge - Fetch knowledge base articles
 * 
 * @param req - Next.js request with optional query, category, limit, offset params
 * @returns Array of articles with total count
 */
export async function GET(req: NextRequest) {
  const auth = await validateAuth(req);
  const { searchParams } = new URL(req.url);


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


    return NextResponse.json({
      articles: articles.map(formatArticle),
      total, limit, offset,
    });
  } catch (error) {
    logger.error(`[KNOWLEDGE GET] Error:`, error);
    return NextResponse.json({ error: "Failed to fetch articles" }, { status: 500 });
  }
}

/**
 * POST /api/knowledge - Create a new knowledge article (Admin only)
 * 
 * @param req - Request containing article data in JSON body
 * @returns Created article
 */
export async function POST(req: NextRequest) {
  const auth = await validateAuth(req);

  if (!auth || auth.role !== "ADMINISTRATOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }


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


    return NextResponse.json(formatArticle(article), { status: 201 });
  } catch (error) {
    logger.error(`[KNOWLEDGE POST] Error:`, error);
    return NextResponse.json({ error: "Failed to create article" }, { status: 500 });
  }
}

/**
 * PATCH /api/knowledge - Update an existing article (Admin only)
 * 
 * @param req - Request containing article ID and fields to update
 * @returns Updated article
 */
export async function PATCH(req: NextRequest) {
  const auth = await validateAuth(req);

  if (!auth || auth.role !== "ADMINISTRATOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }


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


    return NextResponse.json(formatArticle(article));
  } catch (error) {
    logger.error(`[KNOWLEDGE PATCH] Error:`, error);
    return NextResponse.json({ error: "Failed to update article" }, { status: 500 });
  }
}

/**
 * DELETE /api/knowledge - Delete an article (Admin only)
 * 
 * @param req - Request containing article ID in JSON body
 * @returns Success confirmation
 */
export async function DELETE(req: NextRequest) {
  const auth = await validateAuth(req);

  if (!auth || auth.role !== "ADMINISTRATOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }


  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "Article ID is required" }, { status: 400 });
    }

    await prisma.knowledgeBaseArticle.delete({ where: { id } });


    return new NextResponse(null, { status: 204 });
  } catch (error) {
    logger.error(`[KNOWLEDGE DELETE] Error:`, error);
    return NextResponse.json({ error: "Failed to delete article" }, { status: 500 });
  }
}

/**
 * Formats knowledge article for API response
 * 
 * @param article - Raw article from database
 * @returns Formatted article with ISO date strings
 */
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