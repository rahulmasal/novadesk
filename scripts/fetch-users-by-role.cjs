const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const role = process.argv[2]?.toUpperCase();
  const validRoles = ['ADMINISTRATOR', 'AGENT', 'END_USER'];

  if (role && !validRoles.includes(role)) {
    console.error(`Invalid role. Valid: ${validRoles.join(', ')}`);
    process.exit(1);
  }

  const where = role ? { role } : {};

  const users = await prisma.user.findMany({
    where,
    select: { id: true, email: true, name: true, role: true, department: true, createdAt: true },
    orderBy: [{ role: 'asc' }, { createdAt: 'desc' }],
  });

  if (role) {
    console.log(`\n=== ${role}s (${users.length}) ===`);
    console.table(users);
  } else {
    const grouped = { ADMINISTRATOR: [], AGENT: [], END_USER: [] };
    for (const u of users) {
      grouped[u.role].push(u);
    }
    for (const r of validRoles) {
      console.log(`\n=== ${r}s (${grouped[r].length}) ===`);
      console.table(grouped[r]);
    }
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
