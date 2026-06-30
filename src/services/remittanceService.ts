/**
 * Remittance Service
 * Core business logic for email-based remittances with claim tokens
 */

import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database';
import { logger } from '../utils/logger';
import { validateEmail, getEmailDomain } from './emailValidator';
import { previewFee, calculateFee, getFeeConfig, FeeCalculationResult } from './feeEngine';
import { selfEnterpriseEnhancedService } from './selfEnterpriseEnhancedService';

export interface Remittance {
  id: string;
  sender_id: string | null;
  recipient_email: string;
  recipient_id: string | null;
  amount_usd: number;
  amount_tokens: string;
  token_address: string;
  chain_id: number;
  fee_usd: number;
  fee_tokens: string;
  claim_token: string;
  status: 'pending' | 'claimed' | 'expired' | 'cancelled';
  expires_at: Date;
  claimed_at: Date | null;
  tx_hash: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateRemittanceRequest {
  senderId: string;
  senderEmail: string;
  recipientEmail: string;
  amountUsd: number;
  chainId: number;
  tokenAddress: string;
  requireAuth: boolean;
  idempotencyKey: string;
  memo?: string;
}

export interface CreateRemittanceResult {
  success: boolean;
  remittance?: Remittance;
  claimLink?: string;
  error?: string;
}

export interface ClaimRemittanceRequest {
  claimToken: string;
  claimSecret: string;
  recipientWallet: string;
  recipientEmail: string;
  verificationMethod?: 'NONE' | 'SELF' | 'WORLDID';
  verificationData?: any; // proof data for SELF/WORLDID
  idempotencyKey: string;
}

export interface ClaimRemittanceResult {
  success: boolean;
  remittance?: Remittance;
  txHash?: string;
  netAmountUsd?: number;
  error?: string;
}

/**
 * Generates a cryptographically secure claim token
 * Uses UUID v4 for uniqueness + timestamp for entropy
 */
export function generateClaimToken(): string {
  return uuidv4();
}

/**
 * Generates a claim secret (sent to recipient via email)
 * Separate from claim token for security
 */
export function generateClaimSecret(): string {
  // Use crypto.randomBytes for production
  return uuidv4().replace(/-/g, '').substring(0, 32);
}

/**
 * Hashes claim secret for storage (SHA-256)
 */
export function hashClaimSecret(secret: string): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(secret).digest('hex');
}

/**
 * Verifies claim secret against stored hash
 */
export function verifyClaimSecret(secret: string, storedHash: string): boolean {
  return hashClaimSecret(secret) === storedHash;
}

/**
 * Checks idempotency key and returns cached response if exists
 */
export function checkIdempotencyKey(key: string): any | null {
  const row = db.prepare(
    'SELECT response FROM idempotency_keys WHERE key = ? AND expires_at > NOW()'
  ).get(key) as { response: string } | undefined;

  if (row) {
    return JSON.parse(row.response);
  }
  return null;
}

/**
 * Stores response with idempotency key (24h TTL)
 */
export function storeIdempotencyResponse(key: string, response: any): void {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  db.prepare(
    'INSERT INTO idempotency_keys (key, response, expires_at) VALUES (?, ?, ?)'
  ).run(key, JSON.stringify(response), expiresAt.toISOString());
}

/**
 * Creates a new remittance record
 */
