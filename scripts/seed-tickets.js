/**
 * Ticket Seeding Script - Generates 5000 random end-users and 10000 sample tickets for testing
 * 
 * Usage: node scripts/seed-tickets.js
 */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-unused-vars */

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

function generateHostnames(count) {
  const result = [];
  for (let i = 1; i <= count; i++) {
    result.push(`LAPTOP-${String(i).padStart(5, '0')}`);
  }
  return result;
}

function generateSerials(count) {
  const result = [];
  for (let i = 1; i <= count; i++) {
    result.push(`SN${String(i).padStart(8, '0')}`);
  }
  return result;
}

const hostnames = generateHostnames(5000);
const laptopSerials = generateSerials(5000);
const firstNames = ["James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda", "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen"];
const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin"];

function getRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function generateEmail(firstName, lastName, index) {
  const domains = ["example.com", "test.org", "sample.net", "demo.io"];
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}@${getRandom(domains)}`;
}

async function main() {
  console.log("Starting user and ticket seeding...");
  
  // Check for existing agent/admin to assign tickets
  let agent = await prisma.user.findFirst({ where: { role: "AGENT" } });
  if (!agent) {
    agent = await prisma.user.findFirst({ where: { role: "ADMINISTRATOR" } });
  }
  
  // Generate 5000 random end users (or update existing ones with hostname/serial)
  console.log("Creating/updating 5000 end users...");
  const createdUsers = [];
  for (let i = 0; i < 5000; i++) {
    const firstName = getRandom(firstNames);
    const lastName = getRandom(lastNames);
    const email = generateEmail(firstName, lastName, i);
    
const user = await prisma.user.upsert({
      where: { email },
      update: {
        hostname: getRandom(hostnames),
        laptopSerial: getRandom(laptopSerials),
      },
      create: {
        email,
        password: "$2a$12$KIXxqweRqzVzQhVQYhQqBOjLqPZqBZqBZqBZqBZqBZqBZqBZqB",
        name: `${firstName} ${lastName}`,
        role: "END_USER",
        department: getRandom(departments),
        hostname: getRandom(hostnames),
        laptopSerial: getRandom(laptopSerials),
      },
    });
    createdUsers.push(user);
    if ((i + 1) % 100 === 0) console.log(`Processed ${i + 1} users...`);
  }
  
  console.log(`\nProcessed ${createdUsers.length} users`);
  
  // Create sample tickets for each user (exactly 2 tickets each for 10000 total)
  console.log("Creating tickets...");
  let ticketCount = 0;
  
  // First, clear existing tickets to start fresh
  console.log("Clearing existing tickets...");
  await prisma.ticket.deleteMany({});
  
  for (let u = 0; u < createdUsers.length; u++) {
    const user = createdUsers[u];
    const numTickets = 2; // Exactly 2 tickets per user for 10000 total
    
    for (let i = 0; i < numTickets; i++) {
      const priority = getRandom(priorities);
      const hours = priority === "URGENT" ? 2 : priority === "HIGH" ? 8 : priority === "LOW" ? 72 : 24;
      
      const assignedToId = (priority === "HIGH" || priority === "URGENT") && agent ? agent.id : null;
      
      await prisma.ticket.create({
        data: {
          title: getRandom(sampleTitles),
          description: getRandom(sampleDescriptions),
          priority,
          category: getRandom(categories),
          status: assignedToId ? getRandom(["NEW", "IN_PROGRESS"]) : "NEW",
          dueDate: new Date(Date.now() + hours * 60 * 60 * 1000),
          createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(),
          createdById: user.id,
          assignedTo: assignedToId,
          username: `${user.name.toLowerCase().replace(' ', '.')}`,
          hostname: user.hostname,
          laptopSerial: user.laptopSerial,
          department: user.department,
        },
      });
      ticketCount++;
    }
    if ((u + 1) % 500 === 0) console.log(`Created ${ticketCount} tickets for ${u + 1} users...`);
  }
  
  console.log(`\nComplete! Created ${createdUsers.length} users and ${ticketCount} tickets.`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });