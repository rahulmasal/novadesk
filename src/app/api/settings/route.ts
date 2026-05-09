import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

// Save settings to DB
export async function POST(request: NextRequest) {
  try {
    const { settings } = await request.json();
    
    // Save user settings to system_config
    const settingsJson = JSON.stringify(settings);
    
    await prisma.systemConfig.upsert({
      where: { key: "user-settings" },
      update: { value: settingsJson },
      create: { key: "user-settings", value: settingsJson },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save settings:", error);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}

// Get settings from DB
export async function GET() {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key: "user-settings" },
    });
    
    if (config) {
      return NextResponse.json({ settings: JSON.parse(config.value) });
    }
    
    return NextResponse.json({ settings: null });
  } catch (error) {
    console.error("Failed to get settings:", error);
    return NextResponse.json({ error: "Failed to get settings" }, { status: 500 });
  }
}