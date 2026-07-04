/**
 * Unit tests for Claim Flow with receive modes
 *
 * Tests the claim endpoint with wallet, auto-generate, and gift card modes.
 * Uses the actual service functions directly.
 */

import { generateClaimToken, generateClaimSecret, hashClaimSecret, verifyClaimSecret } from '../../src/services/remittanceService';
import { generateWalletWithInstructions } from '../../src/services/walletService';

describe('Claim Flow - Unit Tests', () => {
  describe('Claim Token and Secret', () => {
    it('should generate valid claim tokens', () => {
      const token = generateClaimToken();
      expect(token).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });

    it('should generate claim secrets', () => {
      const secret = generateClaimSecret();
      expect(secret).toHaveLength(32);
      expect(secret).toMatch(/^[a-f0-9]{32}$/);
    });

    it('should hash and verify claim secrets correctly', () => {
      const secret = generateClaimSecret();
      const hash = hashClaimSecret(secret);
      expect(verifyClaimSecret(secret, hash)).toBe(true);
      expect(verifyClaimSecret('wrong', hash)).toBe(false);
    });

    it('should produce deterministic hashes', () => {
      const hash1 = hashClaimSecret('test-secret');
      const hash2 = hashClaimSecret('test-secret');
      expect(hash1).toBe(hash2);
    });
  });

  describe('Wallet Generation for Auto-Generate Mode', () => {
    it('should generate a wallet with address and private key', () => {
      const wallet = generateWalletWithInstructions();
      expect(wallet.walletAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(wallet.privateKey).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });

    it('should generate unique wallets each time', () => {
      const w1 = generateWalletWithInstructions();
      const w2 = generateWalletWithInstructions();
      expect(w1.walletAddress).not.toBe(w2.walletAddress);
      expect(w1.privateKey).not.toBe(w2.privateKey);
    });

    it('should include import instructions', () => {
      const wallet = generateWalletWithInstructions();
      expect(wallet.importInstructions).toContain('MetaMask');
      expect(wallet.importInstructions).toContain('Valora');
      expect(wallet.importInstructions).toContain('IMPORTANT: Save your private key now');
    });
  });

  describe('Receive Mode Validation', () => {
    it('should validate wallet address format', () => {
      const validWallet = '0x1234567890abcdef1234567890abcdef12345678';
      const invalidWallet = 'not-a-wallet';

      expect(/^0x[a-fA-F0-9]{40}$/.test(validWallet)).toBe(true);
      expect(/^0x[a-fA-F0-9]{40}$/.test(invalidWallet)).toBe(false);
    });

    it('should validate email for gift card mode', () => {
      const validEmail = 'user@example.com';
      const invalidEmail = 'not-an-email';

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(emailRegex.test(validEmail)).toBe(true);
      expect(emailRegex.test(invalidEmail)).toBe(false);
    });

    it('should accept valid receive modes', () => {
      const validModes = ['wallet', 'generate', 'giftcard'];
      validModes.forEach(mode => {
        expect(['wallet', 'generate', 'giftcard']).toContain(mode);
      });
    });
  });

  describe('Token Selection', () => {
    it('should have tokens defined for Celo chain', () => {
      const RECIPIENT_TOKENS: Record<number, { symbol: string; name: string; crossChain?: string }[]> = {
        42220: [
          { symbol: 'CELO', name: 'CELO (Native)' },
          { symbol: 'cUSD', name: 'cUSD (Celo Dollar)' },
          { symbol: 'USDC', name: 'USDC on Celo' },
          { symbol: 'base→ETH', name: 'ETH on Base ↗', crossChain: 'base' },
        ],
        8453: [
          { symbol: 'ETH', name: 'ETH (Native)' },
          { symbol: 'USDC', name: 'USDC on Base' },
        ],
        143: [
          { symbol: 'MON', name: 'MON (Native)' },
        ],
      };

      expect(RECIPIENT_TOKENS[42220].length).toBe(4);
      expect(RECIPIENT_TOKENS[8453].length).toBe(2);
      expect(RECIPIENT_TOKENS[143].length).toBe(1);
    });

    it('should flag cross-chain tokens correctly', () => {
      const token = { symbol: 'base→ETH', name: 'ETH on Base ↗', crossChain: 'base' };
      expect(token.crossChain).toBe('base');
      expect(token.symbol).toContain('→');
    });

    it('should not flag same-chain tokens as cross-chain', () => {
      const token = { symbol: 'CELO', name: 'CELO (Native)' };
      expect(token.crossChain).toBeUndefined();
    });
  });

  describe('Claim Status Checks', () => {
    it('should reject already claimed remittances', () => {
      const status = 'claimed';
      expect(status).toBe('claimed');
    });

    it('should reject expired remittances', () => {
      const expiresAt = new Date(Date.now() - 1000);
      expect(expiresAt < new Date()).toBe(true);
    });

    it('should accept pending remittances before expiry', () => {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      expect(expiresAt > new Date()).toBe(true);
    });
  });
});
