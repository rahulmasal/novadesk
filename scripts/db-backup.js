/**
 * Database Backup Script - Creates PostgreSQL database dump
 * 
 * Usage: node scripts/db-backup.js
 * Requires: PGPASSWORD env var or .pgpass file
 */
/* eslint-disable @typescript-eslint/no-require-imports */

const { exec } = require('child_process');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function generateSqlDump() {
  console.log('[DB BACKUP] Generating SQL dump...');
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupDir = path.join(__dirname, '..', 'backups');
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  const outputPath = path.join(backupDir, `novadesk-${timestamp}.sql`);
  
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('[DB BACKUP] DATABASE_URL not set');
    process.exit(1);
  }
  
  const url = new URL(dbUrl);
  const host = url.hostname;
  const port = url.port || '5432';
  const database = url.pathname.slice(1);
  const username = url.username;
  const password = decodeURIComponent(url.password);
  
  const pgDumpPath = process.env.PG_DUMP_PATH || 'pg_dump';
  
  return new Promise((resolve, reject) => {
    const child = exec(
      `"${pgDumpPath}" -h ${host} -p ${port} -U ${username} -d ${database} -f "${outputPath}" --no-owner --no-privileges --clean --if-exists`,
      { env: { ...process.env, PGPASSWORD: password } },
      (error, stdout, stderr) => {
        if (error) {
          console.error(`[DB BACKUP] Error: ${error.message}`);
          reject(error);
          return;
        }
        if (stderr && !stderr.includes('WARNING')) {
          console.error(`[DB BACKUP] Stderr: ${stderr}`);
        }
        console.log(`[DB BACKUP] SQL dump saved to ${outputPath}`);
        resolve(outputPath);
      }
    );
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`[DB BACKUP] Backup complete: ${outputPath}`);
      }
    });
  });
}

async function generatePrismaBackup() {
  console.log('[DB BACKUP] Generating Prisma-compatible backup...');
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupDir = path.join(__dirname, '..', 'backups');
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, department: true, hostname: true, laptopSerial: true, createdAt: true, updatedAt: true }
    });
    
    const tickets = await prisma.ticket.findMany({
      include: { comments: true, attachments: true, auditLogs: true }
    });
    
    const knowledgeBase = await prisma.knowledgeBaseArticle.findMany();
    const config = await prisma.systemConfig.findMany();
    
    const backupData = {
      version: "2.0",
      type: "postgresql",
      timestamp: new Date().toISOString(),
      data: {
        users,
        tickets,
        knowledgeBase,
        config
      }
    };
    
    const filePath = path.join(backupDir, `novadesk-prisma-${timestamp}.json`);
    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2));
    console.log(`[DB BACKUP] Prisma backup saved to ${filePath}`);
    
    return filePath;
  } catch (error) {
    console.error(`[DB BACKUP] Error: ${error.message}`);
    throw error;
  }
}

async function main() {
  const backupType = process.argv[2] || 'prisma';
  
  try {
    if (backupType === 'sql') {
      await generateSqlDump();
    } else {
      await generatePrismaBackup();
    }
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();