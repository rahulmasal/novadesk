/**
 * ============================================================================
 * EMAIL SERVICE - Send Ticket Reports via SMTP
 * ============================================================================
 *
 * This module handles sending email reports containing ticket data.
 * It's used by the cron job to send daily/monthly automated reports.
 *
 * WHAT IT DOES:
 * - Creates an SMTP transporter connection
 * - Converts tickets to CSV format
 * - Sends email with CSV attachment to configured recipient
 *
 * BEGINNER NOTES:
 * - SMTP (Simple Mail Transfer Protocol) is the standard for sending emails
 * - nodemailer is the most popular Node.js library for sending emails
 * - You'll need SMTP credentials from your email provider (Gmail, SendGrid, etc.)
 * - For Gmail, use "App Passwords" if you have 2FA enabled
 *
 * ENVIRONMENT VARIABLES NEEDED:
 * - SMTP_HOST: Your email provider's SMTP server (e.g., smtp.gmail.com)
 * - SMTP_PORT: Port number (usually 587 for TLS, 465 for SSL)
 * - SMTP_USER: Your email address
 * - SMTP_PASS: Your app password or SMTP password
 * - REPORT_RECIPIENT: Email address to send reports to
 *
 * @module /lib/email
 */

// nodemailer is a popular library for sending emails in Node.js
// Install it with: npm install nodemailer
import nodemailer from "nodemailer";
import prisma from "@/lib/prisma";

// Import the Ticket type for type safety
import type { Ticket } from "@/lib/store";

// Import the CSV conversion utility
import { ticketsToCSV } from "@/lib/csv";

/**
 * Loads SMTP configuration from database settings, falls back to env vars
 */
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
          recipient: settings.email.reportRecipient,
        };
      }
    }
  } catch { /* fall through to env vars */ }

  // Fallback to environment variables
  return {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    fromAddress: undefined,
    recipient: process.env.REPORT_RECIPIENT,
  };
}

/**
 * Sends a ticket report email with CSV attachment
 *
 * WHAT IT DOES:
 * 1. Reads SMTP configuration from environment variables
 * 2. Validates that all required config is present
 * 3. Creates an SMTP transporter (connection to email server)
 * 4. Generates CSV content from tickets
 * 5. Sends email with CSV attachment
 *
 * SMTP SECURITY:
 * - Port 465 uses SSL (secure from the start)
 * - Port 587 uses STARTTLS (starts unencrypted, then upgrades)
 * - Always use SMTP credentials, never your main password!
 *
 * @param {Ticket[]} tickets - Array of ticket objects to include in report
 * @returns {Promise<void>} Resolves when email is sent successfully
 *
 * @example
 * await sendReportEmail(allTickets);
 * // User receives email with tickets_report.csv attached
 */
export async function sendReportEmail(tickets: Ticket[]) {
  // Step 1: Read SMTP configuration from DB settings, fallback to env vars
  const smtpConfig = await getSmtpConfig();
  const host = smtpConfig.host;
  const port = smtpConfig.port;
  const user = smtpConfig.user;
  const pass = smtpConfig.pass;
  const recipient = smtpConfig.recipient;

  // Step 2: Validate configuration
  if (!host || !user || !pass || !recipient) {
    console.warn("SMTP configuration missing – email not sent");
    return;
  }

  // Step 3: Create SMTP transporter
  // A "transporter" is a connection to an email server
  // It handles authentication and secure communication
  const transporter = nodemailer.createTransport({
    host, // SMTP server address (e.g., smtp.gmail.com)
    port, // Port number (587 for TLS, 465 for SSL)
    secure: port === 465, // true for port 465 (SSL), false for others (TLS)
    auth: { user, pass }, // Email credentials
  });

  // Step 4: Generate CSV content from tickets
  const csv = ticketsToCSV(tickets);

  // Step 5: Send the email
  // sendMail() connects to SMTP server, authenticates, and sends
  const info = await transporter.sendMail({
    from: smtpConfig.fromAddress || `"NovaDesk" <${user}>`,
    to: recipient, // Recipient email
    subject: "IT Ticket System – Daily Report", // Email subject line
    text: "Please find the attached ticket report in CSV format.", // Plain text body
    attachments: [
      {
        filename: "tickets_report.csv", // Name of attached file
        content: csv, // The CSV content we generated
        contentType: "text/csv", // MIME type for CSV files
      },
    ],
  });

  // Step 6: Log success (info.messageId is the unique ID from the email server)
  console.log("Report email sent:", info.messageId);
}
