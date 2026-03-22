import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database';
import { chainService, detectChain, getExplorerUrl, type SupportedChain } from './celoService';
const celoService = chainService; // backwards compat alias
import { emailService } from './emailService';
import { mandateService } from './mandateService';
import { logger } from '../utils/logger';

interface CreateRemittanceParams {
  senderEmail: string;
  recipientEmail: string;
  amountCelo: number;
  message?: string;
  chain?: SupportedChain;
}

interface CreateRemittanceResult {
  remittanceId: string;
  claimToken: string;
  txHash: string;
  expiresAt: number;
}

interface ClaimRemittanceResult {
  txHash: string;
  wallet?: string;
  privateKey?: string;
  amount: string;
}

interface Remittance {
  id: string;
  claim_token: string;
  sender_email: string;
  recipient_email: string;
  amount_celo: string;
  message: string | null;
  status: string;
  escrow_tx_hash: string | null;
  claim_tx_hash: string | null;
  recipient_wallet: string | null;
  created_at: number;
  expires_at: number;
  claimed_at: number | null;
}

class RemittanceService {
  /**
   * Create a new remittance
   */
  async createRemittance(params: CreateRemittanceParams): Promise<CreateRemittanceResult> {
    const { senderEmail, recipientEmail, amountCelo, message, chain = 'celo' } = params;

    logger.info(`Creating remittance: ${amountCelo} CELO from ${senderEmail} to ${recipientEmail}`);

    // Generate IDs
    const remittanceId = uuidv4();
    const claimToken = uuidv4();
    const expiresAt = Math.floor(Date.now() / 1000) + (24 * 60 * 60); // 24 hours from now

    // Validate with Mandate BEFORE sending funds
    try {
      const validation = await mandateService.validateTransfer({
        action: 'remittance',
        reason: `Email remittance: ${amountCelo} CELO from ${senderEmail} to ${recipientEmail}${message ? `. Message: ${message}` : ''}`,
        amount: amountCelo * 0.50, // Rough CELO to USD conversion (very approximate)
        to: recipientEmail, // Using email as identifier
      });

      if (!validation.allowed) {
        logger.warn(`Remittance blocked by Mandate: ${validation.blockReason}`);
        throw new Error(`Transfer blocked: ${validation.blockReason}`);
      }

      logger.info('Mandate validation passed');
    } catch (error) {
      logger.error('Mandate validation failed', error);
      throw error;
    }

    // Send CELO (in production this would go to an escrow contract, for now we trust our service)
    let txHash: string;
    try {
      // For now, we'll hold the funds in our wallet as "escrow"
      // In a production system, this would go to a smart contract
      // We'll track it in the database and only actually send when claimed
      
      // Check our balance first
      const balance = await celoService.getBalance(celoService.getWalletAddress());
      logger.info(`Service wallet balance: ${balance} CELO`);

      if (parseFloat(balance) < amountCelo) {
        throw new Error(`Insufficient balance: have ${balance} CELO, need ${amountCelo} CELO`);
      }

      // For this implementation, we mark it as escrowed without actually moving funds yet
      // The actual send happens on claim
      txHash = 'pending_escrow';
      
      logger.info('Funds marked as escrowed (will transfer on claim)');
    } catch (error) {
      logger.error('Failed to escrow funds', error);
      throw error;
    }

    // Store in database
    try {
      const stmt = db.prepare(`
        INSERT INTO remittances (
          id, claim_token, sender_email, recipient_email, amount_celo,
          message, status, escrow_tx_hash, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        remittanceId,
        claimToken,
        senderEmail,
        recipientEmail,
        amountCelo.toString(),
        message || null,
        'pending',
        txHash,
        expiresAt
      );

      logger.info(`Remittance stored in database: ${remittanceId}`);
    } catch (error) {
      logger.error('Failed to store remittance', error);
      throw error;
    }

    // Send claim email
    try {
      await emailService.sendClaimEmail(
        recipientEmail,
        senderEmail,
        amountCelo,
        claimToken,
        message
      );

      logger.info(`Claim email sent to ${recipientEmail}`);
    } catch (error) {
      logger.error('Failed to send claim email', error);
      // Don't fail the whole operation if email fails
      // The claim can still happen via the token
    }

    return {
      remittanceId,
      claimToken,
      txHash,
      expiresAt,
    };
  }

  /**
   * Claim a remittance
   */
  async claimRemittance(claimToken: string, recipientWallet?: string): Promise<ClaimRemittanceResult> {
    logger.info(`Processing claim for token: ${claimToken}`);

    // Look up remittance
    const stmt = db.prepare('SELECT * FROM remittances WHERE claim_token = ?');
    const remittance = stmt.get(claimToken) as Remittance | undefined;

    if (!remittance) {
      throw new Error('Invalid claim token');
    }

    // Check if already claimed
    if (remittance.status === 'claimed') {
      throw new Error('Remittance already claimed');
    }

    // Check if expired
    const now = Math.floor(Date.now() / 1000);
    if (now > remittance.expires_at) {
      throw new Error('Claim link has expired');
    }

    const amount = parseFloat(remittance.amount_celo);

    // Determine recipient wallet
    let targetWallet: string;
    let generatedPrivateKey: string | undefined;

    if (recipientWallet) {
      targetWallet = recipientWallet;
      logger.info(`Using provided wallet: ${targetWallet}`);
    } else {
      // Generate new wallet for recipient
      const newWallet = celoService.generateClaimWallet();
      targetWallet = newWallet.address;
      generatedPrivateKey = newWallet.privateKey;
      logger.info(`Generated new wallet for recipient: ${targetWallet}`);
    }

    // Send the CELO
    let claimTxHash: string;
    try {
      const remittanceChain: SupportedChain = 'celo'; // stored remittances default celo; future: store chain in DB
      const sendResult = await chainService.sendNative(targetWallet, amount, remittanceChain);
      claimTxHash = sendResult.txHash;
      logger.info(`CELO transferred: ${claimTxHash}`);
    } catch (error) {
      logger.error('Failed to transfer CELO', error);
      throw error;
    }

    // Update database
    try {
      const updateStmt = db.prepare(`
        UPDATE remittances
        SET status = 'claimed',
            claim_tx_hash = ?,
            recipient_wallet = ?,
            claimed_at = unixepoch()
        WHERE claim_token = ?
      `);

      updateStmt.run(claimTxHash, targetWallet, claimToken);
      logger.info(`Remittance marked as claimed in database`);
    } catch (error) {
      logger.error('Failed to update remittance status', error);
      // Transaction succeeded but DB update failed - log but don't fail
    }

    // Send confirmation email
    try {
      await emailService.sendConfirmationEmail(
        remittance.recipient_email,
        amount,
        claimTxHash
      );
    } catch (error) {
      logger.error('Failed to send confirmation email', error);
      // Don't fail the claim if email fails
    }

    const result: ClaimRemittanceResult = {
      txHash: claimTxHash,
      amount: remittance.amount_celo,
    };

    if (generatedPrivateKey) {
      result.wallet = targetWallet;
      result.privateKey = generatedPrivateKey;
    }

    return result;
  }

  /**
   * Get remittance status
   */
  getRemittanceStatus(remittanceId: string): Remittance | undefined {
    const stmt = db.prepare('SELECT * FROM remittances WHERE id = ?');
    return stmt.get(remittanceId) as Remittance | undefined;
  }

  /**
   * Get remittance by claim token
   */
  getRemittanceByToken(claimToken: string): Remittance | undefined {
    const stmt = db.prepare('SELECT * FROM remittances WHERE claim_token = ?');
    return stmt.get(claimToken) as Remittance | undefined;
  }

  /**
   * Get all remittances for a recipient email
   */
  getRemittancesByRecipient(recipientEmail: string): Remittance[] {
    const stmt = db.prepare('SELECT * FROM remittances WHERE recipient_email = ? ORDER BY created_at DESC');
    return stmt.all(recipientEmail) as Remittance[];
  }
}

export const remittanceService = new RemittanceService();
