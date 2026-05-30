/**
 * Fee Service — Unified protocol fee model (1.5%)
 * 
 * PROTOCOL FEE (1.5% flat):
 *   - A flat 1.5% fee on all transfers
 *   - Sender pays their own gas to send funds TO escrow
 *   - Recipient pays their own gas to withdraw funds FROM escrow
 *   - Platform profit: 1.5% fee amount (no gas costs to platform)
 *   
 * Escrow model:
 *   - Backend generates a per-remittance throwaway escrow wallet
 *   - Sender sends funds directly to that address from their browser wallet (pays their own gas)
 *   - Backend watches for deposit confirmation, then sends claim email
 *   - On claim (after approval if required), backend transfers from escrow to recipient
 *   - Recipient pays their own gas for the withdrawal transaction
 */

import { chainService, type SupportedChain, getNativeCurrency } from './celoService';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import { parseEther, formatEther } from 'viem';
import { logger } from '../utils/logger';

// Keep backward compat: 'standard' and 'premium' map to 'protocol' internally
export type FeeModel = 'standard' | 'premium' | 'protocol';
export type PayoutMethod = 'crypto' | 'giftcard';

const PROTOCOL_FEE_PERCENT = 0.015; // 1.5% base protocol fee
const STORAGE_FEE_PERCENT = 0.015;  // 1.5% storage fee (applied only to unclaimed remittances)

// Gas estimates (in native token) per chain - for estimation only, users pay their own
const GAS_ESTIMATES: Record<SupportedChain, { transfer: string; label: string }> = {
  celo:  { transfer: '0.0005', label: '~$0.001' },
  base:  { transfer: '0.00005', label: '~$0.05'  },
  monad: { transfer: '0.001',  label: '~$0.002'  },
};

// Premium fee: $1 in native token (approximate — kept for backward compatibility)
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
  sendAmount: string;           // what sender sends TO escrow (amount + 1.5% fee)
  recipientAmount: string;      // what recipient gets FROM escrow (amount - they pay claim gas)
  feeAmount: string;            // the 1.5% protocol fee (platform profit)
  gasEstimate: string;          // gas cost in native token (for estimation only)
  gasLabel: string;             // human-readable gas cost
  premiumFeeNative: string;     // $1 in native token (backward compatibility)
  escrowAddress: string;        // where sender sends funds
  escrowPrivateKey: string;     // server keeps this to verify deposit and forward IF authorized
  serverProfit?: string;        // estimated profit (1.5% fee amount)
}

export interface EscrowWallet {
  address: string;
  privateKey: string;
}

class FeeService {
  /**
   * Calculate storage fee for expired/returned remittances
   * 1.5% fee applied only when funds are returned after 7 days
   */
  async calculateStorageFee(amount: number): Promise<string> {
    const storageFee = amount * STORAGE_FEE_PERCENT;
    return storageFee.toFixed(8);
  }
  /**
   * Generate a throwaway escrow wallet for one remittance.
   * Server holds the private key ONLY to verify deposit and forward funds IF authorized.
   * Platform NEVER pays gas - users pay their own gas for both deposit and withdrawal.
   */
  generateEscrowWallet(): EscrowWallet {
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    return { address: account.address, privateKey };
  }

  /**
   * Calculate the fee quote for a remittance.
   * Returns escrow address + exact amounts.
   * 
   * Sender sends: amount + 1.5% fee TO escrow (pays their own gas)
   * Recipient receives: amount FROM escrow (pays their own claim gas)
   * Platform profit: 1.5% fee amount
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

    // Unified protocol fee: always 1.5%
    const protocolFee = amount * PROTOCOL_FEE_PERCENT;
    const sendAmount = amount + protocolFee; // What sender sends TO escrow
    const recipientAmount = amount;          // What recipient gets FROM escrow (they pay claim gas)
    const serverProfit = protocolFee;        // Platform keeps the 1.5% fee

    return {
      feeModel: 'protocol', // Always report as protocol now
      sendAmount: sendAmount.toFixed(8),
      recipientAmount: recipientAmount.toFixed(8),
      feeAmount: protocolFee.toFixed(8),
      gasEstimate: gas.transfer,
      gasLabel: gas.label,
      premiumFeeNative: PREMIUM_FEE_NATIVE[chain],
      escrowAddress: escrow.address,
      escrowPrivateKey: escrow.privateKey,
      serverProfit: serverProfit.toFixed(8),
    };
  }

  /**
   * Watch for deposit confirmation on escrow address.
   * Polls until funds arrive or timeout.
   * Note: Sender pays gas for this transaction.
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
   * Platform NEVER pays gas - recipient pays their own gas.
   * 
   * For all fee models (standard/premium/protocol): 
   * - Send full amount FROM escrow TO recipient
   * - Recipient pays gas for this transaction
   * - Platform keeps the 1.5% fee that was already in the escrow
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

    // Platform NEVER pays gas - recipient pays their own gas for withdrawal
    // Send full amount from escrow to recipient
    // Recipient will pay gas from their own wallet for this transaction
    return chainService.sendNativeFromKey(
      escrowPrivateKey,
      recipientAddress,
      amount,
      chain
    );
  }

  /**
   * Get fee model description for UI/display
   */
  getFeeModelDescription(feeModel: FeeModel, chain: SupportedChain): {
    title: string;
    description: string;
    cost: string;
  } {
    const gas = GAS_ESTIMATES[chain];
    const feePercent = (PROTOCOL_FEE_PERCENT * 100).toFixed(1);
    return {
      title: `⚡ ${feePercent}% Protocol Fee`,
      description: `A flat ${feePercent}% fee on all transfers. Sender pays their own gas to deposit. Recipient gets full amount but pays their own gas to withdraw. Platform profit is the fee amount.`,
      cost: `${feePercent}% fee (sender pays deposit gas, recipient pays withdrawal gas)`,
    };
  }
}

export const feeService = new FeeService();