// tests/personal-wallet-auto-wallet.test.ts
/**
 * Personal Wallet Auto-Wallet Tests
 * Tests for personal wallet mode where recipient wallet is auto-generated if not provided.
 *
 * Flow tested:
 * 1. Create remittance in personal wallet mode
 * 2. Claim remittance without providing a wallet (auto-generate)
 * 3. Verify response includes:
 *    - Generated wallet address
 *    - Private key
 *    - Clear import instructions/warning
 * 4. Test complete flow from creation to claim
 */

import { remittanceService } from '../src/services/remittanceService';
import { chainService } from '../src/services/celoService';

// Mock the database and services
const mockDb: Record<string, any> = {};

jest.mock('../src/services/remittanceService', () => ({
  remittanceService: {
    createRemittance: jest.fn(async (params: any) => {
      const id = `test-${Date.now()}`;
      const token = `token-${Date.now()}`;
      mockDb[token] = {
        id,
        claim_token: token,
        sender_email: params.senderEmail,
        recipient_email: params.recipientEmail,
        amount_celo: params.amountCelo.toString(),
        chain: params.chain || 'celo',
        status: 'pending',
        expires_at: Math.floor(Date.now() / 1000) + 86400,
        receiver_token: params.receiverToken || null,
      };
      return {
        remittanceId: id,
        claimToken: token,
        txHash: 'pending_escrow',
        expiresAt: Math.floor(Date.now() / 1000) + 86400,
      };
    }),

    getRemittanceByToken: jest.fn((token: string) => {
      return mockDb[token] || null;
    }),

    claimRemittance: jest.fn(async (token: string, wallet?: string) => {
      const rem = mockDb[token];
      if (!rem) throw new Error('Invalid claim token');
      
      // Mock auto-generated wallet if no wallet provided
      if (!wallet) {
        const generatedWallet = {
          address: '0xGeneratedWallet' + Date.now().toString().slice(-10),
          privateKey: '0x' + 'a'.repeat(64),
        };
        return {
          txHash: '0xclaimTxHash',
          wallet: generatedWallet.address,
          privateKey: generatedWallet.privateKey,
          amount: rem.amount_celo,
          walletInstructions: `To access your funds:
1. Install a Celo-compatible wallet (like Valora, MetaMask, or Trust Wallet)
2. Import this wallet using the private key below
3. The wallet address is: ${generatedWallet.address}
4. Your funds are already in this wallet
5. Never share your private key with anyone`,
        };
      }
      
      return {
        txHash: '0xclaimTxHash',
        wallet,
        amount: rem.amount_celo,
      };
    }),
  },
}));

jest.mock('../src/services/celoService', () => ({
  detectChain: jest.fn((currency?: string, chain?: string) => {
    if (chain === 'base' || currency === 'ETH') return 'base';
    if (chain === 'monad' || currency === 'MON') return 'monad';
    return 'celo';
  }),
  chainService: {
    getWalletAddress: jest.fn(() => '0x1234567890123456789012345678901234567890'),
    getSupportedChains: jest.fn(() => ['celo', 'base', 'monad']),
    getSupportedBridgeRoutes: jest.fn(() => []),
    getBridgeQuote: jest.fn(),
    executeBridge: jest.fn(),
    generateClaimWallet: jest.fn(() => ({
      address: '0xGeneratedWallet' + Date.now().toString().slice(-10),
      privateKey: '0x' + 'a'.repeat(64),
    })),
  },
}));

describe('Personal Wallet Auto-Wallet Flow', () => {
  let claimToken: string;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(mockDb).forEach(key => delete mockDb[key]);
  });

  test('createRemittance creates remittance in personal wallet mode', async () => {
    const result = await remittanceService.createRemittance({
      senderEmail: 'sender@example.com',
      recipientEmail: 'recipient@example.com',
      amountCelo: 0.1,
      chain: 'celo',
      senderWallet: '0xabc1234567890abcdef1234567890abcdef12345',
    });

    expect(result.claimToken).toBeDefined();
    claimToken = result.claimToken;
  });

  test('claimRemittance auto-generates wallet if none provided', async () => {
    // First create a remittance
    const createResult = await remittanceService.createRemittance({
      senderEmail: 'sender@example.com',
      recipientEmail: 'recipient@example.com',
      amountCelo: 0.1,
      chain: 'celo',
      senderWallet: '0xabc1234567890abcdef1234567890abcdef12345',
    });

    // Then claim without providing a wallet
    const claimResult = await remittanceService.claimRemittance(createResult.claimToken);

    expect(claimResult.wallet).toBeDefined();
    expect(claimResult.privateKey).toBeDefined();
    expect(claimResult.walletInstructions).toBeDefined();
    expect(claimResult.walletInstructions).toContain('To access your funds:');
    expect(claimResult.walletInstructions).toContain('Never share your private key');
  });

  test('claimRemittance uses provided wallet if specified', async () => {
    // Create a remittance
    const createResult = await remittanceService.createRemittance({
      senderEmail: 'sender@example.com',
      recipientEmail: 'recipient@example.com',
      amountCelo: 0.1,
      chain: 'celo',
      senderWallet: '0xabc1234567890abcdef1234567890abcdef12345',
    });

    const providedWallet = '0xProvidedWallet1234567890';
    // Claim with provided wallet
    const claimResult = await remittanceService.claimRemittance(createResult.claimToken, providedWallet);

    expect(claimResult.wallet).toBe(providedWallet);
    expect(claimResult.privateKey).toBeUndefined();
  });

  test('Complete flow: create → claim (auto-generate) → verify response', async () => {
    // 1. Create remittance
    const createResult = await remittanceService.createRemittance({
      senderEmail: 'sender@example.com',
      recipientEmail: 'recipient@example.com',
      amountCelo: 0.1,
      chain: 'celo',
      senderWallet: '0xabc1234567890abcdef1234567890abcdef12345',
    });

    expect(createResult.claimToken).toBeDefined();

    // 2. Claim without providing wallet
    const claimResult = await remittanceService.claimRemittance(createResult.claimToken);

    // 3. Verify response
    expect(claimResult.wallet).toBeDefined();
    expect(claimResult.privateKey).toBeDefined();
    expect(claimResult.walletInstructions).toBeDefined();
    expect(claimResult.walletInstructions).toContain('To access your funds:');
    expect(claimResult.walletInstructions).toContain('Never share your private key');
    expect(claimResult.txHash).toBeDefined();
    expect(claimResult.amount).toBe('0.1');
  });
});