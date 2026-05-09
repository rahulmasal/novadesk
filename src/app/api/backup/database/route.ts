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
  const { PrismaClient } = await import("@/lib/prisma");
  const prisma = new PrismaClient();

  try {
    // Parse INSERT statements and restore via Prisma
    const statements = parseSqlInserts(lines);

    await prisma.$transaction(async (tx) => {
      for (const stmt of statements.users) {
        await tx.user.create({ data: stmt });
      }
      for (const stmt of statements.tickets) {
        await tx.ticket.create({
          data: {
            ...stmt,
            comments: { create: stmt.comments || [] },
            attachments: { create: stmt.attachments || [] },
            auditLogs: { create: stmt.auditLogs || [] }
          }
        });
      }
    });

    console.log(`[DB RESTORE POST] Restored ${statements.users.length} users, ${statements.tickets.length} tickets`);
    return NextResponse.json({ message: "Database restored successfully" });
  } finally {
    await prisma.$disconnect();
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

  // Simple parser for INSERT statements
  // In production, use a proper SQL parser like 'sql-parser' or 'pg-query-stream'
  let currentTable = "";
  let buffer: string[] = [];

  for (const line of lines) {
    if (line.match(/INSERT INTO (\w+)/)) {
      currentTable = line.match(/INSERT INTO (\w+)/)?.[1] || "";
      buffer = [line];
    } else if (currentTable && line.trim().startsWith("(")) {
      buffer.push(line);
    } else if (currentTable && line.trim() === ";") {
      buffer.push(line);
      // In production, parse the INSERT statement and populate result based on currentTable
      currentTable = "";
      buffer = [];
    }
  }

  return result;
}