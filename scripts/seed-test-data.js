/* eslint-disable */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const DEPARTMENTS = ['HR', 'Finance', 'Marketing', 'Sales', 'Operations', 'Engineering', 'Legal', 'Support'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const CATEGORIES = ['HARDWARE', 'SOFTWARE', 'NETWORK', 'ACCESS'];
const STATUSES = ['NEW', 'IN_PROGRESS', 'PENDING_VENDOR', 'RESOLVED', 'CLOSED'];
const TITLES = [
  'Laptop not booting', 'WiFi connectivity issues', 'Printer not working',
  'VPN connection failing', 'Email not syncing', 'Software installation request',
  'Password reset needed', 'Monitor flickering', 'Keyboard not responding',
  'Slow computer performance', 'Blue screen error', 'Cannot access shared drive',
  'Outlook crashing', 'Teams audio issues', 'Scanner not detected',
  'Mouse not working', 'Docking station issues', 'USB port not recognized',
  'Application freezes', 'Network drive missing', 'Phone system down',
  'Camera not working', 'Browser keeps crashing', 'File permission error',
  'Antivirus alert', 'Database connection timeout', 'Printer queue stuck',
  'Screen resolution wrong', 'Touchpad gestures not working', 'Bluetooth pairing failed',
];

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomHostname(i) {
  const prefix = ['WS', 'LT', 'PC', 'DT'][Math.floor(Math.random() * 4)];
  const dept = ['HR', 'FN', 'MK', 'SL', 'OP', 'EN', 'LG', 'SP'][Math.floor(Math.random() * 8)];
  return `${prefix}-${dept}-${String(i).padStart(4, '0')}`;
}

function randomSerial() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function randomDate(daysBack, daysForward = 0) {
  const now = new Date();
  const past = new Date(now);
  past.setDate(past.getDate() - daysBack);
  const future = new Date(now);
  future.setDate(future.getDate() + daysForward);
  return new Date(past.getTime() + Math.random() * (future.getTime() - past.getTime()));
}

async function main() {
  console.log('=== Test Data Seed Script ===\n');

  // 1. Delete all non-administrator users and their data
  console.log('1. Deleting all non-administrator users...');
  const nonAdmins = await prisma.user.findMany({
    where: { role: { not: 'ADMINISTRATOR' } },
    select: { id: true },
  });
  const nonAdminIds = nonAdmins.map(u => u.id);

  if (nonAdminIds.length > 0) {
    // Delete related data first
    await prisma.auditLog.deleteMany({ where: { userId: { in: nonAdminIds } } });
    await prisma.notification.deleteMany({ where: { userId: { in: nonAdminIds } } });
    await prisma.session.deleteMany({ where: { userId: { in: nonAdminIds } } });
    await prisma.comment.deleteMany({ where: { authorId: { in: nonAdminIds } } });
    await prisma.attachment.deleteMany({ where: { uploadedBy: { in: nonAdminIds } } });

    // Delete tickets created by non-admins
    await prisma.slaEscalation.deleteMany({});
    await prisma.ticket.deleteMany({ where: { createdById: { in: nonAdminIds } } });

    // Delete the users
    await prisma.user.deleteMany({ where: { id: { in: nonAdminIds } } });
    console.log(`   Deleted ${nonAdminIds.length} non-admin users and related data.\n`);
  } else {
    console.log('   No non-admin users to delete.\n');
  }

  // 2. Ensure admin exists
  const admin = await prisma.user.findFirst({ where: { role: 'ADMINISTRATOR' } });
  if (!admin) {
    console.log('   Creating default admin...');
    const password = await bcrypt.hash('P@ss@4321', 12);
    await prisma.user.create({
      data: {
        email: 'admin@novadesk.it',
        name: 'Administrator',
        password,
        role: 'ADMINISTRATOR',
        department: 'IT',
      },
    });
  }

  // 3. Create agents
  console.log('2. Creating 5 agents...');
  const password = await bcrypt.hash('P@ss@4321', 12);
  const agents = [];
  for (let i = 1; i <= 5; i++) {
    const agent = await prisma.user.upsert({
      where: { email: `agent${i}@novadesk.it` },
      update: {},
      create: {
        email: `agent${i}@novadesk.it`,
        name: `Agent ${i}`,
        password,
        role: 'AGENT',
        department: randomItem(DEPARTMENTS),
      },
    });
    agents.push(agent);
  }
  console.log(`   Created ${agents.length} agents.\n`);

  // 4. Create 300 end users
  console.log('3. Creating 300 end users with laptop serials and hostnames...');
  const endUsers = [];
  for (let i = 1; i <= 300; i++) {
    endUsers.push({
      email: `user${i}@company.com`,
      name: `User ${i}`,
      password,
      role: 'END_USER',
      department: randomItem(DEPARTMENTS),
      hostname: randomHostname(i),
      laptopSerial: randomSerial(),
    });
    if (endUsers.length === 100) {
      await prisma.user.createMany({ data: endUsers, skipDuplicates: true });
      endUsers.length = 0;
      process.stdout.write('   ...');
    }
  }
  if (endUsers.length > 0) {
    await prisma.user.createMany({ data: endUsers, skipDuplicates: true });
  }
  const allEndUsers = await prisma.user.findMany({ where: { role: 'END_USER' } });
  console.log(`\n   Created ${allEndUsers.length} end users.\n`);

  // 5. Create 600 tickets with different timings
  console.log('4. Creating 600 tickets with varied timings...');
  const tickets = [];
  for (let i = 1; i <= 600; i++) {
    const user = randomItem(allEndUsers);
    const agent = randomItem(agents);
    const priority = randomItem(PRIORITIES);
    const category = randomItem(CATEGORIES);
    const status = randomItem(STATUSES);

    // Created 1-60 days ago
    const createdAt = randomDate(60);

    // Due date based on priority
    const dueHours = priority === 'URGENT' ? 4 : priority === 'HIGH' ? 12 : priority === 'MEDIUM' ? 24 : 72;
    const dueDate = new Date(createdAt.getTime() + dueHours * 60 * 60 * 1000);

    tickets.push({
      title: `${randomItem(TITLES)} #${i}`,
      description: `User reported an issue with their workstation. Priority: ${priority}. Category: ${category}. Ticket #${i} for testing SLA and status tracking.`,
      priority,
      category,
      status,
      dueDate,
      createdAt,
      createdById: user.id,
      assignedTo: status !== 'NEW' ? agent.id : null,
      username: user.name,
      department: user.department,
    });

    if (tickets.length === 100) {
      await prisma.ticket.createMany({ data: tickets });
      tickets.length = 0;
      process.stdout.write('   ...');
    }
  }
  if (tickets.length > 0) {
    await prisma.ticket.createMany({ data: tickets });
  }
  const ticketCount = await prisma.ticket.count();
  console.log(`\n   Created ${ticketCount} tickets.\n`);

  console.log('=== Seed Complete ===');
  console.log(`  Users: ${await prisma.user.count()} total`);
  console.log(`  Tickets: ${ticketCount} total`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
