/* eslint-disable */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  const password = await bcrypt.hash('P@ss@4321', 12);

  // 1. Create Administrators (2)
  console.log('Creating Administrators...');
  for (let i = 1; i <= 2; i++) {
    await prisma.user.upsert({
      where: { email: `admin${i}@novadesk.it` },
      update: {},
      create: {
        email: `admin${i}@novadesk.it`,
        name: `Admin User ${i}`,
        password,
        role: 'ADMINISTRATOR',
        department: 'IT Management',
      },
    });
  }

  // 2. Create Agents (10)
  console.log('Creating Agents...');
  for (let i = 1; i <= 10; i++) {
    await prisma.user.upsert({
      where: { email: `agent${i}@novadesk.it` },
      update: {},
      create: {
        email: `agent${i}@novadesk.it`,
        name: `Support Agent ${i}`,
        password,
        role: 'AGENT',
        department: i % 2 === 0 ? 'Hardware' : 'Software',
      },
    });
  }

  // 3. Create End Users (1000)
  console.log('Creating 1000 End Users (this may take a moment)...');
  const endUsers = [];
  for (let i = 1; i <= 1000; i++) {
    endUsers.push({
      email: `user${i}@company.com`,
      name: `End User ${i}`,
      password,
      role: 'END_USER',
      department: ['HR', 'Finance', 'Marketing', 'Sales', 'Operations'][i % 5],
      hostname: `WS-${1000 + i}`,
      laptopSerial: `SN-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
    });
    
    // Batch create every 100
    if (endUsers.length === 100) {
      await prisma.user.createMany({
        data: endUsers,
        skipDuplicates: true,
      });
      endUsers.length = 0;
      process.stdout.write('.');
    }
  }
  if (endUsers.length > 0) {
    await prisma.user.createMany({
      data: endUsers,
      skipDuplicates: true,
    });
  }
  // 4. Create Sample Tickets (50)
  console.log('Creating 50 Sample Tickets...');
  const firstUser = await prisma.user.findFirst({ where: { role: 'END_USER' } });
  const firstAgent = await prisma.user.findFirst({ where: { role: 'AGENT' } });

  if (firstUser && firstAgent) {
    const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
    const categories = ['HARDWARE', 'SOFTWARE', 'NETWORK', 'ACCESS'];
    const statuses = ['NEW', 'IN_PROGRESS', 'RESOLVED'];

    for (let i = 1; i <= 50; i++) {
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - Math.floor(Math.random() * 10));
      
      const dueDate = new Date(createdAt);
      dueDate.setDate(dueDate.getDate() + 2);

      await prisma.ticket.create({
        data: {
          title: `Sample Ticket ${i}: ${categories[i % 4]} Issue`,
          description: `This is a sample support request for ${categories[i % 4]} related problem.`,
          priority: priorities[i % 4],
          category: categories[i % 4],
          status: statuses[i % 3],
          dueDate: dueDate,
          createdAt: createdAt,
          createdById: firstUser.id,
          assignedTo: i % 2 === 0 ? firstAgent.id : null,
          username: firstUser.name,
          department: firstUser.department,
        },
      });
    }
  }

  console.log('\nSeed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
