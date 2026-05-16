/**
 * ============================================================================
 * UPDATES API ROUTE - Check for Application Updates
 * ============================================================================
 *
 * @module /api/updates/route
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import logger from "@/lib/logger";

interface UpdateInfo {
  version: string;
  releaseDate: string;
  releaseNotes: string;
  downloadUrl: string;
  mandatory: boolean;
}

const CURRENT_VERSION = "0.1.0";

const UPDATE_SERVER_URL = process.env.UPDATE_SERVER_URL;

/**
 * Fetches remote version info from update server
 * 
 * @returns Update info object or null if fetch fails
 */
async function fetchRemoteVersion(): Promise<UpdateInfo | null> {
  if (!UPDATE_SERVER_URL) {
    return null;
  }
  try {
    const res = await fetch(UPDATE_SERVER_URL, { 
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(5000)
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (error) {
    logger.error("[UPDATES] Failed to fetch remote version:", error);
  }
  return null;
}

/**
 * Compares two semantic version strings
 * 
 * @param v1 - First version string
 * @param v2 - Second version string
 * @returns 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split(".").map(Number);
  const parts2 = v2.split(".").map(Number);
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}

/**
 * GET /api/updates - Check for available updates (Admin only)
 * 
 * @param req - Next.js request with Authorization header
 * @returns Current version and update availability info
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const remoteUpdate = await fetchRemoteVersion();
  
  const hasUpdate = remoteUpdate && compareVersions(remoteUpdate.version, CURRENT_VERSION) > 0;

  return NextResponse.json({
    currentVersion: CURRENT_VERSION,
    hasUpdate,
    update: remoteUpdate,
    lastChecked: new Date().toISOString(),
  });
}

/**
 * POST /api/updates - Perform update actions (Admin only)
 * 
 * @param req - Request with action ('check' or 'download')
 * @returns Update check results or download info
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { action } = body;

    if (action === "check") {
      const remoteUpdate = await fetchRemoteVersion();
      const hasUpdate = remoteUpdate && compareVersions(remoteUpdate.version, CURRENT_VERSION) > 0;
      
      return NextResponse.json({
        currentVersion: CURRENT_VERSION,
        hasUpdate,
        update: remoteUpdate,
        checkedAt: new Date().toISOString(),
      });
    }

    if (action === "download") {
      const remoteUpdate = await fetchRemoteVersion();
      if (!remoteUpdate?.downloadUrl) {
        return NextResponse.json({ error: "No download URL available" }, { status: 400 });
      }

      return NextResponse.json({
        message: "For manual update, please download from the release page",
        downloadUrl: remoteUpdate.downloadUrl,
        version: remoteUpdate.version,
        releaseNotes: remoteUpdate.releaseNotes,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    logger.error("[UPDATES] Error:", error);
    return NextResponse.json({ error: "Failed to process update request" }, { status: 500 });
  }
}