import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";

const ticketsPath = path.join(process.cwd(), "src/data/tickets.json");
const sessionsPath = path.join(process.cwd(), "src/data/sessions.json");

interface Session {
  userId: string;
  email: string;
  name: string;
  role: "Administrator" | "Agent" | "End User";
  department: string;
  token: string;
  expiresAt: string;
}

function getSessions(): Record<string, Session> {
  try {
    const data = fs.readFileSync(sessionsPath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

function getTickets() {
  try {
    const data = fs.readFileSync(ticketsPath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

function saveTickets(tickets: any[]) {
  fs.writeFileSync(ticketsPath, JSON.stringify(tickets, null, 2), "utf8");
}

// Helper to get authenticated user from Bearer token
function getAuthUser(
  req: NextRequest,
): { role: string; userId: string; email: string } | null {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) return null;

  const sessions = getSessions();
  const session = sessions[token];

  if (!session || new Date(session.expiresAt) < new Date()) {
    return null;
  }

  return {
    role: session.role,
    userId: session.userId,
    email: session.email,
  };
}

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  const tickets = getTickets();

  // End users can only see their own tickets
  if (auth?.role === "End User") {
    const filteredTickets = tickets.filter(
      (t: any) => t.createdBy === auth.email || t.username === auth.email,
    );
    return NextResponse.json(filteredTickets);
  }

  return NextResponse.json(tickets);
}

export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);

  // Any authenticated user can create tickets
  if (!auth) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const data = await req.json();

  // Basic validation
  const required = ["title", "description", "priority", "category", "dueDate"];
  for (const field of required) {
    if (!data[field]) {
      return new NextResponse(`Missing field: ${field}`, { status: 400 });
    }
  }

  const now = new Date().toISOString();
  const newTicket = {
    ...data,
    id: uuidv4(),
    status: "New",
    createdBy: auth.email,
    createdAt: now,
    updatedAt: now,
  };

  const tickets = getTickets();
  tickets.unshift(newTicket);
  saveTickets(tickets);
  return NextResponse.json(newTicket, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const auth = getAuthUser(req);

  // Only Agents and Administrators can update ticket status
  if (!auth || (auth.role !== "Agent" && auth.role !== "Administrator")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { id, status } = await req.json();
  const tickets = getTickets();
  const index = tickets.findIndex((t: any) => t.id === id);

  if (index === -1) {
    return new NextResponse("Ticket not found", { status: 404 });
  }

  tickets[index] = {
    ...tickets[index],
    status,
    updatedAt: new Date().toISOString(),
  };
  saveTickets(tickets);
  return NextResponse.json(tickets[index]);
}

export async function DELETE(req: NextRequest) {
  const auth = getAuthUser(req);

  // Only Administrators can delete tickets
  if (!auth || auth.role !== "Administrator") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { id } = await req.json();
  let tickets = getTickets();
  tickets = tickets.filter((t: any) => t.id !== id);
  saveTickets(tickets);
  return new NextResponse("Deleted", { status: 204 });
}
