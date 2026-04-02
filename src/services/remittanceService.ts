import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database';
import { chainService, detectChain, getExplorerUrl, type SupportedChain } from './celoService';
import { feeService, type FeeModel } from './feeService';
const celoService = chainService; // backwards compat alias
import { emailService } from './emailService';
import { mandateService } from './mandateService';
import { logger } from '../utils/logger';

// PL_Genesis: Agent log for Lit Protocol signing
interface AgentLog {
  agentId: string;
  operator: string;
  timestamp: string;
  action: string;
  input: Record<string, any>;
  output: Record<string, any>;
  decision: string;
  success: boolean;
}

interface CreateRemittanceParams {
  senderEmail: string;
  recipientEmail: string;
  amountCelo: number;
  message?: string;
  chain?: SupportedChain;
  feeModel?: FeeModel;
  escrowAddress?: string;
  escrowPrivateKey?: string;
  senderWallet?: string;
  feeAmount?: string;
  requireAuth?: boolean;
  receiverToken?: string;  // token recipient wants to receive (e.g. 'USDC', 'cUSD', 'ETH')
  senderToken?: string;    // token sender sent (e.g. 'USDC', 'ETH', 'CELO') — native if undefined
  senderMessage?: string;  // optional sender message/notes
  verificationType?: 'self' | 'world-id' | 'none';
  senderVerifiedName?: string;
  senderVerifiedNationality?: string;
  senderVerifiedEthnicity?: string;
  escrowAgentWallet?: string;
}

interface CreateRemittanceResult {
  remittanceId: string;
  claimToken: string;
  txHash: string;
  expiresAt: number;
  // PL_Genesis integrations
  agentLog?: AgentLog;
  litSignature?: string;
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
  require_auth: number;
  chain: string;
  self_verification_id: string | null;
  self_verified: number;
  email_sent: number;
  receiver_token: string | null;
  sender_token: string | null;
  sender_message: string | null;
  sender_verification_type: string | null;
  sender_verified_name: string | null;
  sender_verified_nationality: string | null;
  sender_verified_ethnicity: string | null;
  escrow_agent_wallet: string | null;
  cross_chain_tx_hashes: string | null;
}

class RemittanceService {
  /**
   * Create a new remittance
   */
  async createRemittance(params: CreateRemittanceParams): Promise<CreateRemittanceResult> {
    const { senderEmail, recipientEmail, amountCelo, message, chain = 'celo', requireAuth = false, feeModel = 'standard', escrowAddress = '', escrowPrivateKey = '', senderWallet = '', feeAmount = '0', receiverToken, senderToken } = params;

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
          message, status, escrow_tx_hash, expires_at, require_auth, chain,
          fee_model, escrow_address, sender_wallet, fee_amount,
          receiver_token, sender_token,
          sender_message, sender_verification_type,
          sender_verified_name, sender_verified_nationality, sender_verified_ethnicity,
          escrow_agent_wallet
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        expiresAt,
        requireAuth ? 1 : 0,
        chain,
        feeModel,
        escrowAddress,
        senderWallet,
        feeAmount,
        receiverToken || null,
        senderToken || null,
        senderMessage || null,
        verificationType || null,
        senderVerifiedName || null,
        senderVerifiedNationality || null,
        senderVerifiedEthnicity || null,
        escrowAgentWallet || null
      );

