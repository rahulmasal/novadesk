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
 * Creates a database notification, sends email, and sends browser push notification
 */
export async function notify({ userId, type, subject, body }: NotifyOptions) {
  try {
    // Create DB notification
    await prisma.notification.create({
      data: { userId, type, subject, body },
    });

    // Load user settings to check preferences
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    // Load notification settings
    let emailEnabled = true;
    let pushEnabled = true;
    try {
      const config = await prisma.systemConfig.findUnique({ where: { key: "user-settings" } });
      if (config) {
        const settings = JSON.parse(config.value);
        emailEnabled = settings.notifications?.email !== false;
        pushEnabled = settings.notifications?.push !== false;
      }
    } catch { /* use defaults */ }

    // Send email notification
    if (emailEnabled && user.email) {
      sendEmailNotification(user.email, subject, body).catch((e) =>
        logger.error("[NOTIFY] Email failed:", e)
      );
    }

    // Send browser push notification
    if (pushEnabled) {
      sendPushNotification(userId, subject, body).catch((e) =>
        logger.error("[NOTIFY] Push failed:", e)
      );
    }

    // Update sentAt
    await prisma.notification.updateMany({
      where: { userId, type, subject, sentAt: null },
      data: { sentAt: new Date() },
    });
  } catch (error) {
    logger.error("[NOTIFY] Failed:", error);
  }
}

async function sendEmailNotification(email: string, subject: string, body: string) {
  const smtpConfig = await getSmtpConfig();
  if (!smtpConfig || !smtpConfig.host || !smtpConfig.user || !smtpConfig.pass) return;

  const transporter = nodemailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.port === 465,
    auth: { user: smtpConfig.user, pass: smtpConfig.pass },
  });

  await transporter.sendMail({
    from: smtpConfig.fromAddress || `"NovaDesk" <${smtpConfig.user}>`,
    to: email,
    subject: `[NovaDesk] ${subject}`,
    text: body,
    html: `<div style="font-family:sans-serif;padding:20px;"><h3>${subject}</h3><p>${body}</p><hr/><p style="color:#888;font-size:12px;">NovaDesk IT Ticket System</p></div>`,
  });
}

async function sendPushNotification(userId: string, title: string, body: string) {
  try {
    const webPush = await import("web-push");

    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || "BOnIgI8x2uEDpVx3kkL5jcPyQ64Y1uZzqgIfwgwXSVa-48TmAsg30P_D-E8YCNtH7Z9KRbp2w4JaGrus4cL6_pc";
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "gSSL4ZZWtVx-Usy6cjoI1-lO6v-_D9Fn5IgTv7T8i2E";

    webPush.setVapidDetails("mailto:novadesk@localhost", vapidPublicKey, vapidPrivateKey);

    // Get user's push subscription
    const key = `push-subscription-${userId}`;
    const subConfig = await prisma.systemConfig.findUnique({ where: { key } });
    if (!subConfig) return;

    const subscription = JSON.parse(subConfig.value);

    await webPush.sendNotification(subscription, JSON.stringify({
      title,
      body,
      url: "/",
    }));
  } catch (error) {
    // Subscription may be expired/invalid - remove it
    if ((error as { statusCode?: number }).statusCode === 410) {
      const key = `push-subscription-${userId}`;
      await prisma.systemConfig.deleteMany({ where: { key } });
    }
    throw error;
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
