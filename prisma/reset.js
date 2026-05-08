/* eslint-disable */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Resetting database...');
  await prisma.comment.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  console.log('Database reset complete.');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
