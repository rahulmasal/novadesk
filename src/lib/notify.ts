import prisma from "@/lib/prisma";
import nodemailer from "nodemailer";
import logger from "@/lib/logger";
import { NotificationType } from "@prisma/client";

interface NotifyOptions {
  userId: string;
  type: NotificationType;
  subject: string;
  body: string;
}

/**
 * Creates a database notification and optionally sends an email
 */
export async function notify({ userId, type, subject, body }: NotifyOptions) {
  try {
    // Create DB notification
    await prisma.notification.create({
      data: { userId, type, subject, body },
    });

    // Check if user has email notifications enabled
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.email) return;

    // Load SMTP settings from DB
    const smtpConfig = await getSmtpConfig();
    if (!smtpConfig || !smtpConfig.host || !smtpConfig.user || !smtpConfig.pass) return;

    // Send email
    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.port === 465,
      auth: { user: smtpConfig.user, pass: smtpConfig.pass },
    });

    await transporter.sendMail({
      from: smtpConfig.fromAddress || `"NovaDesk" <${smtpConfig.user}>`,
      to: user.email,
      subject: `[NovaDesk] ${subject}`,
      text: body,
      html: `<div style="font-family:sans-serif;padding:20px;"><h3>${subject}</h3><p>${body}</p><hr/><p style="color:#888;font-size:12px;">NovaDesk IT Ticket System</p></div>`,
    });

    // Update sentAt
    await prisma.notification.updateMany({
      where: { userId, type, subject, sentAt: null },
      data: { sentAt: new Date() },
    });
  } catch (error) {
    logger.error("[NOTIFY] Failed:", error);
  }
}

async function getSmtpConfig() {
  try {
    const config = await prisma.systemConfig.findUnique({ where: { key: "user-settings" } });
    if (config) {
      const settings = JSON.parse(config.value);
      if (settings.email?.emailEnabled && settings.email?.smtpHost) {
        return {
          host: settings.email.smtpHost,
          port: Number(settings.email.smtpPort) || 587,
          user: settings.email.smtpUser,
          pass: settings.email.smtpPass,
          fromAddress: settings.email.fromAddress,
        };
      }
    }
  } catch { /* ignore */ }

  return {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    fromAddress: undefined,
  };
}
