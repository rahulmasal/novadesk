import nodemailer from 'nodemailer';
import type { Ticket } from '@/lib/store';
import { ticketsToCSV } from '@/lib/csv';

export async function sendReportEmail(tickets: Ticket[]) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const recipient = process.env.REPORT_RECIPIENT;

  if (!host || !user || !pass || !recipient) {
    console.warn('SMTP configuration missing – email not sent');
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for other ports
    auth: { user, pass },
  });

  const csv = ticketsToCSV(tickets);

  const info = await transporter.sendMail({
    from: `"IT Ticket System" <${user}>`,
    to: recipient,
    subject: 'IT Ticket System – Daily Report',
    text: 'Please find the attached ticket report in CSV format.',
    attachments: [
      {
        filename: 'tickets_report.csv',
        content: csv,
        contentType: 'text/csv',
      },
    ],
  });

  console.log('Report email sent:', info.messageId);
}
