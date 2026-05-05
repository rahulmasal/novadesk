import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const usersPath = path.join(process.cwd(), "src/data/users.json");

interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: "Administrator" | "Agent" | "End User";
  department: string;
  createdAt: string;
}

function getUsers(): User[] {
  try {
    const data = fs.readFileSync(usersPath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    const users = getUsers();
    const user = users.find(
      (u) =>
        u.email.toLowerCase() === email.toLowerCase() &&
        u.password === password,
    );

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    // Generate a session token (simple implementation)
    const sessionToken = uuidv4();
    const sessionData = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      department: user.department,
      token: sessionToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    };

    // Store session in a sessions file
    const sessionsPath = path.join(process.cwd(), "src/data/sessions.json");
    let sessions: Record<string, typeof sessionData> = {};
    try {
      const existing = fs.readFileSync(sessionsPath, "utf8");
      sessions = JSON.parse(existing);
    } catch (e) {
      // File doesn't exist or is invalid
    }
    sessions[sessionToken] = sessionData;
    fs.writeFileSync(sessionsPath, JSON.stringify(sessions, null, 2), "utf8");

    const { password: _, ...safeUser } = user;

    return NextResponse.json({
      user: safeUser,
      token: sessionToken,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const sessionsPath = path.join(process.cwd(), "src/data/sessions.json");
  try {
    const sessions = JSON.parse(fs.readFileSync(sessionsPath, "utf8"));
    const session = sessions[token];

    if (!session || new Date(session.expiresAt) < new Date()) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.userId,
        email: session.email,
        name: session.name,
        role: session.role,
        department: session.department,
      },
    });
  } catch (e) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}

export async function DELETE(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (token) {
    const sessionsPath = path.join(process.cwd(), "src/data/sessions.json");
    try {
      const sessions = JSON.parse(fs.readFileSync(sessionsPath, "utf8"));
      delete sessions[token];
      fs.writeFileSync(sessionsPath, JSON.stringify(sessions, null, 2), "utf8");
    } catch (e) {
      // Ignore
    }
  }

  return NextResponse.json({ success: true });
}
