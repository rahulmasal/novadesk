/**
 * Database Restore Script - Restores PostgreSQL from backup
 * 
 * Usage: node scripts/db-restore.js <backup-file.sql>
 *        node scripts/db-restore.js --prisma <backup-file.json>
 * Requires: PGPASSWORD env var or .pgpass file for SQL restore
 */
/* eslint-disable @typescript-eslint/no-require-imports */

const { exec } = require('child_process');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function restoreFromSql(filePath) {
  console.log(`[DB RESTORE] Restoring from SQL file: ${filePath}`);
  
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('[DB RESTORE] DATABASE_URL not set');
    process.exit(1);
  }
  
  const url = new URL(dbUrl);
  const host = url.hostname;
  const port = url.port || '5432';
  const database = url.pathname.slice(1);
  const username = url.username;
  const password = decodeURIComponent(url.password);
  
  const psqlPath = process.env.PSQL_PATH || 'psql';
  
  return new Promise((resolve, reject) => {
    exec(
      `"${psqlPath}" -h ${host} -p ${port} -U ${username} -d ${database} -f "${filePath}"`,
      { env: { ...process.env, PGPASSWORD: password } },
      (error, stdout, stderr) => {
        if (error) {
          console.error(`[DB RESTORE] Error: ${error.message}`);
          reject(error);
          return;
        }
        if (stderr && !stderr.includes('WARNING')) {
          console.log(`[DB RESTORE] Stderr: ${stderr}`);
        }
        console.log('[DB RESTORE] Restore complete');
        resolve();
      }
    );
  });
}

async function restoreFromPrisma(filePath) {
  console.log(`[DB RESTORE] Restoring from Prisma JSON: ${filePath}`);
  
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  if (!data.data) {
    console.error('[DB RESTORE] Invalid backup format');
    process.exit(1);
  }
  
  try {
    await prisma.$transaction(async (tx) => {
      console.log('[DB RESTORE] Clearing existing data...');
      await tx.comment.deleteMany();
      await tx.auditLog.deleteMany();
      await tx.attachment.deleteMany();
      await tx.ticket.deleteMany();
      await tx.knowledgeBaseArticle.deleteMany();
      await tx.systemConfig.deleteMany();
      await tx.session.deleteMany();
      await tx.user.deleteMany();
      
      console.log('[DB RESTORE] Restoring users...');
      for (const user of data.data.users) {
        await tx.user.create({ data: user });
      }
      
      console.log('[DB RESTORE] Restoring tickets...');
      for (const ticket of data.data.tickets) {
        await tx.ticket.create({
          data: {
            ...ticket,
            comments: { create: ticket.comments || [] },
            attachments: { create: ticket.attachments || [] },
            auditLogs: { create: ticket.auditLogs || [] }
          }
        });
      }
      
      console.log('[DB RESTORE] Restoring knowledge base...');
      for (const article of data.data.knowledgeBase || []) {
        await tx.knowledgeBaseArticle.create({ data: article });
      }
      
      console.log('[DB RESTORE] Restoring config...');
      for (const conf of data.data.config || []) {
        await tx.systemConfig.upsert({
          where: { key: conf.key },
          update: { value: conf.value },
          create: { key: conf.key, value: conf.value }
        });
      }
    });
    
    console.log('[DB RESTORE] Restore complete');
  } catch (error) {
    console.error(`[DB RESTORE] Error: ${error.message}`);
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage:');
    console.log('  node scripts/db-restore.js <backup.sql>');
    console.log('  node scripts/db-restore.js --prisma <backup.json>');
    process.exit(1);
  }
  
  try {
    if (args[0] === '--prisma') {
      await restoreFromPrisma(args[1]);
    } else {
      await restoreFromSql(args[0]);
    }
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();