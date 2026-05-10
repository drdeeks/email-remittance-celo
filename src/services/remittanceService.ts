import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database';
import { chainService, detectChain, type SupportedChain } from './celoService';
import { feeService } from './feeService';
import { emailService } from './emailService';
import { giftCardService, type GiftCardBrand } from './giftCardService';
import { logger } from '../utils/logger';

class RemittanceService {
  async createRemittance(params: any) {
    const { senderEmail, recipientEmail, amountCelo, message, chain = 'celo', requireAuth = false, feeModel = 'standard', escrowAddress, escrowPrivateKey } = params;
    const remittanceId = uuidv4();
    const claimToken = uuidv4();
    const expiresAt = Math.floor(Date.now() / 1000) + (24 * 60 * 60);

    db.prepare(`INSERT INTO remittances (id, claim_token, sender_email, recipient_email, amount_celo, message, status, expires_at, require_auth, chain, fee_model, escrow_address, escrow_private_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(remittanceId, claimToken, senderEmail, recipientEmail, amountCelo.toString(), message || null, 'pending', expiresAt, requireAuth ? 1 : 0, chain, feeModel, escrowAddress, escrowPrivateKey);
    
    logger.info(`Remittance created: ${remittanceId}`);
    return { remittanceId, claimToken, expiresAt };
  }

  async claimRemittance(params: any) {
    const { claimToken, recipientWallet, payoutMethod = 'crypto', payoutToken, payoutChain, giftCardBrand } = params;
    const remittance: any = db.prepare('SELECT * FROM remittances WHERE claim_token = ?').get(claimToken);
    if (!remittance || remittance.status === 'claimed') throw new Error('Invalid or already claimed');

    const amount = parseFloat(remittance.amount_celo);
    const chain = (remittance.chain || 'celo') as SupportedChain;
    let claimTxHash = 'processed';

    if (payoutMethod === 'giftcard') {
        await giftCardService.purchaseGiftCard({ brand: giftCardBrand, amountUsd: amount, recipientEmail: remittance.recipient_email });
        await feeService.sweepFees(remittance.escrow_private_key, amount, chain);
    } else {
        const targetChain = (payoutChain || chain) as SupportedChain;
        const targetWallet = recipientWallet || chainService.generateClaimWallet().address;
        if (targetChain !== chain) {
            const bridge = await chainService.executeBridge(chain, targetChain, amount, targetWallet);
            claimTxHash = bridge.txHash;
        } else {
            claimTxHash = await chainService.sendNativeFromKey(remittance.escrow_private_key, targetWallet, amount, chain);
        }
    }

    db.prepare("UPDATE remittances SET status='claimed', claim_tx_hash=?, claimed_at=unixepoch() WHERE id=?").run(claimTxHash, remittance.id);
    return { txHash: claimTxHash, amount: remittance.amount_celo };
  }
}

export const remittanceService = new RemittanceService();