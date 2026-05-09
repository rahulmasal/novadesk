/**
 * ============================================================================
 * DATABASE BACKUP API ROUTE - Generate PostgreSQL SQL Dump
 * ============================================================================
 *
 * @module /api/backup/database/route
 */

import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { PrismaClient } from "@prisma/client";

export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

export async function GET() {
  console.log(`[DB BACKUP GET] Generating PostgreSQL SQL dump`);

  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      return NextResponse.json({ error: "DATABASE_URL not configured" }, { status: 500 });
    }

    const url = new URL(dbUrl);
    const host = url.hostname;
    const port = url.port || "5432";
    const database = url.pathname.slice(1);
    const username = url.username;
    const password = decodeURIComponent(url.password);

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const backupDir = path.join(process.cwd(), "backups");
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const outputPath = path.join(backupDir, `novadesk-${timestamp}.sql`);

    const pgDumpAvailable = await checkPgDump();

    if (pgDumpAvailable) {
      return await generateSqlDump(host, port, database, username, password, outputPath);
    } else {
      return await generatePrismaSql(outputPath);
    }
  } catch (error) {
    console.error(`[DB BACKUP GET] Error:`, error);
    return NextResponse.json({ error: "Failed to generate database backup" }, { status: 500 });
  }
}

async function checkPgDump(): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn("pg_dump", ["--version"]);
    child.on("close", (code) => resolve(code === 0));
    child.on("error", () => resolve(false));
  });
}

async function generateSqlDump(
  host: string,
  port: string,
  database: string,
  username: string,
  password: string,
  outputPath: string
) {
  return new Promise<NextResponse>((resolve) => {
    const pgDumpPath = process.env.PG_DUMP_PATH || "pg_dump";

    const child = spawn(
      pgDumpPath,
      [
        "-h", host,
        "-p", port,
        "-U", username,
        "-d", database,
        "-f", outputPath,
        "--no-owner",
        "--no-privileges",
        "--clean",
        "--if-exists"
      ],
      { env: { ...process.env, PGPASSWORD: password } }
    );

    let stderr = "";
    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      if (code !== 0) {
        console.error(`[DB BACKUP GET] pg_dump failed:`, stderr);
        resolve(NextResponse.json({ error: "Failed to generate SQL dump" }, { status: 500 }));
        return;
      }

      const sql = fs.readFileSync(outputPath, "utf8");
      console.log(`[DB BACKUP GET] SQL dump generated, size: ${sql.length} bytes`);
      
      resolve(new NextResponse(sql, {
        headers: {
          "Content-Type": "application/sql",
          "Content-Disposition": `attachment; filename=novadesk-db-${Date.now()}.sql`,
        },
      }));
    });
  });
}

async function generatePrismaSql(outputPath: string) {
  try {
    const users = await prisma.user.findMany();
    const tickets = await prisma.ticket.findMany({ include: { comments: true, attachments: true, auditLogs: true } });
    const knowledgeBase = await prisma.knowledgeBaseArticle.findMany();
    const config = await prisma.systemConfig.findMany();

    let sql = `-- NovaDesk Database Backup\n-- Generated: ${new Date().toISOString()}\n\n`;

    sql += generateInserts("users", users);
    sql += generateInserts("tickets", tickets);
    sql += generateInserts("knowledge_base_articles", knowledgeBase);
    sql += generateInserts("system_config", config);

    fs.writeFileSync(outputPath, sql);

    return new NextResponse(sql, {
      headers: {
        "Content-Type": "application/sql",
        "Content-Disposition": `attachment; filename=novadesk-db-${Date.now()}.sql`,
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}

interface BackupRow {
  [key: string]: unknown;
}

function generateInserts(table: string, rows: BackupRow[]): string {
  if (rows.length === 0) return "";

  const columns = Object.keys(rows[0]);
  let sql = `\n-- Table: ${table}\n`;
  sql += `INSERT INTO ${table} (${columns.join(", ")}) VALUES\n`;

  sql += rows.map(row => {
    const values = columns.map(col => {
      const val = row[col];
      if (val === null) return "NULL";
      if (typeof val === "string") return `'${val.replace(/'/g, "''")}'`;
      if (typeof val === "object") return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
      if (val instanceof Date) return `'${val.toISOString()}'`;
      return val;
    });
    return `  (${values.join(", ")})`;
  }).join(",\n");

  sql += ";\n";
  return sql;
}

export async function POST(req: Request) {
  console.log(`[DB RESTORE POST] Starting database restore`);

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return NextResponse.json({ error: "DATABASE_URL not configured" }, { status: 500 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "No SQL file provided" }, { status: 400 });
    }

    const sql = await file.text();
    const url = new URL(dbUrl);
    const host = url.hostname;
    const port = url.port || "5432";
    const database = url.pathname.slice(1);
    const username = url.username;
    const password = decodeURIComponent(url.password);

    const psqlAvailable = await checkPsql();

    if (psqlAvailable) {
      return await restoreViaPsql(sql, host, port, database, username, password);
    } else {
      return restoreViaPrisma(sql.split("\n"));
    }
  } catch (error) {
    console.error(`[DB RESTORE POST] Error:`, error);
    return NextResponse.json({ error: "Failed to restore database" }, { status: 500 });
  }
}

async function checkPsql(): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn("psql", ["--version"]);
    child.on("close", (code) => resolve(code === 0));
    child.on("error", () => resolve(false));
  });
}

