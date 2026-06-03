export type FeeModel = 'standard' | 'premium' | 'protocol' | 'business' | 'personal' | 'gift_card';

export type PayoutMethod = 'crypto' | 'giftcard';

export interface FeeQuote {
  feeModel: FeeModel;
  amount: number;
  currency?: string;
  platformFee: string;
  protocolFee: string;
  totalFee: string;
  sendAmount: string;
  recipientAmount: string;
  feeAmount: string;
  gasEstimate: string;
  gasLabel: string;
  premiumFeeNative?: string;
  escrowAddress: string;
  escrowPrivateKey: string;
  serverProfit?: string;
  feeBreakdown?: Array<{
    name: string;
    amount: string;
    percentage: number;
  }>;
}
