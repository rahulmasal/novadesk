/**
 * ============================================================================
 * SETUP COMPLETE API ROUTE
 * ============================================================================
 *
 * This endpoint completes the initial setup wizard:
 * 1. Creates the administrator user
 * 2. Sets the organization name
 * 3. Marks setup as complete in SystemConfig
 *
 * @module /api/setup/complete/route
 */

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { setupWizardSchema } from "@/lib/schemas";
import fs from "fs/promises";
import path from "path";

// bcrypt salt rounds (higher = more secure but slower)
const BCRYPT_SALT_ROUNDS = 12;

// Setup lock expiry - prevents race conditions
const SETUP_LOCK_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

export async function POST(req: Request) {
  console.log(`[SETUP COMPLETE POST] Starting setup completion`);

  try {
    const body = await req.json();
    const validationResult = setupWizardSchema.safeParse(body);

    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0]?.message || "Validation failed";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { organizationName, adminEmail, adminPassword, adminName, databaseUrl } = validationResult.data;

    // Persist the database URL to .env file
    try {
      const envPath = path.join(process.cwd(), ".env");
      let envContent = "";
      
      try {
        envContent = await fs.readFile(envPath, "utf-8");
      } catch {
        // .env doesn't exist, create it
        envContent = "";
      }

      const dbUrlLine = `DATABASE_URL="${databaseUrl}"`;
      
      if (envContent.includes("DATABASE_URL=")) {
        envContent = envContent.replace(/DATABASE_URL=".*"|DATABASE_URL=.*/, dbUrlLine);
      } else {
        envContent += `\n${dbUrlLine}\n`;
      }

      await fs.writeFile(envPath, envContent.trim() + "\n");
      
      // Update process.env for the current process
      process.env.DATABASE_URL = databaseUrl;
    } catch (fsError) {
      console.error("Failed to write to .env file:", fsError);
      // Continue anyway, as we can still complete the setup in the current process
    }

    // Initialize Prisma with the new URL
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
    });

    try {
      // Check if setup is already complete (idempotent check)
      const existingSetup = await prisma.systemConfig.findUnique({
        where: { key: "setup_completed" },
      });

      if (existingSetup?.value === "true") {
        await prisma.$disconnect();
        return NextResponse.json(
          { error: "Setup has already been completed" },
          { status: 409 }
        );
      }

      // Check for existing admin user (another form of idempotency)
      const existingAdmin = await prisma.user.findFirst({
        where: { role: "ADMINISTRATOR" },
      });

      if (existingAdmin) {
        await prisma.$disconnect();
        return NextResponse.json(
          { error: "An administrator already exists. Setup cannot be repeated." },
          { status: 409 }
        );
      }

      // Create a lock to prevent race conditions
      const lockKey = "setup_in_progress";
      const existingLock = await prisma.systemConfig.findUnique({
        where: { key: lockKey },
      });

      if (existingLock) {
        const lockTime = new Date(existingLock.value);
        const now = new Date();
        
        // If lock is older than 5 minutes, it's stale - we can proceed
        if (now.getTime() - lockTime.getTime() < SETUP_LOCK_EXPIRY_MS) {
          await prisma.$disconnect();
          return NextResponse.json(
            { error: "Setup is already in progress. Please wait a few moments." },
            { status: 409 }
          );
        }
      }

      // Set up the lock
      await prisma.systemConfig.upsert({
        where: { key: lockKey },
        update: { value: new Date().toISOString() },
        create: { key: lockKey, value: new Date().toISOString() },
      });

      try {
        // Hash the admin password
        const hashedPassword = await bcrypt.hash(adminPassword, BCRYPT_SALT_ROUNDS);

        // Create the administrator user
        const adminUser = await prisma.user.create({
          data: {
            email: adminEmail.toLowerCase(),
            password: hashedPassword,
            name: adminName,
            role: "ADMINISTRATOR",
            department: "IT",
          },
        });

        // Store organization name in system config
        await prisma.systemConfig.upsert({
          where: { key: "organization_name" },
          update: { value: organizationName },
          create: { key: "organization_name", value: organizationName },
        });

        // Mark setup as complete
        await prisma.systemConfig.upsert({
          where: { key: "setup_completed" },
          update: { value: "true" },
          create: { key: "setup_completed", value: "true" },
        });

        // Remove the lock
        await prisma.systemConfig.delete({
          where: { key: lockKey },
        }).catch(() => {}); // Ignore if lock already deleted

        await prisma.$disconnect();

        console.log(`[SETUP COMPLETE POST] Setup completed`, { adminId: adminUser.id, organizationName });

        return NextResponse.json({
          success: true,
          message: "Setup completed successfully",
          user: {
            id: adminUser.id,
            email: adminUser.email,
            name: adminUser.name,
            role: adminUser.role,
          },
        });
      } catch (innerError) {
        // Remove lock on failure
        await prisma.systemConfig.delete({
          where: { key: lockKey },
        }).catch(() => {});
        
        await prisma.$disconnect();
        throw innerError;
      }
    } catch (dbError) {
      await prisma.$disconnect();
      throw dbError;
    }
  } catch (error) {
    console.error("Setup complete error:", error);
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : "Failed to complete setup";
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}