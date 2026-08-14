import nodemailer from "nodemailer";
import { env } from "../config/env";
import { logger } from "./logger";

export type InviteMailPayload = {
  to: string;
  name: string;
  code: string;
  role: string;
  expiresAt: Date | string;
};

export async function sendInviteEmail({ to, name, code, role, expiresAt }: InviteMailPayload): Promise<{ delivered: boolean; message: string; code: string }> {
  const expires = new Date(expiresAt);
  const formattedExpiry = Number.isNaN(expires.getTime()) ? "7 days" : expires.toLocaleString();
  const smtpConfig = {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    user: env.SMTP_USER,
    passLength: env.SMTP_PASS ? env.SMTP_PASS.length : 0,
    from: env.SMTP_FROM || env.SMTP_USER,
    fromName: env.EMAIL_FROM_NAME || "CamOps",
  };

  logger.info(
    {
      email: to,
      inviteCode: code,
      smtp: {
        host: !!env.SMTP_HOST,
        user: !!env.SMTP_USER,
        pass: !!env.SMTP_PASS,
        passLength: smtpConfig.passLength,
        port: env.SMTP_PORT,
        from: !!(env.SMTP_FROM || env.SMTP_USER),
      },
    },
    "SMTP configuration loaded for invite email",
  );

  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
    logger.warn(
      {
        email: to,
        inviteCode: code,
        smtp: smtpConfig,
      },
      "SMTP not configured; invite code is being returned without email delivery",
    );
    return {
      delivered: false,
      message: `Invitation created. Invite code: ${code}. Email delivery is not configured yet, so the code is included for manual sharing.`,
      code,
    };
  }

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  try {
    logger.info({ email: to, inviteCode: code, smtpHost: env.SMTP_HOST, smtpUser: env.SMTP_USER }, "Verifying Gmail SMTP connection before sending invite");
    await transporter.verify();
    logger.info({ email: to, inviteCode: code }, "Gmail SMTP verification succeeded");

    const result = await transporter.sendMail({
      from: `${env.EMAIL_FROM_NAME ?? "CamOps"} <${env.SMTP_FROM || env.SMTP_USER}>`,
      to,
      subject: "Your CamOps invitation code",
      text: [
        `Hello ${name},`,
        "",
        `You have been invited to join CamOps as a ${role}.`,
        `Your invitation code is: ${code}`,
        `Use this code to create your account before ${formattedExpiry}.`,
        "",
        "Thanks,",
        "CamOps Team",
      ].join("\n"),
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
          <h2 style="margin-bottom: 16px;">CamOps invitation</h2>
          <p>Hello ${name},</p>
          <p>You have been invited to join CamOps as a <strong>${role}</strong>.</p>
          <p><strong>Your invitation code:</strong> ${code}</p>
          <p>Use this code to create your account before <strong>${formattedExpiry}</strong>.</p>
          <p>Thanks,<br />CamOps Team</p>
        </div>
      `,
    });

    logger.info({ email: to, inviteCode: code, messageId: result.messageId }, "Invitation email sent");

    return {
      delivered: true,
      message: "Invitation created and sent to the email address.",
      code,
    };
  } catch (error: any) {
    logger.error(
      {
        err: error,
        email: to,
        inviteCode: code,
        smtp: {
          host: env.SMTP_HOST,
          port: env.SMTP_PORT,
          user: env.SMTP_USER,
          passLength: smtpConfig.passLength,
          from: env.SMTP_FROM || env.SMTP_USER,
        },
        errorMessage: error?.message,
        errorCode: error?.code,
        response: error?.response,
      },
      "Gmail SMTP verification or send failed; likely auth rejection or env mismatch",
    );
    return {
      delivered: false,
      message: `Invitation created. Email delivery failed for ${to}. Share this code manually: ${code}`,
      code,
    };
  }
}
