import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
  const status = {
    api: { status: "operational", responseTime: 0 },
    database: { status: "operational", responseTime: 0 },
    websocket: { status: "unknown", connected: false },
  };

  const startDb = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    status.database.responseTime = Date.now() - startDb;
    status.database.status = "operational";
  } catch {
    status.database.status = "error";
  }

  const startApi = Date.now();
  status.api.responseTime = Date.now() - startApi;
  status.api.status = "operational";

  return NextResponse.json(status, {
    headers: { "Cache-Control": "no-store" },
  });
}