import { verifySmtpConnection, sendPasswordResetEmail } from './utils/emailService.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function runSmtpDiagnostics() {
  console.log('====================================================');
  console.log(' Sungroves Solar - Mailtrap SMTP Sandbox Verification');
  console.log('====================================================');

  const smtpHost = process.env.SMTP_HOST || 'sandbox.smtp.mailtrap.io';
  const smtpPort = process.env.SMTP_PORT || '587';
  const hasUser = Boolean(process.env.SMTP_USER && process.env.SMTP_USER.trim());
  const hasPass = Boolean(process.env.SMTP_PASS && process.env.SMTP_PASS.trim());

  console.log(`SMTP Host: ${smtpHost}`);
  console.log(`SMTP Port: ${smtpPort}`);
  console.log(`STARTTLS: Enabled (Port ${smtpPort})`);
  console.log(`SMTP_USER configured: ${hasUser ? 'YES' : 'NO'}`);
  console.log(`SMTP_PASS configured: ${hasPass ? 'YES' : 'NO'}`);
  console.log('----------------------------------------------------');

  if (!hasUser || !hasPass) {
    console.log('[STATUS] Credentials Missing in .env');
    console.log('Please add your Mailtrap Sandbox credentials to backend/.env:');
    console.log('  SMTP_HOST=sandbox.smtp.mailtrap.io');
    console.log('  SMTP_PORT=587');
    console.log('  SMTP_USER=<your_mailtrap_sandbox_username>');
    console.log('  SMTP_PASS=<your_mailtrap_sandbox_password>');
    console.log('  SMTP_FROM="Sungroves Support <no-reply@sungroves.in>"');
    console.log('  FRONTEND_URL=http://localhost:5173');
    console.log('====================================================');
    return { success: false, reason: 'missing_credentials' };
  }

  console.log('[1/2] Verifying SMTP connection with Mailtrap Sandbox...');
  const connResult = await verifySmtpConnection();
  console.log('Connection Verification:', connResult.message);

  if (!connResult.success) {
    console.log('[ERROR] SMTP connection handshake failed.');
    console.log('====================================================');
    return { success: false, reason: 'connection_failed', error: connResult.message };
  }

  console.log('\n[2/2] Sending test password-reset email to Sandbox inbox...');
  const testEmail = process.env.TEST_EMAIL_RECIPIENT || 'test.customer@sungroves.in';
  const testResetUrl = `${(process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '')}/reset-password?token=sample_verification_token_${Date.now()}`;

  const sendResult = await sendPasswordResetEmail({
    toEmail: testEmail,
    name: 'Mailtrap Sandbox Test User',
    resetUrl: testResetUrl
  });

  if (sendResult.sent) {
    console.log('[SUCCESS] Email sent to Mailtrap Sandbox!');
    console.log(`Message ID: ${sendResult.messageId}`);
    console.log(`Recipient: ${testEmail}`);
    console.log(`Reset URL in email: ${testResetUrl}`);
    console.log('Check your Mailtrap Sandbox inbox at https://mailtrap.io to confirm delivery.');
    console.log('====================================================');
    return { success: true, messageId: sendResult.messageId };
  } else {
    console.log('[FAILURE] Email dispatch failed:', sendResult.error || 'Unknown error');
    console.log('====================================================');
    return { success: false, reason: 'send_failed', error: sendResult.error };
  }
}

runSmtpDiagnostics().catch(err => {
  console.error('Unhandled diagnostics error:', err);
});
