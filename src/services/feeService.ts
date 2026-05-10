/**
 * Fee Service — 1.5% Protocol Fee + Dual relay model
 */

import { chainService, type SupportedChain } from './celoService';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import { logger } from '../utils/logger';

export type FeeModel = 'standard' | 'premium';

const GAS_ESTIMATES: Record<SupportedChain, { transfer: string; label: string }> = {
  celo:  { transfer: '0.0005', label: '~$0.001' },
  base:  { transfer: '0.00005', label: '~$0.05'  },
  monad: { transfer: '0.001',  label: '~$0.002'  },
};

const PREMIUM_FEE_NATIVE: Record<SupportedChain, string> = {
  celo:  '1.0',
  base:  '0.0004',
  monad: '0.01',
};

const PROTOCOL_FEE_PERCENT = 0.015; // 1.5%

const SERVER_WALLET = process.env.SERVER_WALLET_ADDRESS
  || (process.env.WALLET_PRIVATE_KEY && privateKeyToAccount(process.env.WALLET_PRIVATE_KEY as `0x${string}`).address)
  || '0x9D65433B3FE597C15a46D2365F8F2c1701Eb9e4A';

export interface FeeQuote {
  feeModel: FeeModel;
  sendAmount: string;
  recipientAmount: string;
  feeAmount: string;
  protocolFee: string;
  gasEstimate: string;
  gasLabel: string;
  escrowAddress: string;
  escrowPrivateKey: string;
  serverProfit?: string;
}

class FeeService {
  generateEscrowWallet() {
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    return { address: account.address, privateKey };
  }

  async getFeeQuote(amount: number, chain: SupportedChain, feeModel: FeeModel): Promise<FeeQuote> {
    const gas = GAS_ESTIMATES[chain];
    const gasAmount = parseFloat(gas.transfer);
    const premiumFee = feeModel === 'premium' ? parseFloat(PREMIUM_FEE_NATIVE[chain]) : 0;
    const protocolFee = amount * PROTOCOL_FEE_PERCENT;
    const escrow = this.generateEscrowWallet();
    const totalFees = premiumFee + protocolFee;
    const recipientAmount = feeModel === 'premium' ? Math.max(0, amount - protocolFee) : Math.max(0, amount - protocolFee - gasAmount);

    return {
      feeModel,
      sendAmount: (amount + premiumFee).toFixed(8),
      recipientAmount: recipientAmount.toFixed(8),
      feeAmount: totalFees.toFixed(8),
      protocolFee: protocolFee.toFixed(8),
      gasEstimate: gas.transfer,
      gasLabel: gas.label,
      escrowAddress: escrow.address,
      escrowPrivateKey: escrow.privateKey,
      serverProfit: feeModel === 'premium' ? (totalFees - (gasAmount * 2)).toFixed(8) : protocolFee.toFixed(8),
    };
  }

  async sweepFees(escrowPrivateKey: string, amount: number, chain: SupportedChain) {
      const address = privateKeyToAccount(escrowPrivateKey as `0x${string}`).address;
      const balance = await chainService.getBalance(address, chain);
      const balanceNum = parseFloat(balance);
      if (balanceNum > 0.00001) {
          await chainService.sendNativeFromKey(escrowPrivateKey, SERVER_WALLET, balanceNum * 0.95, chain);
      }
  }
}

export const feeService = new FeeService();