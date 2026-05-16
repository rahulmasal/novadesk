/**
 * ============================================================================
 * SETTINGS API ROUTE - Save and Retrieve Application Settings
 * ============================================================================
 *
 * This API route handles persisting user preferences like theme, notifications,
 * and backup configuration to the database instead of localStorage.
 *
 * WHAT IT DOES:
 * - GET: Retrieves settings from systemConfig table in database
 * - POST: Saves settings to systemConfig table using upsert (create or update)
 *
 * SETTINGS STRUCTURE:
 * {
 *   notifications: { email: boolean, push: boolean, ticketAssignment: boolean },
 *   appearance: { theme: "dark" | "light" | "system", compactView: boolean },
 *   backup: { schedule: "daily" | "weekly" | "monthly", retentionDays: number },
 *   advanced: { timezone: string, language: string, slaResponseHours: number, slaResolutionHours: number }
 * }
 *
 * BEGINNER NOTES:
 * - systemConfig is a simple key-value table for storing app settings
 * - upsert() is like "insert or update" - creates if not exists, updates if exists
 * - Settings are stored as JSON string in the database
 *
 * @module /api/settings
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateAuth } from "@/lib/auth";
import logger from "@/lib/logger";

export const dynamic = 'force-dynamic';

/**
 * POST /api/settings - Save settings to database
 *
 * @param request - JSON body with { settings: { ... } }
 * @returns Success message
 *
 * @example
 * // Request body:
 * {
 *   "settings": {
 *     "appearance": { "theme": "dark", "compactView": false },
 *     "notifications": { "email": true, "push": true }
 *   }
 * }
 */
export async function POST(req: NextRequest) {
  const auth = await validateAuth(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { settings } = await req.json();

    // Serialize settings object to JSON string for storage
    const settingsJson = JSON.stringify(settings);

    // Use upsert to either create new or update existing settings
    await prisma.systemConfig.upsert({
      where: { key: "user-settings" },
      update: { value: settingsJson },
      create: { key: "user-settings", value: settingsJson },
    });

    // Recalculate due dates for open tickets if SLA settings changed
    const slaResH = settings.advanced?.slaResolutionHours ?? 0;
    const slaResM = settings.advanced?.slaResolutionMinutes ?? 0;
    const slaResolutionMinutes = slaResH * 60 + slaResM;
    if (slaResolutionMinutes > 0) {
      const openTickets = await prisma.ticket.findMany({
        where: { status: { notIn: ["RESOLVED", "CLOSED"] } },
      });

      for (const ticket of openTickets) {
        const multiplier = ticket.priority === "URGENT" ? 0.25 : ticket.priority === "HIGH" ? 0.5 : ticket.priority === "LOW" ? 2 : 1;
        const minutes = Math.max(1, Math.round(slaResolutionMinutes * multiplier));
        const newDueDate = new Date(ticket.createdAt.getTime() + minutes * 60 * 1000);
        await prisma.ticket.update({
          where: { id: ticket.id },
          data: { dueDate: newDueDate },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Failed to save settings:", error);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}

/**
 * GET /api/settings - Retrieve settings from database
 *
 * @returns Settings object or null if not found
 *
 * @example
 * // Response:
 * {
 *   "settings": {
 *     "appearance": { "theme": "dark", "compactView": false },
 *     "notifications": { "email": true, "push": true }
 *   }
 * }
 */
export async function GET() {
  try {
    // Look up settings by unique key
    const config = await prisma.systemConfig.findUnique({
      where: { key: "user-settings" },
    });

    // If settings exist, parse JSON and return; otherwise return null
    if (config) {
      return NextResponse.json({ settings: JSON.parse(config.value) });
    }

    return NextResponse.json({ settings: null });
  } catch (error) {
    logger.error("Failed to get settings:", error);
    return NextResponse.json({ error: "Failed to get settings" }, { status: 500 });
  }
}