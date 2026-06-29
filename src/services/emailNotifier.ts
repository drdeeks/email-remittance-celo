/**
 * Email Notification Service
 * Sends claim links via Resend with HTML templates
 */

import { logger } from '../utils/logger';

interface EmailConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
  baseUrl: string;
}

interface ClaimEmailData {
  recipientEmail: string;
  claimLink: string;
  claimSecret: string;
  amountUsd: number;
  amountFormatted: string;
  senderName?: string;
  memo?: string;
  expiresAt: Date;
  tokenSymbol: string;
  chainName: string;
}

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Default configuration
const DEFAULT_CONFIG: EmailConfig = {
  apiKey: process.env.RESEND_API_KEY || '',
  fromEmail: process.env.FROM_EMAIL || 'noreply@remittance.pro',
  fromName: process.env.FROM_NAME || 'Email Remittance Pro',
  baseUrl: process.env.CLAIM_BASE_URL || 'https://app.remittance.pro'
};

/**
 * Sends claim notification email using Resend
 */
export async function sendClaimEmail(
  data: ClaimEmailData,
  config: Partial<EmailConfig> = {}
): Promise<SendEmailResult> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  if (!cfg.apiKey) {
    logger.warn('RESEND_API_KEY not configured, skipping email send');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    // Import Resend dynamically
    const { Resend } = await import('resend');
    const resend = new Resend(cfg.apiKey);

    const html = generateClaimEmailHtml(data);
    const text = generateClaimEmailText(data);

    const result = await resend.emails.send({
      from: `${cfg.fromName} <${cfg.fromEmail}>`,
      to: data.recipientEmail,
      subject: `You've received ${data.amountFormatted} ${data.tokenSymbol} on ${data.chainName}!`,
      html,
      text,
      tags: [
        { name: 'category', value: 'claim_notification' },
        { name: 'chain', value: data.chainName }
      ]
    });

    logger.info('Claim email sent successfully', {
      to: data.recipientEmail,
      messageId: result.data?.id
    });

    return { success: true, messageId: result.data?.id };
  } catch (error) {
    logger.error('Failed to send claim email', {
      to: data.recipientEmail,
      error: error.message,
      stack: error.stack
    });
    return { success: false, error: error.message };
  }
}

/**
 * Generates HTML email template for claim notification
 */