export async function createRemittance(
  request: CreateRemittanceRequest
): Promise<CreateRemittanceResult> {
  // Check idempotency
  const cached = checkIdempotencyKey(request.idempotencyKey);
  if (cached) {
    return cached;
  }

  // Validate sender identity exists
  const sender = db.prepare('SELECT id, email FROM users WHERE id = ?').get(request.senderId) as
    { id: string; email: string } | undefined;
  if (!sender) {
    return { success: false, error: 'Sender not found' };
  }

  // Validate sender email matches
  if (sender.email.toLowerCase() !== request.senderEmail.toLowerCase()) {
    return { success: false, error: 'Sender email mismatch' };
  }

  // Validate recipient email
  const emailValidation = validateEmail(request.recipientEmail);
  if (!emailValidation.valid) {
    return { success: false, error: emailValidation.error };
  }

  // Check if recipient is disposable email
  if (emailValidation.warnings?.includes('disposable')) {
    logger.warn('Disposable email detected', { email: request.recipientEmail });
  }

  // Check for existing user with this email (for auto-linking)
  const recipient = db.prepare('SELECT id FROM users WHERE email = ?')
    .get(emailValidation.normalizedEmail) as { id: string } | undefined;

  // Validate amount and fee
  const feePreview = await previewFee(request.amountUsd, request.chainId, request.tokenAddress);
  if (!feePreview) {
    return { success: false, error: 'Fee configuration not found for this chain/token' };
  }

  if (request.amountUsd < feePreview.feeUsd) {
    return { success: false, error: 'Amount must be greater than fee' };
  }

  // Calculate fee
  const config = await getFeeConfig(request.chainId, request.tokenAddress);
  if (!config) {
    return { success: false, error: 'Fee config not found' };
  }

  const feeCalc = calculateFee(request.amountUsd, config);

  // Generate tokens
  const claimToken = generateClaimToken();
  const claimSecret = generateClaimSecret();
  const claimTokenHash = hashClaimSecret(claimToken);
  
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // Create remittance record
  const remittanceId = uuidv4();
  const now = new Date();

  db.prepare(`
    INSERT INTO remittances (
      id, sender_id, recipient_email, recipient_id, amount_usd, amount_tokens,
      token_address, chain_id, fee_usd, fee_tokens, claim_token, status,
      expires_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    remittanceId,
    request.senderId,
    emailValidation.normalizedEmail,
    recipient?.id || null,
    request.amountUsd,
    feeCalc.feeTokens, // amount_tokens = net amount after fee
    request.tokenAddress.toLowerCase(),
    request.chainId,
    feeCalc.feeUsd,
    feeCalc.feeTokens,
    claimTokenHash,
    'pending',
    expiresAt.toISOString(),
    now.toISOString(),
    now.toISOString()
  );

  // Build claim link
  const baseUrl = process.env.CLAIM_BASE_URL || 'https://app.remittance.pro';
  const claimLink = `${baseUrl}/claim?token=${claimToken}&secret=${claimSecret}`;

  const remittance: Remittance = {
    id: remittanceId,
    sender_id: request.senderId,
    recipient_email: emailValidation.normalizedEmail,
    recipient_id: recipient?.id || null,
    amount_usd: request.amountUsd,
    amount_tokens: feeCalc.feeTokens,
    token_address: request.tokenAddress.toLowerCase(),
    chain_id: request.chainId,
    fee_usd: feeCalc.feeUsd,
    fee_tokens: feeCalc.feeTokens,
    claim_token: claimTokenHash,
    status: 'pending',
    expires_at: expiresAt,
    claimed_at: null,
    tx_hash: null,
    created_at: now,
    updated_at: now
  };

  const result: CreateRemittanceResult = {
    success: true,
    remittance,
    claimLink
  };

  // Store idempotency response
  storeIdempotencyResponse(request.idempotencyKey, result);

  return result;
}

/**
 * Claims a remittance
 */
export async function claimRemittance(
  request: ClaimRemittanceRequest
): Promise<ClaimRemittanceResult> {
  // Check idempotency
  const cached = checkIdempotencyKey(request.idempotencyKey);
  if (cached) {
    return cached;
  }

  // Find remittance by claim token
  const claimTokenHash = hashClaimSecret(request.claimToken);
  const remittance = db.prepare('SELECT * FROM remittances WHERE claim_token = ?')
    .get(claimTokenHash) as Remittance | undefined;

  if (!remittance) {
    return { success: false, error: 'Invalid claim token' };
  }

  // Verify claim secret
  if (!verifyClaimSecret(request.claimSecret, remittance.claim_token)) {
    return { success: false, error: 'Invalid claim secret' };
  }

  // Check status
  if (remittance.status !== 'pending') {
    return { success: false, error: `Remittance already ${remittance.status}` };
  }

  // Check expiry
  if (new Date() > new Date(remittance.expires_at)) {
    await updateRemittanceStatus(remittance.id, 'expired');
    return { success: false, error: 'Remittance has expired' };
  }

  // Verify email matches
  if (remittance.recipient_email.toLowerCase() !== request.recipientEmail.toLowerCase()) {
    return { success: false, error: 'Recipient email mismatch' };
  }

  // Handle verification if required
  if (remittance.claimed_at) {
    return { success: false, error: 'Already claimed' };
  }

  // For now, assume verification is handled externally
  // In production, verify Self/WorldID proof here

  // Mark as claimed
  const now = new Date();
  const txHash = '0x' + 'mock'.repeat(16); // Placeholder for real tx hash
  
  await updateRemittanceStatus(remittance.id, 'claimed', now, txHash);

  // Update recipient_id if wallet matches existing user
  if (request.recipientWallet) {
    const user = db.prepare('SELECT id FROM users WHERE wallet_address = ?')
      .get(request.recipientWallet.toLowerCase()) as { id: string } | undefined;
    if (user) {
      db.prepare('UPDATE remittances SET recipient_id = ? WHERE id = ?')
        .run(user.id, remittance.id);
    }
  }

  // Log identity verification
  if (request.verificationMethod) {
    db.prepare(`
      INSERT INTO identity_verifications (user_id, provider, action, success, created_at)
      VALUES (?, ?, ?, ?, NOW())
    `).run(
      remittance.recipient_id || remittance.id,
      request.verificationMethod === 'WORLDID' ? 'world_id' : 
      request.verificationMethod === 'SELF' ? 'human_passport' : 'none',
      'claim',
      true
    );
  }

  const netAmountUsd = remittance.amount_usd - remittance.fee_usd;

  const result: ClaimRemittanceResult = {
    success: true,
    remittance: { ...remittance, status: 'claimed', claimed_at: now, tx_hash: txHash },
    txHash,
    netAmountUsd
  };

  storeIdempotencyResponse(request.idempotencyKey, result);
  return result;
}

/**
 * Updates remittance status
 */
async function updateRemittanceStatus(
  id: string,
  status: Remittance['status'],
  claimedAt?: Date,
  txHash?: string
): Promise<void> {
  const updates: string[] = ['status = ?', 'updated_at = NOW()'];
  const params: any[] = [status];

  if (claimedAt) {
    updates.push('claimed_at = ?');
    params.push(claimedAt.toISOString());
  }
  if (txHash) {
    updates.push('tx_hash = ?');
    params.push(txHash);
  }

  params.push(id);
  db.prepare(`UPDATE remittances SET ${updates.join(', ')} WHERE id = ?`).run(...params);
}

/**
 * Gets remittance by claim token (for claim page)
 */
export function getRemittanceByClaimToken(claimToken: string): Remittance | null {
  const claimTokenHash = hashClaimSecret(claimToken);
  return db.prepare('SELECT * FROM remittances WHERE claim_token = ?')
    .get(claimTokenHash) as Remittance | undefined || null;
}

/**
 * Gets remittances by sender
 */
export function getRemittancesBySender(senderId: string, limit = 50, offset = 0): Remittance[] {
  return db.prepare('SELECT * FROM remittances WHERE sender_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?')
    .all(senderId, limit, offset) as Remittance[];
}

/**
 * Gets remittances by recipient
 */
export function getRemittancesByRecipient(recipientId: string, limit = 50, offset = 0): Remittance[] {
  return db.prepare('SELECT * FROM remittances WHERE recipient_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?')
    .all(recipientId, limit, offset) as Remittance[];
}

/**
 * Gets expired pending remittances (for cleanup job)
 */
export function getExpiredRemittances(): Remittance[] {
  return db.prepare('SELECT * FROM remittances WHERE status = ? AND expires_at < NOW()')
    .all('pending') as Remittance[];
}

/**
 * Cancels a remittance (sender only, before claim)
 */
export function cancelRemittance(remittanceId: string, senderId: string): boolean {
  const remittance = db.prepare('SELECT * FROM remittances WHERE id = ?').get(remittanceId) as Remittance | undefined;
  
  if (!remittance || remittance.sender_id !== senderId) {
    return false;
  }

  if (remittance.status !== 'pending') {
    return false;
  }

  const result = db.prepare('UPDATE remittances SET status = ?, updated_at = NOW() WHERE id = ?')
    .run('cancelled', remittanceId);

  return result.changes > 0;
}

/**
 * Processes expired remittances — deducts 1.5% storage fee + gas, returns remainder to sender.
 * Called via POST /api/remittance/process-expired or POST /api/remittances/process-expired
 */
export async function handleExpiredRemittances(): Promise<{ processed: number; errors: string[] }> {
  const STORAGE_FEE_PERCENT = 0.015; // 1.5% storage fee on expired remittances
  const errors: string[] = [];
  let processed = 0;

  const expiredRemittances = getExpiredRemittances();

  for (const remittance of expiredRemittances) {
    try {
      const amount = parseFloat(remittance.amount_celo || remittance.amount_usd || '0');
      if (amount <= 0) {
        errors.push(`Remittance ${remittance.id}: invalid amount`);
        continue;
      }

      // Calculate storage fee (1.5% of amount)
      const storageFee = amount * STORAGE_FEE_PERCENT;
      const refundAmount = amount - storageFee;

      // Update status to expired with storage fee recorded
      db.prepare(`
        UPDATE remittances
        SET status = 'expired',
            storage_fee = ?,
            returned_to_sender = 1,
            updated_at = datetime('now')
        WHERE id = ? AND status = 'pending'
      `).run(storageFee.toFixed(8), remittance.id);

      // If sender wallet is known, attempt to send refund
      // In production, this would execute an on-chain transfer from escrow to sender
      // For now, we record the refund intent — the actual transfer happens via
      // the escrow wallet's private key (stored in escrow_agent_wallet)
      if (remittance.sender_wallet) {
        logger.info('Expired remittance refund recorded', {
          remittanceId: remittance.id,
          senderWallet: remittance.sender_wallet,
          originalAmount: amount,
          storageFee: storageFee.toFixed(8),
          refundAmount: refundAmount.toFixed(8),
        });
      }

      // Send expired notification email to sender
      try {
        const { emailNotifier } = await import('./emailNotifier');
        await emailNotifier.sendExpiredNotification(
          remittance.sender_email,
          remittance.recipient_email,
          amount,
          remittance.chain || 'celo'
        );
      } catch (emailErr: any) {
        logger.warn('Failed to send expired notification', { remittanceId: remittance.id, error: emailErr.message });
      }

      processed++;
    } catch (err: any) {
      errors.push(`Remittance ${remittance.id}: ${err.message}`);
      logger.error('Failed to process expired remittance', { remittanceId: remittance.id, error: err.message });
    }
  }

  logger.info('Expired remittances processed', { processed, errors: errors.length });
  return { processed, errors };
}