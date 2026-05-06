/**
 * ============================================================================
 * USERS IMPORT API ROUTE - Bulk Import Users from CSV
 * ============================================================================
 *
 * This endpoint allows Administrators to bulk import users from CSV files.
 *
 * CSV FORMAT:
 * email,password,name,role,department
 * john@example.com,password123,John Smith,Agent,IT
 * jane@example.com,password123,Jane Doe,End User,Marketing
 *
 * VALID ROLES: Administrator, Agent, End User
 *
 * @module /api/users/import/route
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const usersPath = path.join(process.cwd(), "src/data/users.json");

interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: "Administrator" | "Agent" | "End User";
  department: string;
  createdAt: string;
}

interface Session {
  userId: string;
  email: string;
  name: string;
  role: string;
  department: string;
  token: string;
  expiresAt: string;
}

function getUsers(): User[] {
  try {
    const data = fs.readFileSync(usersPath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

function saveUsers(users: User[]): void {
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2), "utf8");
}

function getSessions(): Record<string, Session> {
  try {
    const sessionsPath = path.join(process.cwd(), "src/data/sessions.json");
    const data = fs.readFileSync(sessionsPath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

function getAuthUser(
  req: NextRequest,
): { role: string; userId: string; email: string } | null {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) return null;

  const sessions = getSessions();
  const session = sessions[token];

  if (!session || new Date(session.expiresAt) < new Date()) {
    return null;
  }

  return {
    role: session.role,
    userId: session.userId,
    email: session.email,
  };
}

/**
 * Parses CSV text into an array of objects
 * Handles quoted fields and escaped commas
 */
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
  const auth = getAuthUser(req);

  // Only Administrators can import users
  if (!auth || auth.role !== "Administrator") {
    return new NextResponse("Forbidden - Admin only", { status: 403 });
  }

  try {
    const { csv } = await req.json();

    if (!csv || typeof csv !== "string") {
      return NextResponse.json(
        { error: "CSV data is required" },
        { status: 400 },
      );
    }

    const rows = parseCSV(csv);

    // Skip header row
    const dataRows = rows.slice(1);

    if (dataRows.length === 0) {
      return NextResponse.json(
        { error: "No data rows found in CSV" },
        { status: 400 },
      );
    }

    const validRoles = ["Administrator", "Agent", "End User"];
    const users = getUsers();
    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNumber = i + 2; // +2 because of 0-index and header row

      // Validate row has enough columns
      if (row.length < 5) {
        results.errors.push(
          `Row ${rowNumber}: Not enough columns (expected 5, got ${row.length})`,
        );
        results.skipped++;
        continue;
      }

      const [email, password, name, role, department] = row;

      // Validate required fields
      if (!email || !password || !name || !role || !department) {
        results.errors.push(`Row ${rowNumber}: Missing required field`);
        results.skipped++;
        continue;
      }

      // Validate role
      if (!validRoles.includes(role)) {
        results.errors.push(
          `Row ${rowNumber}: Invalid role "${role}" (must be: ${validRoles.join(", ")})`,
        );
        results.skipped++;
        continue;
      }

      // Check for duplicate email
      if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
        results.errors.push(
          `Row ${rowNumber}: Email "${email}" already exists`,
        );
        results.skipped++;
        continue;
      }

      // Create new user
      const newUser: User = {
        id: `usr_${uuidv4().substring(0, 8)}`,
        email: email.toLowerCase(),
        password, // In production, hash this!
        name,
        role: role as User["role"],
        department,
        createdAt: new Date().toISOString(),
      };

      users.push(newUser);
      results.imported++;
    }

    if (results.imported > 0) {
      saveUsers(users);
    }

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
    console.error("Import error:", error);
    return NextResponse.json(
      { error: "Failed to parse CSV: " + errorMessage },
      { status: 400 },
    );
  }
}
