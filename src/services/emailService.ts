import { Resend } from 'resend';
import { logger } from '../utils/logger';

class EmailService {
  private resend: Resend;
  private baseUrl: string;

  private initialized: boolean = false;

  constructor() {
    // Lazy initialization - wait for dotenv to load
  }

  private ensureInitialized() {
    if (this.initialized) return;

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey || apiKey === 'NEEDS_KEY') {
      throw new Error('RESEND_API_KEY not configured in environment');
    }

    this.resend = new Resend(apiKey);
    // FRONTEND_URL: Vercel deployment URL (e.g. https://email-remittance.vercel.app)
    // Falls back to BASE_URL (the backend URL) for local dev
    this.baseUrl = process.env.FRONTEND_URL || process.env.BASE_URL || 'http://localhost:3001';
    this.initialized = true;
    
    logger.info('Email service initialized with Resend');
  }

  /**
   * Send claim email to recipient
   */
  async sendClaimEmail(
    recipientEmail: string,
    senderEmail: string,
    amountCelo: number,
    claimToken: string,
    message?: string,
    chain: string = 'celo'
  ): Promise<void> {
    this.ensureInitialized();

    // Derive correct symbol and explorer from chain
    const CHAIN_META: Record<string, { symbol: string; explorer: string; name: string }> = {
      celo:  { symbol: 'CELO', explorer: 'https://celoscan.io',    name: 'Celo' },
      base:  { symbol: 'ETH',  explorer: 'https://basescan.org',   name: 'Base' },
      monad: { symbol: 'MON',  explorer: 'https://monadscan.com',  name: 'Monad' },
    };
    const { symbol, explorer, name: chainName } = CHAIN_META[chain] || CHAIN_META['celo'];

    try {
      const claimUrl = `https://email-remittance-pro.vercel.app/claim/${claimToken}`;
      // Backup: Railway direct claim URL (if Vercel is down)
      const backupUrl = `https://email-remittance-pro.up.railway.app/claim/${claimToken}`;

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .amount { font-size: 32px; font-weight: bold; color: #667eea; margin: 20px 0; }
            .button { display: inline-block; background: #667eea; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
            .button:hover { background: #5568d3; }
            .message-box { background: white; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>💰 You've Received ${symbol}!</h1>
            </div>
            <div class="content">
              <p><strong>${senderEmail}</strong> sent you:</p>
              <div class="amount">${amountCelo} ${symbol}</div>
              <p style="color:#888;font-size:13px;">on ${chainName} network</p>
              ${message ? `
                <div class="message-box">
                  <strong>Message:</strong>
                  <p>${message}</p>
                </div>
              ` : ''}
              <p>Click the button below to claim your funds. You can receive them to your own wallet, or we'll generate a new wallet for you.</p>
              <div style="text-align: center;">
                <a href="${claimUrl}" class="button">Claim Your ${symbol}</a>
              </div>
              <p style="color: #666; font-size: 14px;">
                ⚠️ This link expires in 24 hours
              </p>
              <div style="background:#fff;border:1px solid #ddd;border-radius:6px;padding:16px;margin:16px 0;font-size:13px;">
                <strong>📋 Backup claim links (save these)</strong><br><br>
                <strong>Primary:</strong><br>
                <code style="word-break:break-all;color:#667eea">${claimUrl}</code><br><br>
                <strong>Backup (if primary is down):</strong><br>
                <code style="word-break:break-all;color:#667eea">${backupUrl}</code><br><br>
                <strong>Claim token (use at email-remittance-pro.vercel.app/claim/TOKEN):</strong><br>
                <code style="word-break:break-all;font-weight:bold">${claimToken}</code>
              </div>
              <p style="color:#888;font-size:12px;">
                Your funds are held in escrow on ${chainName} — they cannot be lost or stolen.
                Even if these links stop working, your funds remain safe and claimable as long as you have the claim token above.
              </p>
              <div class="footer">
                <p>Powered by Titan Remittance on ${chainName} Network</p>
                <p>If you didn't expect this email, you can safely ignore it.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      await this.resend.emails.send({
        from: 'Titan Remittance <onboarding@resend.dev>',
        to: [recipientEmail],
        subject: `You received ${amountCelo} ${symbol} from ${senderEmail}`,
        html: emailHtml,
      });

      logger.info(`Claim email sent to ${recipientEmail} for token ${claimToken}`);
    } catch (error) {
      logger.error('Failed to send claim email', error);
      throw error;
    }
  }

  /**
   * Send confirmation email after successful claim
   */
  async sendConfirmationEmail(
    recipientEmail: string,
    amountCelo: number,
    txHash: string
  ): Promise<void> {
    this.ensureInitialized();
    try {
      const explorerUrl = `https://explorer.celo.org/mainnet/tx/${txHash}`;

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .success { font-size: 24px; color: #10b981; margin: 20px 0; text-align: center; }
            .tx-hash { background: white; padding: 15px; border-radius: 5px; word-break: break-all; font-family: monospace; font-size: 12px; margin: 20px 0; }
            .button { display: inline-block; background: #10b981; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Claim Successful!</h1>
            </div>
            <div class="content">
              <div class="success">
                You successfully claimed ${amountCelo} CELO
              </div>
              <p>Your funds have been transferred to your wallet on the Celo network.</p>
              <p><strong>Transaction Hash:</strong></p>
              <div class="tx-hash">${txHash}</div>
              <div style="text-align: center;">
                <a href="${explorerUrl}" class="button">View on Celo Explorer</a>
              </div>
              <div class="footer">
                <p>Powered by Titan Remittance on Celo Network</p>
                <p>Keep your private keys safe!</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      await this.resend.emails.send({
        from: 'Titan Remittance <onboarding@resend.dev>',
        to: [recipientEmail],
        subject: `Claim confirmed: ${amountCelo} CELO received`,
        html: emailHtml,
      });

      logger.info(`Confirmation email sent to ${recipientEmail} for tx ${txHash}`);
    } catch (error) {
      logger.error('Failed to send confirmation email', error);
      throw error;
    }
  }
}

export const emailService = new EmailService();
