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

// Import the Ticket type for type safety
import type { Ticket } from "@/lib/store";

// Import the CSV conversion utility
import { ticketsToCSV } from "@/lib/csv";

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
  // Step 1: Read SMTP configuration from environment variables
  // These should be set in your .env.local file
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587); // Default to 587 (TLS)
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const recipient = process.env.REPORT_RECIPIENT;

  // Step 2: Validate configuration
  // If any required config is missing, we can't send email
  if (!host || !user || !pass || !recipient) {
    console.warn("SMTP configuration missing – email not sent");
    return; // Early return - no point continuing without config
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
    from: `"IT Ticket System" <${user}>`, // Sender name and email
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
