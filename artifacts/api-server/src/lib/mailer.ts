import { Resend } from "resend";
import { env } from "../config/env";
import { logger } from "./logger";

function getResendClient(): { client: Resend | null; apiKey: string; fromEmail: string } {
  const apiKey = process.env.RESEND_API_KEY || env.RESEND_API_KEY || "";
  const fromEmail = process.env.RESEND_FROM_EMAIL || env.RESEND_FROM_EMAIL || "CamOps <onboarding@resend.dev>";
  const client = apiKey ? new Resend(apiKey) : null;
  return { client, apiKey, fromEmail };
}

export type SendInviteEmailParams = {
  to: string;
  inviteCode: string;
  role: string;
  organizationName?: string | null;
  invitedByName?: string | null;
  expiresMinutes?: number;
};

export type MailResult = {
  success: boolean;
  delivered: boolean;
  devMode: boolean;
  provider: "resend" | "dev_mode";
  id?: string;
  message: string;
  inviteCode: string;
  registrationUrl: string;
  recipient: string;
  role: string;
  expiresMinutes: number;
};

export function getMailerStatus(): { configured: boolean; provider: string; fromEmail: string } {
  const { apiKey, fromEmail } = getResendClient();
  return {
    configured: Boolean(apiKey),
    provider: apiKey ? "Resend API" : "Local Development",
    fromEmail,
  };
}

