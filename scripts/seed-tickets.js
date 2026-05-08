/**
 * Ticket Seeding Script - Generates 1000 sample end-user complaints for testing
 * 
 * Usage: node scripts/seed-tickets.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const priorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const categories = ["HARDWARE", "SOFTWARE", "NETWORK", "ACCESS"];
const statuses = ["NEW", "IN_PROGRESS", "PENDING_VENDOR", "RESOLVED", "CLOSED"];

const sampleTitles = [
  "Cannot connect to WiFi", "Email not syncing on phone", "Laptop won't turn on",
  "Application crashes when opening", "Printer not responding", "Password not working",
  "File access denied", "Computer running very slow", "Email stuck in outbox",
  "VPN connection drops", "Monitor flickering", "Cannot install software update",
  "Shared folder not accessible", "Mouse cursor jumping around", "Keyboard keys not responding",
  "Internet browser won't load pages", "Outlook calendar not syncing", "Phone app keeps freezing",
  "Desktop icons disappeared", "Audio not working during calls",
];

const sampleDescriptions = [
  "Started happening this morning. Need urgent assistance.",
  "Been having this issue for a few days now. Please help.",
  "Tried restarting but still same problem.",
  "This is affecting my work significantly.",
  "Happens every time I try to use the system.",
  "Worked fine yesterday, broken today.",
  "Multiple users affected in our department.",
  "Need this resolved ASAP for deadline tomorrow.",
  "Getting error message every time I login.",
  "Tried troubleshooting steps from knowledge base.",
];

const departments = ["Engineering", "Marketing", "Sales", "HR", "Finance", "Operations", "IT", "Legal", "Support", "General"];
const hostnames = ["LAPTOP-001", "LAPTOP-002", "LAPTOP-003", "WORKSTATION-01", "WORKSTATION-02", "DESKTOP-001"];
const laptopSerials = ["SN12345678", "SN87654321", "SN11223344", "SN55667788"];
const usernames = ["john.doe", "jane.smith", "bob.wilson", "alice.jones", "mike.brown"];

function getRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

async function main() {
  console.log("Starting ticket seeding...");
  
  let user = await prisma.user.findFirst({ where: { role: "END_USER" } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: "test.user@example.com",
        password: "$2a$12$KIXxqweRqzVzQhVQYhQqBOjLqPZqBZqBZqBZqBZqBZqBZqBZqBZqB",
        name: "Test User",
        role: "END_USER",
        department: "Engineering",
      },
    });
  }
  
  const userId = user.id;
  const batchSize = 100;
  
  for (let batch = 0; batch < 10; batch++) {
    const tickets = [];
    for (let i = 0; i < batchSize; i++) {
      const ticketNum = batch * batchSize + i;
      const priority = getRandom(priorities);
      const hours = priority === "URGENT" ? 2 : priority === "HIGH" ? 8 : priority === "LOW" ? 72 : 24;
      
      tickets.push({
        id: `ticket-${ticketNum.toString().padStart(5, '0')}`,
        title: `${getRandom(sampleTitles)} #${ticketNum}`,
        description: getRandom(sampleDescriptions),
        priority,
        category: getRandom(categories),
        status: getRandom(statuses),
        dueDate: new Date(Date.now() + hours * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
        createdById: userId,
        username: getRandom(usernames),
        hostname: getRandom(hostnames),
        laptopSerial: Math.random() > 0.3 ? getRandom(laptopSerials) : null,
        department: getRandom(departments),
      });
    }
    
    await prisma.ticket.createMany({ data: tickets });
    console.log(`Created batch ${batch + 1}/10`);
  }
  
  console.log("Complete! Created 1000 tickets.");
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });