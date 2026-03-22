/**
 * Fee Service — Dual fee model
 *
 * STANDARD (free relay):
 *   - Sender signs their own on-chain TX from their wallet (pays their own gas)
 *   - Recipient gas (~$0.001 on Celo, ~$0.05 on Base) deducted from received amount
 *   - Net to backend: $0 (service pays relay gas, recoups from recipient deduction)
 *
 * PREMIUM ($1 flat):
 *   - Sender pays $1 on top of their send amount
 *   - Backend covers ALL gas (send + claim) from server wallet
 *   - Any excess after gas → SERVER_WALLET_ADDRESS (profit)
 *   - Estimated profit per TX: ~$0.80-$0.95 on Celo, ~$0.50-$0.70 on Base
 *
 * Escrow model:
 *   - Backend generates a per-remittance throwaway escrow wallet
 *   - Sender sends funds directly to that address from their browser wallet
 *   - Backend watches for deposit confirmation, then sends claim email
 *   - On claim, backend transfers from escrow to recipient (minus gas)
 */

import { chainService, type SupportedChain, getNativeCurrency } from './celoService';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import { parseEther, formatEther } from 'viem';
import { logger } from '../utils/logger';

export type FeeModel = 'standard' | 'premium';

// Gas estimates (in native token) per chain
const GAS_ESTIMATES: Record<SupportedChain, { transfer: string; label: string }> = {
  celo:  { transfer: '0.0005', label: '~$0.001' },
  base:  { transfer: '0.00005', label: '~$0.05'  },
  monad: { transfer: '0.001',  label: '~$0.002'  },
};

// Premium fee: $1 in native token (approximate — could integrate price feed)
const PREMIUM_FEE_NATIVE: Record<SupportedChain, string> = {
  celo:  '1.0',    // ~$1 in CELO (rough, CELO ~$1)
  base:  '0.0004', // ~$1 in ETH  (ETH ~$2500)
  monad: '0.01',   // ~$1 in MON  (MON ~$100)
};

const SERVER_WALLET = process.env.SERVER_WALLET_ADDRESS
  || process.env.WALLET_PRIVATE_KEY && privateKeyToAccount(process.env.WALLET_PRIVATE_KEY as `0x${string}`).address
  || '0x9D65433B3FE597C15a46D2365F8F2c1701Eb9e4A'; // fallback to agent wallet

export interface FeeQuote {
  feeModel: FeeModel;
  sendAmount: string;           // what sender sends to escrow
  recipientAmount: string;      // what recipient receives (after gas deduction if standard)
  feeAmount: string;            // the $1 premium fee (if premium)
  gasEstimate: string;          // gas cost in native token
  gasLabel: string;             // human-readable gas cost
  premiumFeeNative: string;     // $1 in native token
  escrowAddress: string;        // where sender sends funds
  escrowPrivateKey: string;     // server keeps this to forward funds on claim
  serverProfit?: string;        // estimated profit (premium only)
}

export interface EscrowWallet {
  address: string;
  privateKey: string;
}

class FeeService {
  /**
   * Generate a throwaway escrow wallet for one remittance.
   * Server holds the private key — only used to forward funds on claim.
   */
  generateEscrowWallet(): EscrowWallet {
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    return { address: account.address, privateKey };
  }

  /**
   * Calculate the fee quote for a remittance.
   * Returns escrow address + exact amounts for both models.
   */
  async getFeeQuote(
    amount: number,
    chain: SupportedChain,
    feeModel: FeeModel
  ): Promise<FeeQuote> {
    const gas = GAS_ESTIMATES[chain];
    const gasAmount = parseFloat(gas.transfer);
    const premiumFee = parseFloat(PREMIUM_FEE_NATIVE[chain]);
    const escrow = this.generateEscrowWallet();

    if (feeModel === 'premium') {
      // Sender sends: amount + premiumFee → escrow
      // Recipient gets: full amount (backend pays gas from premium fee)
      // Server profit: premiumFee - (gas * 2) — covers send + claim gas
      const totalSend   = amount + premiumFee;
      const gasTotal    = gasAmount * 2; // send + claim
      const serverProfit = premiumFee - gasTotal;

      return {
        feeModel: 'premium',
        sendAmount: totalSend.toFixed(8),
        recipientAmount: amount.toFixed(8),
        feeAmount: premiumFee.toFixed(8),
        gasEstimate: gas.transfer,
        gasLabel: gas.label,
        premiumFeeNative: PREMIUM_FEE_NATIVE[chain],
        escrowAddress: escrow.address,
        escrowPrivateKey: escrow.privateKey,
        serverProfit: Math.max(0, serverProfit).toFixed(8),
      };
    }

    // Standard: sender pays their own gas (wallet handles it)
    // Recipient gets: amount - claim_gas
    const recipientAmount = Math.max(0, amount - gasAmount);

    return {
      feeModel: 'standard',
      sendAmount: amount.toFixed(8),
      recipientAmount: recipientAmount.toFixed(8),
      feeAmount: '0',
      gasEstimate: gas.transfer,
      gasLabel: gas.label,
      premiumFeeNative: PREMIUM_FEE_NATIVE[chain],
      escrowAddress: escrow.address,
      escrowPrivateKey: escrow.privateKey,
    };
  }

  /**
   * Watch for deposit confirmation on escrow address.
   * Polls until funds arrive or timeout.
   */
  async waitForDeposit(
    escrowAddress: string,
    expectedAmount: number,
    chain: SupportedChain,
    timeoutMs: number = 300_000 // 5 min
  ): Promise<{ confirmed: boolean; txHash?: string; actualAmount?: string }> {
    const startTime = Date.now();
    const minAmount = expectedAmount * 0.99; // allow 1% slippage on gas

    logger.info(`Watching escrow ${escrowAddress} for ${expectedAmount} on ${chain}`);

    while (Date.now() - startTime < timeoutMs) {
      try {
        const balance = await chainService.getBalance(escrowAddress, chain);
        const balanceNum = parseFloat(balance);

        if (balanceNum >= minAmount) {
          logger.info(`Deposit confirmed: ${balance} on ${escrowAddress}`);
          return { confirmed: true, actualAmount: balance };
        }
      } catch (err) {
        logger.warn('Balance check failed, retrying...', err);
      }

      await new Promise(r => setTimeout(r, 5_000)); // poll every 5s
    }

    return { confirmed: false };
  }

  /**
   * Forward escrowed funds to recipient on claim.
   * For premium: forwards full amount (gas from server wallet).
   * For standard: forwards amount minus claim gas.
   */
  async forwardFromEscrow(params: {
    escrowPrivateKey: string;
    recipientAddress: string;
    amount: number;
    chain: SupportedChain;
    feeModel: FeeModel;
  }): Promise<string> {
    const { escrowPrivateKey, recipientAddress, amount, chain, feeModel } = params;
    const gas = GAS_ESTIMATES[chain];
    const gasAmount = parseFloat(gas.transfer);

    if (feeModel === 'premium') {
      // For premium: send full amount from escrow
      // Server wallet covers claim gas separately
      const result = await chainService.sendNativeFromKey(
        escrowPrivateKey,
        recipientAddress,
        amount,
        chain
      );
      // Sweep any excess (premium fee profit) to server wallet
      try {
        const escrowBalance = await chainService.getBalance(
          privateKeyToAccount(escrowPrivateKey as `0x${string}`).address,
          chain
        );
        const remainingBalance = parseFloat(escrowBalance);
        if (remainingBalance > gasAmount * 1.5) {
          await chainService.sendNativeFromKey(
            escrowPrivateKey,
            SERVER_WALLET,
            remainingBalance - gasAmount,
            chain
          );
          logger.info(`Swept profit ${remainingBalance - gasAmount} to server wallet`);
        }
      } catch (err) {
        logger.warn('Profit sweep failed (non-critical)', err);
      }
      return result;
    }

    // Standard: deduct claim gas from recipient amount
    const recipientAmount = Math.max(0, amount - gasAmount);
    return chainService.sendNativeFromKey(
      escrowPrivateKey,
      recipientAddress,
      recipientAmount,
      chain
    );
  }

  getFeeModelDescription(feeModel: FeeModel, chain: SupportedChain): {
    title: string;
    description: string;
    cost: string;
  } {
    const gas = GAS_ESTIMATES[chain];
    if (feeModel === 'premium') {
      return {
        title: '⚡ Premium — $1 flat',
        description: 'You pay $1 extra. Backend covers all gas. Recipient gets the full amount. Fastest, simplest, no surprises.',
        cost: `$1 + your send amount`,
      };
    }
    return {
      title: '🔵 Standard — pay your own gas',
      description: `You pay your own gas when sending. Recipient gas (${gas.label}) deducted from their received amount automatically.`,
      cost: `Gas only (${gas.label} each way)`,
    };
  }
}

export const feeService = new FeeService();
