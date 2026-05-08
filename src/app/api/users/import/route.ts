/**
 * ============================================================================
 * USERS IMPORT API ROUTE - Bulk Import Users from CSV
 * ============================================================================
 *
 * This endpoint allows Administrators to bulk import users from CSV files.
 *
 * CSV FORMAT:
 * email,password,name,role,department
 * john@example.com,password123,John Smith,AGENT,IT
 * jane@example.com,password123,Jane Doe,END_USER,Marketing
 *
 * VALID ROLES: ADMINISTRATOR, AGENT, END_USER
 *
 * @module /api/users/import/route
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const dynamic = 'force-dynamic';

const BCRYPT_SALT_ROUNDS = 12;

function parseCSV(csvText: string): string[][] {
  const lines = csvText.trim().split("\n");
  const result: string[][] = [];

  for (const line of lines) {
    const row: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        row.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    row.push(current.trim());
    result.push(row);
  }

  return result;
}

/**
 * POST /api/users/import - Bulk import users from CSV
 *
 * Accepts CSV data in the request body:
 * { csv: "email,password,name,role,department\n..." }
 *
 * Returns summary of import results
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);

  if (!auth) {
    return new NextResponse("Forbidden - Admin only", { status: 403 });
  }

  console.log(`[USERS IMPORT POST] Starting bulk user import`, { adminUser: auth?.email });

  try {
    const { csv } = await req.json();

    if (!csv || typeof csv !== "string") {
      return NextResponse.json(
        { error: "CSV data is required" },
        { status: 400 },
      );
    }

    const rows = parseCSV(csv);

    const dataRows = rows.slice(1);

    if (dataRows.length === 0) {
      return NextResponse.json(
        { error: "No data rows found in CSV" },
        { status: 400 },
      );
    }

    const validRoles = ["ADMINISTRATOR", "AGENT", "END_USER"];
    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNumber = i + 2;

      if (row.length < 5) {
        results.errors.push(
          `Row ${rowNumber}: Not enough columns (expected 5, got ${row.length})`,
        );
        results.skipped++;
        continue;
      }

      const [email, password, name, role, department] = row;

      if (!email || !password || !name || !role || !department) {
        results.errors.push(`Row ${rowNumber}: Missing required field`);
        results.skipped++;
        continue;
      }

      if (!validRoles.includes(role.toUpperCase())) {
        results.errors.push(
          `Row ${rowNumber}: Invalid role "${role}" (must be: ${validRoles.join(", ")})`,
        );
        results.skipped++;
        continue;
      }

      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (existingUser) {
        results.errors.push(
          `Row ${rowNumber}: Email "${email}" already exists`,
        );
        results.skipped++;
        continue;
      }

      const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

      await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          password: hashedPassword,
          name,
          role: role.toUpperCase() as "ADMINISTRATOR" | "AGENT" | "END_USER",
          department,
        },
      });

      results.imported++;
    }

    console.log(`[USERS IMPORT POST] Import completed`, { total: dataRows.length, imported: results.imported, skipped: results.skipped });

    return NextResponse.json({
      success: true,
      summary: {
        total: dataRows.length,
        imported: results.imported,
        skipped: results.skipped,
      },
      errors: results.errors.length > 0 ? results.errors : undefined,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[USERS IMPORT POST] Error:`, error);
    return NextResponse.json(
      { error: "Failed to parse CSV: " + errorMessage },
      { status: 400 },
    );
  }
}
