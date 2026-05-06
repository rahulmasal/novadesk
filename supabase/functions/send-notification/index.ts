/**
 * ============================================================================
 * SUPABASE EDGE FUNCTION - Send Email Notifications
 * ============================================================================
 *
 * This Edge Function sends email notifications via Resend API.
 * It's triggered by database changes using Supabase's database webhooks.
 *
 * TRIGGERS:
 * - New ticket created
 * - Ticket status changed
 * - Ticket assigned
 * - Comment added
 * - SLA warning/breach
 *
 * @module /functions/send-notification/index.ts
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = "NovaDesk <noreply@novadesk.io>";

interface NotificationPayload {
  type: string;
  ticketId: string;
  ticketTitle: string;
  userId: string;
  userEmail: string;
  userName: string;
  assignedTo?: string;
  oldStatus?: string;
  newStatus?: string;
  commentContent?: string;
  slaLevel?: string;
}

/**
 * Send email via Resend API
 */
async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.log("RESEND_API_KEY not configured, skipping email send");
    return { success: false, error: "Email service not configured" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Resend API error:", error);
      return { success: false, error };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Generate email template
 */
function generateEmailTemplate(title: string, content: string, actionUrl?: string) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 24px; border-radius: 12px 12px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; }
    .button { display: inline-block; background: #3b82f6; color: white !important; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 24px; }
    .alert { padding: 12px 16px; border-radius: 8px; margin: 16px 0; }
    .alert-warning { background: #fef3c7; border: 1px solid #f59e0b; }
    .alert-danger { background: #fee2e2; border: 1px solid #ef4444; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${title}</h1>
    </div>
    <div class="content">
      ${content}
      ${actionUrl ? `<a href="${actionUrl}" class="button">View in NovaDesk</a>` : ""}
    </div>
    <div class="footer">
      <p>This is an automated message from NovaDesk IT Support System.</p>
      <p>Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Handle incoming notifications
 */
serve(async (req) => {
  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const payload: NotificationPayload = await req.json();

    console.log("Processing notification:", payload.type);

    // Determine email content based on notification type
    let subject: string;
    let html: string;
    const appUrl = Deno.env.get("APP_URL") || "http://localhost:3000";
    const ticketUrl = `${appUrl}?ticket=${payload.ticketId}`;

    switch (payload.type) {
      case "TICKET_CREATED":
        subject = `New Ticket: ${payload.ticketTitle}`;
        html = generateEmailTemplate(
          "New Support Ticket Created",
          `
            <p>Hello ${payload.userName},</p>
            <p>Your support ticket has been created successfully.</p>
            <h3>Ticket Details</h3>
            <ul>
              <li><strong>Title:</strong> ${payload.ticketTitle}</li>
              <li><strong>ID:</strong> ${payload.ticketId.substring(0, 8)}</li>
            </ul>
            <p>Our support team will review your ticket and respond as soon as possible.</p>
          `,
          ticketUrl
        );
        break;

      case "TICKET_ASSIGNED":
        subject = `Ticket Assigned: ${payload.ticketTitle}`;
        html = generateEmailTemplate(
          "Ticket Assigned to You",
          `
            <p>Hello ${payload.userName},</p>
            <p>A support ticket has been assigned to you.</p>
            <h3>Ticket Details</h3>
            <ul>
              <li><strong>Title:</strong> ${payload.ticketTitle}</li>
              <li><strong>ID:</strong> ${payload.ticketId.substring(0, 8)}</li>
              <li><strong>Assigned By:</strong> ${payload.userName}</li>
            </ul>
            <p>Please review and take appropriate action.</p>
          `,
          ticketUrl
        );
        break;

      case "STATUS_CHANGED":
        subject = `Ticket Status Updated: ${payload.ticketTitle}`;
        html = generateEmailTemplate(
          "Ticket Status Changed",
          `
            <p>Hello ${payload.userName},</p>
            <p>The status of your support ticket has been updated.</p>
            <h3>Ticket Details</h3>
            <ul>
              <li><strong>Title:</strong> ${payload.ticketTitle}</li>
              <li><strong>ID:</strong> ${payload.ticketId.substring(0, 8)}</li>
              <li><strong>Old Status:</strong> ${payload.oldStatus}</li>
              <li><strong>New Status:</strong> ${payload.newStatus}</li>
            </ul>
          `,
          ticketUrl
        );
        break;

      case "COMMENT_ADDED":
        subject = `New Comment on Ticket: ${payload.ticketTitle}`;
        html = generateEmailTemplate(
          "New Comment on Your Ticket",
          `
            <p>Hello ${payload.userName},</p>
            <p>A new comment has been added to your ticket.</p>
            <h3>Comment</h3>
            <blockquote style="border-left: 4px solid #3b82f6; padding-left: 16px; color: #4b5563;">
              ${payload.commentContent}
            </blockquote>
            <p>Log in to view and respond to the comment.</p>
          `,
          ticketUrl
        );
        break;

      case "SLA_WARNING":
        subject = `⚠️ SLA Warning: ${payload.ticketTitle}`;
        html = generateEmailTemplate(
          "SLA Warning",
          `
            <p>Hello ${payload.userName},</p>
            <div class="alert alert-warning">
              <strong>Warning:</strong> Your ticket is approaching its SLA deadline.
            </div>
            <h3>Ticket Details</h3>
            <ul>
              <li><strong>Title:</strong> ${payload.ticketTitle}</li>
              <li><strong>ID:</strong> ${payload.ticketId.substring(0, 8)}</li>
              <li><strong>Time Remaining:</strong> Less than 20%</li>
            </ul>
            <p>Please take action to prevent SLA breach.</p>
          `,
          ticketUrl
        );
        break;

      case "SLA_BREACH":
        subject = `🚨 SLA Breached: ${payload.ticketTitle}`;
        html = generateEmailTemplate(
          "SLA Breach Alert",
          `
            <p>Hello ${payload.userName},</p>
            <div class="alert alert-danger">
              <strong>Alert:</strong> Your ticket has breached its SLA deadline!
            </div>
            <h3>Ticket Details</h3>
            <ul>
              <li><strong>Title:</strong> ${payload.ticketTitle}</li>
              <li><strong>ID:</strong> ${payload.ticketId.substring(0, 8)}</li>
            </ul>
            <p>Immediate attention is required.</p>
          `,
          ticketUrl
        );
        break;

      default:
        console.log("Unknown notification type:", payload.type);
        return new Response(JSON.stringify({ received: true }), {
          headers: { "Content-Type": "application/json" },
        });
    }

    // Send email
    const result = await sendEmail(payload.userEmail, subject, html);

    if (result.success) {
      // Update notification record as sent
      await supabase
        .from("notifications")
        .update({ sentAt: new Date().toISOString() })
        .eq("userId", payload.userId)
        .eq("type", payload.type);
    }

    return new Response(
      JSON.stringify({ success: result.success, emailId: result.data?.id }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing notification:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});