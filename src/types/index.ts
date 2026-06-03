// Core types
export interface Remittance {
  id: string;
  sender_email: string;
  recipient_email: string;
  amount: number;
  currency: string;
  original_amount: number;
  amount_celo: number;
  platform_fee: number;
  status: string;
  token: string;
  sender_wallet: string;
  recipient_wallet: string;
  wallet_mode: string;
  require_auth: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateRemittanceResult {
  token: string;
  requireAuth: boolean;
  walletMode: string;
  instructions?: string;
  claimToken?: string;
}

export interface ClaimRemittanceResult {
  success: boolean;
  txHash?: string;
  wallet?: string;
  privateKey?: string;
  instructions?: string;
  requireVerification?: boolean;
  verificationToken?: string;
}

export interface BusinessOwner {
  name: string;
  email: string;
  walletAddress: string;
  businessName: string;
  businessType: string;
  country: string;
}

// Verification types
export * from './verification';

// Fee types
export interface FeeQuote {
  amount: number;
  currency: string;
  platformFee: string;
  totalFee: string;
  feeBreakdown: Array<{
    name: string;
    amount: string;
    percentage: number;
  }>;
}

export type FeeModel = 'standard' | 'premium' | 'protocol';

export type WalletMode = 'personal' | 'service';

export type SupportedChain = 'celo' | 'base' | 'monad';
