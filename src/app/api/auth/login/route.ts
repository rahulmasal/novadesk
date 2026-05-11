import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import prisma from "@/lib/prisma";
import { loginSchema } from "@/lib/schemas";
import { logAuditEvent } from "@/lib/audit";
import { authenticateWithLdap } from "@/lib/ldap-auth";

const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000;
const BCRYPT_SALT_ROUNDS = 12;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validationResult = loginSchema.safeParse(body);

    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0]?.message || "Validation failed";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { email, password, provider } = validationResult.data;

    console.log(`[AUTH POST] Login attempt`, { email, provider });

    const useLdap = provider === "ldap" || process.env.LDAP_ENABLED === "true";

    if (useLdap) {
      const ldapUsername = email.split("@")[0];
      const ldapResult = await authenticateWithLdap(ldapUsername, password);

      if (ldapResult.success && ldapResult.user) {
        console.log(`[AUTH POST] LDAP login successful`, { email: ldapUsername });
        await logAuditEvent({
          userId: (ldapResult.user as { id: string }).id,
          action: "LOGIN",
          details: `User ${ldapUsername} logged in via LDAP`,
        }).catch(() => {});

        return NextResponse.json({
          user: ldapResult.user,
          token: (ldapResult.user as { sessions?: Array<{ token: string }> }).sessions?.[0]?.token,
        });
      }
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    if (user.password === "LDAP_AUTH") {
      return NextResponse.json({ error: "This account uses LDAP authentication" }, { status: 401 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const sessionToken = uuidv4();
    const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MS);

    await prisma.session.create({
      data: {
        userId: user.id,
        token: sessionToken,
        expiresAt,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _pw, ...safeUser } = user;

    console.log(`[AUTH POST] Login successful`, { userId: user.id, email: user.email });

    await logAuditEvent({
      userId: user.id,
      action: "LOGIN",
      details: `User ${user.email} logged in`,
    }).catch(() => {});

    return NextResponse.json({
      user: { ...safeUser, source: "local" },
      token: sessionToken,
    });
  } catch (error) {
    console.error(`[AUTH POST] Error:`, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}