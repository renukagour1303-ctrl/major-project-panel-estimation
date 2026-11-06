import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure env variables are loaded even when utility is run standalone or in tests
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

/**
 * Creates and returns configured Nodemailer SMTP transporter for Mailtrap Sandbox or custom SMTP
 */
export function getEmailTransporter() {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpHost = process.env.SMTP_HOST || 'sandbox.smtp.mailtrap.io';
  const smtpPort = parseInt(process.env.SMTP_PORT, 10) || 587;

  if (!smtpUser || !smtpPass) {
    return null;
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    // Port 587 uses STARTTLS (starts plain, upgraded to TLS via STARTTLS command)
    secure: false,
    auth: {
      user: smtpUser,
      pass: smtpPass
    },
    // Require TLS upgrade when using port 587
    requireTLS: smtpPort === 587,
    // Support PLAIN or LOGIN auth mechanisms (standard Mailtrap support)
    authMethod: process.env.SMTP_AUTH_METHOD || undefined,
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production'
    }
  });
}

/**
 * Test and verify SMTP server connection using Mailtrap settings
 * @returns {Promise<{ success: boolean, configured: boolean, message: string }>}
 */
export async function verifySmtpConnection() {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpHost = process.env.SMTP_HOST || 'sandbox.smtp.mailtrap.io';
  const smtpPort = parseInt(process.env.SMTP_PORT, 10) || 587;

  if (!smtpUser || !smtpPass) {
    return {
      success: false,
      configured: false,
      message: 'SMTP credentials missing: SMTP_USER and SMTP_PASS are not configured in .env'
    };
  }

  try {
    const transporter = getEmailTransporter();
    await transporter.verify();
    return {
      success: true,
      configured: true,
      message: `SMTP connection established successfully with ${smtpHost}:${smtpPort} (STARTTLS).`
    };
  } catch (error) {
    return {
      success: false,
      configured: true,
      message: `SMTP verification failed: ${error.message}`
    };
  }
}

/**
 * Send password reset email via SMTP (e.g. Mailtrap Sandbox) or log to console in dev mode
 * @param {Object} params
 * @param {string} params.toEmail
 * @param {string} [params.name]
 * @param {string} params.resetUrl
 */
export async function sendPasswordResetEmail({ toEmail, name, resetUrl }) {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || 'Sungroves Support <no-reply@sungroves.in>';

  // Check if SMTP credentials are provided
  if (!smtpUser || !smtpPass) {
    console.log('----------------------------------------------------');
    console.log('[EmailService] SMTP credentials not configured in environment.');
    console.log(`[Password Reset Link for ${toEmail}]:`);
    console.log(resetUrl);
    console.log('----------------------------------------------------');
    return { sent: false, mode: 'console', reason: 'credentials_missing' };
  }

  try {
    const transporter = getEmailTransporter();
    if (!transporter) {
      throw new Error('Could not initialize mail transporter.');
    }

    const displayName = name ? name.trim() : 'Valued Customer';

    const htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #0f172a; margin: 0; font-size: 24px;">Sungroves Innovations LLP</h2>
          <p style="color: #059669; font-size: 14px; margin-top: 4px; font-weight: 600;">AI-Powered Solar Energy Solutions</p>
        </div>

        <div style="background-color: #ffffff; padding: 32px; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <h3 style="color: #1e293b; margin-top: 0; font-size: 18px;">Password Reset Request</h3>
          <p style="color: #475569; font-size: 15px; line-height: 1.6;">
            Hello ${displayName},
          </p>
          <p style="color: #475569; font-size: 15px; line-height: 1.6;">
            We received a request to reset your password for your Sungroves customer account. Click the button below to set a new password. This link will expire in <strong>15 minutes</strong>.
          </p>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}" style="background-color: #059669; color: #ffffff; padding: 12px 28px; text-decoration: none; font-size: 15px; font-weight: 600; border-radius: 6px; display: inline-block;">
              Reset My Password
            </a>
          </div>

          <p style="color: #64748b; font-size: 13px; line-height: 1.6;">
            If you did not request this password reset, please ignore this email or reach out to support if you have concerns. Your password will remain unchanged.
          </p>

          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />

          <p style="color: #94a3b8; font-size: 12px; word-break: break-all;">
            If the button doesn't work, copy and paste this link into your browser:<br />
            <a href="${resetUrl}" style="color: #059669;">${resetUrl}</a>
          </p>
        </div>

        <div style="text-align: center; margin-top: 24px; color: #94a3b8; font-size: 12px;">
          &copy; ${new Date().getFullYear()} Sungroves Innovations LLP. All rights reserved.<br />
          Chhatrapati Sambhajinagar, Maharashtra, India
        </div>
      </div>
    `;

    const info = await transporter.sendMail({
      from: smtpFrom,
      to: toEmail,
      subject: 'Reset Your Sungroves Customer Password',
      text: `Hello ${displayName},\n\nYou requested a password reset. Please use the following link within 15 minutes to reset your password:\n${resetUrl}\n\nIf you did not request this, please ignore this email.`,
      html: htmlContent
    });

    console.log(`[EmailService] Password reset email sent to ${toEmail}. Message ID: ${info.messageId}`);
    return { sent: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[EmailService] Failed to send email via SMTP to ${toEmail}:`, error.message);
    console.log(`[Password Reset Link (Fallback)] for ${toEmail}: ${resetUrl}`);
    return { sent: false, error: error.message };
  }
}
