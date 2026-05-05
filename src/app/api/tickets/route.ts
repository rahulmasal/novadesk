import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

const ticketsPath = path.join(process.cwd(), 'src/data/tickets.json');

function getTickets() {
  try {
    const data = fs.readFileSync(ticketsPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

function saveTickets(tickets: any[]) {
  fs.writeFileSync(ticketsPath, JSON.stringify(tickets, null, 2), 'utf8');
}

// Helper to get role from cookie (default to 'End User')
function getRole(req: NextRequest): string {
  const role = req.cookies.get('authRole')?.value;
  return role === 'Agent' ? 'Agent' : 'End User';
}

export async function GET(req: NextRequest) {
  return NextResponse.json(getTickets());
}

export async function POST(req: NextRequest) {
  const role = getRole(req);
  if (role !== 'Agent' && role !== 'End User') {
    return new NextResponse('Forbidden', { status: 403 });
  }
  const data = await req.json();
  // Basic validation
  const required = ['title', 'description', 'priority', 'category', 'createdBy', 'dueDate'];
  for (const field of required) {
    if (!data[field]) {
      return new NextResponse(`Missing field: ${field}`, { status: 400 });
    }
  }
  const now = new Date().toISOString();
  const newTicket = {
    ...data,
    id: uuidv4(),
    status: 'New',
    createdAt: now,
    updatedAt: now,
  };
  const tickets = getTickets();
  tickets.unshift(newTicket);
  saveTickets(tickets);
  return NextResponse.json(newTicket, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const role = getRole(req);
  if (role !== 'Agent') {
    return new NextResponse('Forbidden', { status: 403 });
  }
  const { id, status } = await req.json();
  const tickets = getTickets();
  const index = tickets.findIndex((t: any) => t.id === id);
  if (index === -1) {
    return new NextResponse('Ticket not found', { status: 404 });
  }
  tickets[index] = { ...tickets[index], status, updatedAt: new Date().toISOString() };
  saveTickets(tickets);
  return NextResponse.json(tickets[index]);
}

export async function DELETE(req: NextRequest) {
  const role = getRole(req);
  if (role !== 'Agent') {
    return new NextResponse('Forbidden', { status: 403 });
  }
  const { id } = await req.json();
  let tickets = getTickets();
  tickets = tickets.filter((t: any) => t.id !== id);
  saveTickets(tickets);
  return new NextResponse('Deleted', { status: 204 });
}
