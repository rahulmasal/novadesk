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
    // Get settings
    const settingsConfig = await prisma.systemConfig.findUnique({ where: { key: "user-settings" } });

    let sql = `-- NovaDesk Database Backup\n-- Generated: ${new Date().toISOString()}\n\n`;

    sql += generateInserts("users", users);
    sql += generateInserts("tickets", tickets);
    sql += generateInserts("knowledge_base_articles", knowledgeBase);
    sql += generateInserts("system_config", config);
    
    // Include settings as a separate INSERT
    if (settingsConfig) {
      sql += `\n-- Settings\n`;
      sql += `INSERT INTO system_config (id, key, value, created_at, updated_at) VALUES\n`;
      sql += `  ('${settingsConfig.id}', 'user-settings', '${String(settingsConfig.value).replace(/'/g, "''")}', '${settingsConfig.createdAt.toISOString()}', '${settingsConfig.updatedAt.toISOString()}');\n`;
    }

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

const columnMapping: Record<string, Record<string, string>> = {
  users: { id: 'id', email: 'email', password: 'password', name: 'name', role: 'role', department: 'department', hostname: 'hostname', laptop_serial: 'laptop_serial', created_at: 'createdAt', updated_at: 'updatedAt' },
  tickets: { id: 'id', title: 'title', description: 'description', priority: 'priority', category: 'category', status: 'status', due_date: 'dueDate', created_at: 'createdAt', updated_at: 'updatedAt', created_by_id: 'createdById', assigned_to: 'assignedTo', username: 'username', hostname: 'hostname', laptop_serial: 'laptopSerial', department: 'department' },
  knowledge_base_articles: { id: 'id', title: 'title', content: 'content', category: 'category', created_at: 'createdAt', updated_at: 'updatedAt' },
  system_config: { id: 'id', key: 'key', value: 'value', created_at: 'createdAt', updated_at: 'updatedAt' },
};

function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function generateInserts(table: string, rows: BackupRow[]): string {
  if (rows.length === 0) return "";
  
  const mapping = columnMapping[table] || {};
  const columns = Object.keys(rows[0]).map(k => mapping[k] ? toSnakeCase(k) : toSnakeCase(k));
  let sql = `\n-- Table: ${table}\n`;
  sql += `INSERT INTO ${table} (${columns.join(", ")}) VALUES\n`;

  sql += rows.map(row => {
    const values = Object.keys(row).map(col => {
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

    const content = await file.text();
    
    // Detect if this is a JSON backup (wrong format for SQL restore)
    const trimmed = content.trim();
    if (trimmed.startsWith('{') && trimmed.includes('"data"')) {
      return NextResponse.json({ 
        error: "Invalid format. This appears to be a JSON backup file. Use 'Restore JSON Backup' instead of 'Restore SQL Backup'." 
      }, { status: 400 });
    }

    const sql = content;
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
        resolve(NextResponse.json({ error: `Failed to restore database: ${stderr || "Unknown psql error"}` }, { status: 500 }));
      }
    });

    child.stdin.write(sql);
    child.stdin.end();
  });
}