async function restoreViaPsql(
  sql: string,
  host: string,
  port: string,
  database: string,
  username: string,
  password: string
) {
  return new Promise<NextResponse>((resolve) => {
    const psqlPath = process.env.PSQL_PATH || "psql";

    const child = spawn(
      psqlPath,
      ["-h", host, "-p", port, "-U", username, "-d", database, "-v", "ON_ERROR_STOP=1"],
      {
        env: { ...process.env, PGPASSWORD: password },
        stdio: ["pipe", "pipe", "pipe"]
      }
    );

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => stdout += data);
    child.stderr.on("data", (data) => stderr += data);

    child.on("close", (code) => {
      if (code === 0) {
        console.log(`[DB RESTORE POST] Database restored successfully`);
        resolve(NextResponse.json({ message: "Database restored successfully" }));
      } else {
        console.error(`[DB RESTORE POST] psql failed:`, stderr);
        resolve(NextResponse.json({ error: "Failed to restore database" }, { status: 500 }));
      }
    });

    child.stdin.write(sql);
    child.stdin.end();
  });
}

async function restoreViaPrisma(lines: string[]) {
  const prisma = (await import("@/lib/prisma")).default;

  try {
    // Parse INSERT statements and restore via Prisma
    const statements = parseSqlInserts(lines);

    await prisma.$transaction(async (tx) => {
      // Clear existing data first
      await tx.comment.deleteMany();
      await tx.auditLog.deleteMany();
      await tx.attachment.deleteMany();
      await tx.ticket.deleteMany();
      await tx.knowledgeBaseArticle.deleteMany();
      await tx.systemConfig.deleteMany();
      await tx.user.deleteMany();

      // Restore users
      for (const stmt of statements.users) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = stmt as any;
        data.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
        data.updatedAt = data.updatedAt ? new Date(data.updatedAt) : new Date();
        await tx.user.create({ data });
      }

      // Restore tickets
      for (const stmt of statements.tickets) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = stmt as any;
        data.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
        data.updatedAt = data.updatedAt ? new Date(data.updatedAt) : new Date();
        data.dueDate = data.dueDate ? new Date(data.dueDate) : null;
        await tx.ticket.create({ data });
      }

      // Restore knowledge base articles
      for (const stmt of statements.articles) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = stmt as any;
        data.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
        data.updatedAt = data.updatedAt ? new Date(data.updatedAt) : new Date();
        await tx.knowledgeBaseArticle.create({ data });
      }

      // Restore config
      for (const stmt of statements.config) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = stmt as any;
        await tx.systemConfig.upsert({
          where: { key: data.key },
          update: { value: data.value },
          create: { key: data.key, value: data.value },
        });
      }
    });

    console.log(`[DB RESTORE POST] Restored ${statements.users.length} users, ${statements.tickets.length} tickets`);
    return NextResponse.json({ message: "Database restored successfully" });
  } catch (error) {
    console.error("[DB RESTORE POST] Prisma restore failed:", error);
    return NextResponse.json({ error: "Failed to restore database" }, { status: 500 });
  }
}

interface SqlRow {
  [key: string]: unknown;
}

interface ParsedSql {
  users: SqlRow[];
  tickets: SqlRow[];
  articles: SqlRow[];
  config: SqlRow[];
}

function parseSqlInserts(lines: string[]): ParsedSql {
  const result: ParsedSql = {
    users: [],
    tickets: [],
    articles: [],
    config: []
  };

  let fullSql = lines.join('\n');

  // Match INSERT INTO statements with multiple rows
  const insertRegex = /INSERT INTO (\w+)\s*\(([^)]+)\)\s*VALUES\s*([\s\S]*?);/gi;
  let match;

  while ((match = insertRegex.exec(fullSql)) !== null) {
    const [, table, columnsStr, valuesBlock] = match;
    const columns = columnsStr.split(',').map(c => c.trim());

    // Split by "),(" for multi-row inserts
    const rows = valuesBlock.split(/\),\s*\(/);

    for (const rowStr of rows) {
      let cleanedRow = rowStr.trim();
      if (cleanedRow.startsWith('(')) cleanedRow = cleanedRow.slice(1);
      if (cleanedRow.endsWith(')')) cleanedRow = cleanedRow.slice(0, -1);

      const values = parseValues(cleanedRow);

      const row: SqlRow = {};
      columns.forEach((col, i) => {
        row[col] = values[i];
      });

      switch (table.toLowerCase()) {
        case 'users':
          result.users.push(row);
          break;
        case 'tickets':
          result.tickets.push(row);
          break;
        case 'knowledge_base_articles':
          result.articles.push(row);
          break;
        case 'system_config':
          result.config.push(row);
          break;
      }
    }
  }

  return result;
}

function parseValues(valuesStr: string): unknown[] {
  const values: unknown[] = [];
  let current = '';
  let inString = false;
  let inJson = false;

  for (let i = 0; i < valuesStr.length; i++) {
    const char = valuesStr[i];

    if (char === "'" && !inJson) {
      inString = !inString;
      current += char;
    } else if (char === '{' && !inString) {
      inJson = true;
      current += char;
    } else if (char === '}' && !inString) {
      inJson = false;
      current += char;
    } else if (char === ',' && !inString && !inJson) {
      values.push(parseValue(current.trim()));
      current = '';
    } else {
      current += char;
    }
  }

  // Don't forget the last value
  if (current.trim() && !current.trim().endsWith(')')) {
    values.push(parseValue(current.trim()));
  }

  return values;
}

function parseValue(val: string): unknown {
  if (val === 'NULL') return null;
  if (val === 'true') return true;
  if (val === 'false') return false;
  if (/^-?\d+$/.test(val)) return parseInt(val, 10);
  if (/^-?\d+\.\d+$/.test(val)) return parseFloat(val);
  if (val.startsWith("'") && val.endsWith("'")) {
    return val.slice(1, -1).replace(/''/g, "'");
  }
  if (val.startsWith('{') && val.endsWith('}')) {
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  }
  return val;
}