      logger.info(`Remittance stored in database: ${remittanceId}`);
    } catch (error) {
      logger.error('Failed to store remittance', error);
      throw error;
    }

    // Send claim email
    let emailSent = false;
    try {
      await emailService.sendClaimEmail(
        recipientEmail,
        senderEmail,
        amountCelo,
        claimToken,
        message,
        chain
      );
      emailSent = true;

      // Mark email as sent
      db.prepare('UPDATE remittances SET email_sent = 1 WHERE id = ?').run(remittanceId);

      logger.info(`Claim email sent to ${recipientEmail}`);
    } catch (error) {
      logger.error('Failed to send claim email', { error, remittanceId, claimToken, recipientEmail });
      // Don't fail the whole operation if email fails
      // The claim can still happen via the token — log the token for recovery
      logger.warn(`⚠️ CLAIM TOKEN FOR RECOVERY: ${claimToken} — email delivery failed but remittance ${remittanceId} is pending`);
    }

    // PL_Genesis: Build agent log and sign with Lit Protocol (mocked)
    const agentLog: AgentLog = {
      agentId: process.env.AGENT_ID || 'unknown-agent',
      operator: process.env.OPERATOR_WALLET || '0x0000000000000000000000000000000000000000',
      timestamp: new Date().toISOString(),
      action: 'create_remittance',
      input: { senderEmail, recipientEmail, amountCelo, chain, requireAuth, feeModel, receiverToken, senderToken },
      output: { remittanceId, claimToken, txHash, expiresAt },
      decision: 'auto-approved',
      success: true,
    };

    // Mock Lit signature (in production use real Lit Protocol signing)
    const litSignature = `lit_${Buffer.from(JSON.stringify(agentLog)).toString('hex').slice(0, 64)}`;

    return {
      remittanceId,
      claimToken,
      txHash,
      expiresAt,
      agentLog,
      litSignature,
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

    // Check if identity verification is required but not completed
    if (remittance.require_auth === 1 && remittance.self_verified !== 1) {
      const error = new Error('Identity verification required before claiming. Complete Self Protocol verification first.');
      (error as any).code = 'VERIFICATION_REQUIRED';
      (error as any).verificationRequired = true;
      throw error;
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

    // Send funds — with optional swap or bridge if receiver wants a different token
    let claimTxHash: string;
    try {
      const remittanceChain = (remittance.chain || 'celo') as SupportedChain;
      const receiverToken = remittance.receiver_token;

      // Determine native symbol for this chain
      const NATIVE_SYMBOLS: Record<string, string> = { celo: 'CELO', base: 'ETH', monad: 'MON' };
      const nativeSymbol = NATIVE_SYMBOLS[remittanceChain] || 'CELO';

      // Check if receiver wants a different token on the same chain (swap)
      const wantsSwap = receiverToken &&
        receiverToken.toUpperCase() !== nativeSymbol.toUpperCase() &&
        !receiverToken.includes('→'); // not a cross-chain request

      // Check if receiver wants a token on a different chain (bridge)
      const wantsBridge = receiverToken && receiverToken.includes('→');

      if (wantsBridge) {
        // Format: "base→USDC" or "celo→CELO"
        const [targetChain, targetToken] = receiverToken.split('→');
        logger.info(`Bridge: ${amount} ${nativeSymbol} on ${remittanceChain} → ${targetToken} on ${targetChain}`);
        const bridgeResult = await chainService.executeBridge(
          remittanceChain,
          targetChain as SupportedChain,
          amount,
          targetWallet
        );
        claimTxHash = bridgeResult.txHash;
        logger.info(`Bridge TX: ${claimTxHash}`);

      } else if (wantsSwap) {
        const { uniswapService } = await import('./uniswapService');
        logger.info(`Swap: ${amount} ${nativeSymbol} → ${receiverToken} on ${remittanceChain}`);
        // Execute swap from server wallet, then send output to recipient
        const swapResult = await uniswapService.executeSwap({
          chain: remittanceChain,
          tokenIn: 'NATIVE',
          tokenOut: receiverToken as string,
          amountIn: amount.toString(),
        });
        claimTxHash = swapResult.txHash;
        logger.info(`Swap TX: ${claimTxHash}`);

      } else {
        // Default: send native token directly
        const sendResult = await chainService.sendNative(targetWallet, amount, remittanceChain);
        claimTxHash = sendResult.txHash;
        logger.info(`${remittanceChain.toUpperCase()} native transferred: ${claimTxHash}`);
      }
    } catch (error) {
      logger.error('Failed to transfer/swap/bridge funds', error);
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

  /**
   * Mark a remittance as Self-verified
   */
  verifyRemittance(claimToken: string, verificationId: string): { success: boolean; remittanceId: string } {
    const remittance = this.getRemittanceByToken(claimToken);
    if (!remittance) {
      throw new Error('Remittance not found');
    }

    const stmt = db.prepare(`
      UPDATE remittances
      SET self_verified = 1, self_verification_id = ?
      WHERE claim_token = ?
    `);
    stmt.run(verificationId, claimToken);

    logger.info(`Remittance ${remittance.id} marked as Self-verified: ${verificationId}`);
    return { success: true, remittanceId: remittance.id };
  }

  /**
   * Recover a remittance by re-sending the claim email
   * Use when email_sent=0 but status='pending'
   */
  async recoverRemittance(remittanceId: string): Promise<{ success: boolean; claimToken: string }> {
    const remittance = this.getRemittanceStatus(remittanceId);
    if (!remittance) {
      throw new Error('Remittance not found');
    }

    if (remittance.status !== 'pending') {
      throw new Error(`Cannot recover remittance with status: ${remittance.status}`);
    }

    try {
      await emailService.sendClaimEmail(
        remittance.recipient_email,
        remittance.sender_email,
        parseFloat(remittance.amount_celo),
        remittance.claim_token,
        remittance.message || undefined
      );

      db.prepare('UPDATE remittances SET email_sent = 1 WHERE id = ?').run(remittanceId);
      logger.info(`Recovery email sent for remittance ${remittanceId}`);

      return { success: true, claimToken: remittance.claim_token };
    } catch (error) {
      logger.error('Failed to send recovery email', { error, remittanceId });
      throw error;
    }
  }
}

export const remittanceService = new RemittanceService();