function generateClaimEmailHtml(data: ClaimEmailData): string {
  const expiresAt = data.expiresAt.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });

  const senderDisplay = data.senderName 
    ? `${data.senderName} sent you`
    : 'Someone sent you';

  const memoSection = data.memo 
    ? `<div class="memo-section"><strong>Message:</strong> ${escapeHtml(data.memo)}</div>`
    : '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You've received a remittance!</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px; }
    .container { background: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden; }
    .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 32px 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
    .header p { margin: 8px 0 0; opacity: 0.9; font-size: 16px; }
    .content { padding: 32px 24px; }
    .amount-box { background: #f0f9ff; border: 2px solid #3b82f6; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0; }
    .amount-label { font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
    .amount-value { font-size: 48px; font-weight: 700; color: #1e40af; font-family: 'SF Mono', 'Monaco', monospace; }
    .amount-currency { font-size: 24px; font-weight: 600; color: #3b82f6; margin-left: 4px; }
    .details { background: #f8fafc; border-radius: 8px; padding: 20px; margin: 24px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { color: #64748b; font-weight: 500; }
    .detail-value { color: #1e293b; font-weight: 600; font-family: 'SF Mono', 'Monaco', monospace; }
    .cta-button { display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; margin: 24px 0; transition: transform 0.2s; }
    .cta-button:hover { transform: translateY(-2px); }
    .memo-section { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0; }
    .footer { text-align: center; padding: 24px; color: #94a3b8; font-size: 14px; border-top: 1px solid #e2e8f0; }
    .footer a { color: #3b82f6; text-decoration: none; }
    .security-notice { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 24px 0; color: #991b1b; font-size: 14px; }
    .secret-box { background: #1e293b; color: #e2e8f0; padding: 16px; border-radius: 8px; font-family: 'SF Mono', 'Monaco', monospace; font-size: 14px; word-break: break-all; margin: 16px 0; }
    @media (max-width: 480px) {
      .amount-value { font-size: 36px; }
      .content { padding: 24px 16px; }
      .header { padding: 24px 16px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💸 You've Received a Remittance!</h1>
      <p>${senderDisplay} ${data.amountFormatted} ${data.tokenSymbol}</p>
    </div>
    
    <div class="content">
      <div class="amount-box">
        <div class="amount-label">Amount Received</div>
        <div class="amount-value">${data.amountFormatted}<span class="amount-currency"> ${data.tokenSymbol}</span></div>
        <div style="margin-top: 8px; color: #64748b; font-size: 14px;">on ${data.chainName}</div>
      </div>

      ${memoSection}

      <div class="details">
        <div class="detail-row">
          <span class="detail-label">Sender</span>
          <span class="detail-value">${data.senderName || 'Anonymous'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Network</span>
          <span class="detail-value">${data.chainName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Token</span>
          <span class="detail-value">${data.tokenSymbol}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Expires</span>
          <span class="detail-value">${expiresAt}</span>
        </div>
      </div>

      <div class="security-notice">
        <strong>⚠️ Security Notice:</strong> Your claim secret is below. Treat it like a password - anyone with this link can claim the funds.
      </div>

      <div class="secret-box">
        <strong>Claim Secret:</strong> ${data.claimSecret}
      </div>

      <div style="text-align: center;">
        <a href="${data.claimLink}" class="cta-button">Claim Your Funds →</a>
      </div>

      <p style="font-size: 14px; color: #94a3b8; text-align: center;">
        If the button doesn't work, copy this link:<br>
        <code style="background: #f1f5f9; padding: 4px 8px; border-radius: 4px; display: block; margin-top: 8px; word-break: break-all;">${data.claimLink}</code>
      </p>
    </div>

    <div class="footer">
      <p>This email was sent by ${cfg.fromName}.</p>
      <p>If you didn't expect this remittance, you can safely ignore this email.</p>
      <p><a href="${cfg.baseUrl}/support">Contact Support</a> | <a href="${cfg.baseUrl}/privacy">Privacy Policy</a></p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generates plain text version of claim email
 */
function generateClaimEmailText(data: ClaimEmailData): string {
  const expiresAt = data.expiresAt.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });

  const senderDisplay = data.senderName 
    ? `${data.senderName} sent you`
    : 'Someone sent you';

  return `
${senderDisplay} ${data.amountFormatted} ${data.tokenSymbol} on ${data.chainName}!

Amount: ${data.amountFormatted} ${data.tokenSymbol}
Network: ${data.chainName}
Token: ${data.tokenSymbol}
Expires: ${expiresAt}
${data.memo ? `Message: ${data.memo}\n` : ''}

CLAIM YOUR FUNDS: ${data.claimLink}

Claim Secret: ${data.claimSecret}

⚠️ SECURITY NOTICE: Your claim secret is above. Treat it like a password - anyone with this link can claim the funds.

---
This email was sent by ${DEFAULT_CONFIG.fromName}.
If you didn't expect this remittance, you can safely ignore this email.
Support: ${DEFAULT_CONFIG.baseUrl}/support
  `.trim();
}

/**
 * Escapes HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&',
    '<': '<',
    '>': '>',
    '"': '"',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Sends expired remittance notification to sender
 */
export async function sendExpiredNotification(
  senderEmail: string,
  amountUsd: number,
  tokenSymbol: string,
  chainName: string,
  recipientEmail: string
): Promise<SendEmailResult> {
  const cfg = { ...DEFAULT_CONFIG };
  
  if (!cfg.apiKey) {
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const { Resend } = await import('resend');
    const resend = new Resend(cfg.apiKey);

    const result = await resend.emails.send({
      from: `${cfg.fromName} <${cfg.fromEmail}>`,
      to: senderEmail,
      subject: `Remittance expired - ${amountUsd} ${tokenSymbol} returned`,
      html: `
        <h2>Your remittance has expired</h2>
        <p>The remittance of <strong>${amountUsd} ${tokenSymbol}</strong> to <strong>${recipientEmail}</strong> on <strong>${chainName}</strong> was not claimed within 7 days.</p>
        <p>The funds have been automatically returned to your wallet.</p>
        <p>No action is required on your part.</p>
      `,
      text: `Your remittance of ${amountUsd} ${tokenSymbol} to ${recipientEmail} on ${chainName} expired and was returned to your wallet.`
    });

    return { success: true, messageId: result.data?.id };
  } catch (error) {
    logger.error('Failed to send expired notification', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Sends claim confirmation to sender
 */
export async function sendClaimConfirmation(
  senderEmail: string,
  recipientEmail: string,
  amountUsd: number,
  tokenSymbol: string,
  chainName: string,
  txHash: string
): Promise<SendEmailResult> {
  const cfg = { ...DEFAULT_CONFIG };
  
  if (!cfg.apiKey) {
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const { Resend } = await import('resend');
    const resend = new Resend(cfg.apiKey);

    const result = await resend.emails.send({
      from: `${cfg.fromName} <${cfg.fromEmail}>`,
      to: senderEmail,
      subject: `Remittance claimed - ${amountUsd} ${tokenSymbol} delivered`,
      html: `
        <h2>Your remittance was claimed!</h2>
        <p><strong>${amountUsd} ${tokenSymbol}</strong> has been successfully delivered to <strong>${recipientEmail}</strong> on <strong>${chainName}</strong>.</p>
        <p>Transaction: <code>${txHash}</code></p>
        <p><a href="${cfg.baseUrl}/tx/${txHash}">View on explorer</a></p>
      `,
      text: `Your remittance of ${amountUsd} ${tokenSymbol} to ${recipientEmail} was claimed. TX: ${txHash}`
    });

    return { success: true, messageId: result.data?.id };
  } catch (error) {
    logger.error('Failed to send claim confirmation', { error: error.message });
    return { success: false, error: error.message };
  }
}

export { DEFAULT_CONFIG as emailConfig };