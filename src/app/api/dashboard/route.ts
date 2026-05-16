/**
 * ============================================================================
 * DASHBOARD API ROUTE - User Dashboard Layout Customization
 * ============================================================================
 *
 * @module /api/dashboard/route
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { validateAuth } from "@/lib/auth";
import { updateDashboardLayoutSchema } from "@/lib/schemas";

export const dynamic = 'force-dynamic';

const defaultLayout = {
  widgets: [
    { id: "scorecards", type: "scorecards", visible: true, position: { x: 0, y: 0, w: 12, h: 2 } },
    { id: "charts", type: "charts", visible: true, position: { x: 0, y: 2, w: 6, h: 4 } },
    { id: "activity", type: "activity", visible: true, position: { x: 6, y: 2, w: 6, h: 4 } },
    { id: "tickets", type: "tickets", visible: true, position: { x: 0, y: 6, w: 12, h: 4 } },
    { id: "sla", type: "sla", visible: true, position: { x: 0, y: 10, w: 6, h: 3 } },
    { id: "quick-actions", type: "quick-actions", visible: true, position: { x: 6, y: 10, w: 6, h: 3 } },
  ],
};

/**
 * GET /api/dashboard - Fetch user's dashboard layout
 * 
 * @param req - Next.js request with Authorization header
 * @returns Dashboard layout configuration
 */
export async function GET(req: NextRequest) {
  const auth = await validateAuth(req);

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }


  try {
    let layout = await prisma.dashboardLayout.findUnique({
      where: { userId: auth.userId },
    });

    if (!layout) {
      layout = await prisma.dashboardLayout.create({
        data: { userId: auth.userId, layout: defaultLayout },
      });
    }


    return NextResponse.json({
      id: layout.id,
      layout: layout.layout,
      updatedAt: layout.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error(`[DASHBOARD GET] Error:`, error);
    return NextResponse.json({ error: "Failed to fetch dashboard layout" }, { status: 500 });
  }
}

/**
 * PUT /api/dashboard - Save user's dashboard layout
 * 
 * @param req - Request containing layout configuration in JSON body
 * @returns Updated dashboard layout
 */
export async function PUT(req: NextRequest) {
  const auth = await validateAuth(req);

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }


  try {
    const body = await req.json();
    const validationResult = updateDashboardLayoutSchema.safeParse(body);

    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0]?.message || "Validation failed";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { layout } = validationResult.data;

    const updatedLayout = await prisma.dashboardLayout.upsert({
      where: { userId: auth.userId },
      update: { layout },
      create: { userId: auth.userId, layout },
    });


    return NextResponse.json({
      id: updatedLayout.id,
      layout: updatedLayout.layout,
      updatedAt: updatedLayout.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error(`[DASHBOARD PUT] Error:`, error);
    return NextResponse.json({ error: "Failed to update dashboard layout" }, { status: 500 });
  }
}