async function restoreViaPrisma(lines: string[]) {
  const prisma = (await import("@/lib/prisma")).default;

  function filterFields(data: Record<string, unknown>, required: string[], optional: string[]): Record<string, unknown> {
    const filtered: Record<string, unknown> = {};
    for (const field of required) {
      if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
        filtered[field] = data[field];
      } else {
        if (field === 'dueDate') filtered[field] = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        else if (field === 'createdAt' || field === 'updatedAt') filtered[field] = new Date();
      }
    }
    for (const field of optional) {
      if (data[field] !== undefined && data[field] !== null) {
        filtered[field] = data[field];
      }
    }
    return filtered;
  }

  try {
    const statements = parseSqlInserts(lines);

    await prisma.$transaction(async (tx) => {
      await tx.comment.deleteMany();
      await tx.auditLog.deleteMany();
      await tx.attachment.deleteMany();
      await tx.ticket.deleteMany();
      await tx.knowledgeBaseArticle.deleteMany();
      await tx.systemConfig.deleteMany();
      await tx.user.deleteMany();

      for (const stmt of statements.users) {
        const data = filterFields(stmt, ['id', 'email', 'password', 'name', 'role', 'department'], ['hostname', 'laptopSerial', 'createdAt', 'updatedAt']);
        if (data.createdAt) data.createdAt = new Date(data.createdAt as string);
        if (data.updatedAt) data.updatedAt = new Date(data.updatedAt as string);
        await tx.user.create({ data: data as Parameters<typeof tx.user.create>[0]['data'] });
      }

      const adminUserId = statements.users.find(u => u.role === 'ADMINISTRATOR')?.id || statements.users[0]?.id;
      if (!adminUserId) {
        const fallback = await tx.user.create({
          data: { id: 'fallback-admin', email: 'admin@novadesk.local', password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqM5F5L4W6', name: 'System Admin', role: 'ADMINISTRATOR', department: 'IT' }
        });
        statements.tickets.forEach(t => { t.createdById = fallback.id; });
      }

      const existingUserIds = new Set((await tx.user.findMany({ select: { id: true } })).map(u => u.id));
      
      for (const stmt of statements.tickets) {
        const createdById = String(stmt.createdById);
        const finalCreatedById = existingUserIds.has(createdById) ? createdById : adminUserId;
        
        const data = filterFields(stmt, ['id', 'title', 'description', 'priority', 'category', 'status', 'dueDate', 'createdById', 'username', 'department'], ['createdAt', 'updatedAt', 'assignedTo', 'hostname', 'laptopSerial']);
        if (data.createdAt) data.createdAt = new Date(data.createdAt as string);
        if (data.updatedAt) data.updatedAt = new Date(data.updatedAt as string);
        if (data.dueDate) data.dueDate = new Date(data.dueDate as string);
        
        const ticketData = {
          id: String(data.id),
          title: String(data.title),
          description: String(data.description),
          priority: String(data.priority),
          category: String(data.category),
          status: String(data.status),
          dueDate: data.dueDate as Date,
          createdById: finalCreatedById,
          username: String(data.username),
          department: String(data.department),
          assignedTo: data.assignedTo ? String(data.assignedTo) : null,
          hostname: data.hostname ? String(data.hostname) : null,
          laptopSerial: data.laptopSerial ? String(data.laptopSerial) : null,
          createdAt: data.createdAt as Date || new Date(),
          updatedAt: data.updatedAt as Date || new Date(),
        };
        await tx.ticket.create({ data: ticketData as Parameters<typeof tx.ticket.create>[0]['data'] });
      }

      for (const stmt of statements.articles) {
        const data = filterFields(stmt, ['id', 'title', 'content', 'category'], ['createdAt', 'updatedAt']);
        if (data.createdAt) data.createdAt = new Date(data.createdAt as string);
        if (data.updatedAt) data.updatedAt = new Date(data.updatedAt as string);
        await tx.knowledgeBaseArticle.create({ data: data as Parameters<typeof tx.knowledgeBaseArticle.create>[0]['data'] });
      }

      for (const stmt of statements.config) {
        const data = filterFields(stmt, ['key', 'value'], ['id', 'createdAt', 'updatedAt']);
        await tx.systemConfig.upsert({
          where: { key: data.key as string },
          update: { value: data.value as string },
          create: { key: data.key as string, value: data.value as string },
        });
      }
    });

    console.log(`[DB RESTORE POST] Restored ${statements.users.length} users, ${statements.tickets.length} tickets`);
    return NextResponse.json({ message: "Database restored successfully" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[DB RESTORE POST] Prisma restore failed:", message);
    return NextResponse.json({ error: `Failed to restore database: ${message}` }, { status: 500 });
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

  const fullSql = lines.join('\n');

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
  if (current.trim()) {
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