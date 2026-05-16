import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { requireAdmin } from "@/lib/auth";
import logger from "@/lib/logger";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { smtpHost, smtpPort, smtpUser, smtpPass, fromAddress, reportRecipient } = await req.json();

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      return NextResponse.json({ error: "SMTP host, port, user, and password are required" }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(smtpPort),
      secure: Number(smtpPort) === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    // Verify connection first
    await transporter.verify();

    // Send test email
    const recipient = reportRecipient || smtpUser;
    await transporter.sendMail({
      from: fromAddress || `"NovaDesk" <${smtpUser}>`,
      to: recipient,
      subject: "NovaDesk - SMTP Test Email",
      text: "This is a test email from NovaDesk. Your SMTP configuration is working correctly.",
      html: "<h3>NovaDesk SMTP Test</h3><p>This is a test email from NovaDesk. Your SMTP configuration is <strong>working correctly</strong>.</p>",
    });

    return NextResponse.json({ success: true, message: `Test email sent to ${recipient}` });
  } catch (error) {
    logger.error("[TEST EMAIL] Failed:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Email test failed: ${message}` }, { status: 500 });
  }
}