export async function sendInviteEmail(params: SendInviteEmailParams): Promise<MailResult> {
  const {
    to,
    inviteCode,
    role,
    organizationName = "CamOps Workspace",
    invitedByName = "An Administrator",
    expiresMinutes = 10,
  } = params;

  const registrationUrl = `${env.FRONTEND_URL}/register?email=${encodeURIComponent(to)}&code=${encodeURIComponent(inviteCode)}`;
  const roleLabel = role === "SUPER_ADMIN" ? "Super Admin" : role === "ADMIN" ? "Admin" : "Operator";

  const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CamOps Desk Invitation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0c0f14; color: #e2e8f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0c0f14; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="580" style="max-width: 580px; background-color: #141820; border: 1px solid #232936; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);">
          <!-- Header -->
          <tr>
            <td style="padding: 28px 32px; background: linear-gradient(135deg, #1b2230 0%, #10141d 100%); border-bottom: 1px solid #232936;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="display: inline-block; width: 10px; height: 10px; background-color: #f59e0b; border-radius: 50%; margin-right: 8px;"></div>
                    <span style="font-size: 18px; font-weight: 700; letter-spacing: 0.5px; color: #ffffff;">CamOps</span>
                    <span style="font-size: 12px; color: #94a3b8; margin-left: 6px; text-transform: uppercase; letter-spacing: 1px;">Operations Desk</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <h1 style="margin: 0 0 12px; font-size: 22px; font-weight: 600; color: #ffffff;">
                You're invited to join CamOps
              </h1>
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #94a3b8;">
                <strong style="color: #f1f5f9;">${invitedByName}</strong> has invited you to join the <strong style="color: #f1f5f9;">${organizationName}</strong> workspace as an <strong style="color: #f59e0b;">${roleLabel}</strong>.
              </p>

              <!-- Invitation Code Card -->
              <div style="background-color: #0b0e14; border: 1px dashed #f59e0b; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; color: #94a3b8; margin-bottom: 8px;">Your 10-Minute Invitation Code</div>
                <div style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #fbbf24; font-family: Consolas, Monaco, monospace; padding: 4px 0;">
                  ${inviteCode}
                </div>
                <div style="font-size: 12px; color: #f87171; margin-top: 10px; font-weight: 500;">
                  ⏱️ Valid for ${expiresMinutes} minutes only
                </div>
              </div>

              <!-- Action Button -->
              <div style="text-align: center; margin: 32px 0 24px;">
                <a href="${registrationUrl}" style="display: inline-block; background-color: #f59e0b; color: #000000; font-weight: 600; font-size: 14px; text-decoration: none; padding: 13px 28px; border-radius: 6px; letter-spacing: 0.3px; box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);">
                  Accept Invitation & Register &rarr;
                </a>
              </div>

              <!-- Metadata Details Table -->
              <table width="100%" style="margin-top: 24px; border-top: 1px solid #232936; padding-top: 16px; font-size: 13px; color: #94a3b8;">
                <tr>
                  <td style="padding: 6px 0; color: #64748b;">Workspace:</td>
                  <td style="padding: 6px 0; font-weight: 500; color: #cbd5e1; text-align: right;">${organizationName}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b;">Assigned Role:</td>
                  <td style="padding: 6px 0; font-weight: 500; color: #cbd5e1; text-align: right;">${roleLabel}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b;">Recipient Email:</td>
                  <td style="padding: 6px 0; font-weight: 500; color: #cbd5e1; text-align: right;">${to}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b;">Validity:</td>
                  <td style="padding: 6px 0; font-weight: 500; color: #f87171; text-align: right;">10 minutes from send</td>
                </tr>
              </table>

              <!-- Expiration Warning -->
              <div style="margin-top: 20px; padding: 12px 16px; background-color: #1a1614; border-left: 3px solid #f59e0b; border-radius: 4px; font-size: 12px; line-height: 1.5; color: #d4d4d8;">
                <strong>Notice:</strong> For security reasons, this code will automatically expire in ${expiresMinutes} minutes. If it expires before you complete registration, please ask an administrator to re-issue an invitation.
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #0f1219; border-top: 1px solid #232936; font-size: 11px; color: #64748b; line-height: 1.5;">
              This email was sent by CamOps CCTV Operations Desk. If you were not expecting this invitation, you can safely ignore this email.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const { client: resendClient, apiKey, fromEmail } = getResendClient();

  // If Resend API Key is configured, attempt sending via Resend API
  if (apiKey && resendClient) {
    try {
      logger.info({ to, from: fromEmail }, "Sending invitation email via Resend API");
      const { data, error } = await resendClient.emails.send({
        from: fromEmail,
        to: [to],
        subject: `[CamOps] Your Invitation Code: ${inviteCode} (Valid for 10 mins)`,
        html: emailHtml,
      });

      if (error) {
        logger.error({ err: error, to }, "Resend API returned error");

        // Print helper console box so the admin can always see the code regardless
        console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                      [CAMOPS INVITATION GENERATED]                        ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  Recipient:       ${to.padEnd(52)}║
║  Role:            ${roleLabel.padEnd(52)}║
║  INVITE CODE:     ${inviteCode.padEnd(52)}║
║  VALIDITY:        10 MINUTES                                              ║
║  Registration Link:                                                       ║
║  ${registrationUrl.slice(0, 72).padEnd(73)}║
╠═══════════════════════════════════════════════════════════════════════════╣
║  Resend Status:   ${error.message.slice(0, 52).padEnd(52)}║
╚═══════════════════════════════════════════════════════════════════════════╝
        `);

        return {
          success: true,
          delivered: false,
          devMode: false,
          provider: "resend",
          inviteCode,
          registrationUrl,
          recipient: to,
          role: roleLabel,
          expiresMinutes,
          message: error.message.includes("testing emails to your own email address")
            ? `10-minute invite created for ${to}. (Resend Free Sandbox: sending is active for your account address. Copy the 1-click link below to register immediately).`
            : `10-minute invite code generated for ${to}: ${inviteCode}`,
        };
      }

      logger.info({ to, emailId: data?.id }, "Invitation email successfully sent via Resend");
      return {
        success: true,
        delivered: true,
        devMode: false,
        provider: "resend",
        id: data?.id,
        inviteCode,
        registrationUrl,
        recipient: to,
        role: roleLabel,
        expiresMinutes,
        message: `Invitation email successfully dispatched to ${to} via Resend. Code is valid for 10 minutes.`,
      };
    } catch (err: any) {
      logger.error({ err, to }, "Exception while sending email via Resend");
      return {
        success: true,
        delivered: false,
        devMode: false,
        provider: "resend",
        inviteCode,
        registrationUrl,
        recipient: to,
        role: roleLabel,
        expiresMinutes,
        message: `10-minute invite code generated: ${inviteCode}.`,
      };
    }
  }

  // If no RESEND_API_KEY is configured in .env, log in development mode
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                      [CAMOPS INVITATION MAILER]                           ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  Recipient:       ${to.padEnd(52)}║
║  Role:            ${roleLabel.padEnd(52)}║
║  Organization:    ${(organizationName || "CamOps Workspace").padEnd(52)}║
║  INVITE CODE:     ${inviteCode.padEnd(52)}║
║  VALIDITY:        10 MINUTES                                              ║
║  Registration Link:                                                       ║
║  ${registrationUrl.slice(0, 72).padEnd(73)}║
╠═══════════════════════════════════════════════════════════════════════════╣
║  Tip: Set RESEND_API_KEY in .env to deliver real emails via Resend.       ║
╚═══════════════════════════════════════════════════════════════════════════╝
  `);

  logger.warn(
    { to, inviteCode, expiresMinutes },
    "RESEND_API_KEY is not set. Invitation code logged to console (Dev Mode).",
  );

  return {
    success: true,
    delivered: false,
    devMode: true,
    provider: "dev_mode",
    inviteCode,
    registrationUrl,
    recipient: to,
    role: roleLabel,
    expiresMinutes,
    message: `Invitation code generated (valid for 10 minutes). Code logged to console in Dev Mode.`,
  };
}
