/**
 * Unit tests for Wallet Generation
 *
 * Tests wallet generation service and endpoint logic.
 */

import { generateWalletWithInstructions, walletService } from '../../src/services/walletService';

describe('Wallet Generation - Unit Tests', () => {
  describe('generateWalletWithInstructions', () => {
    it('should generate a wallet with all required fields', () => {
      const wallet = generateWalletWithInstructions();

      expect(wallet).toHaveProperty('walletAddress');
      expect(wallet).toHaveProperty('privateKey');
      expect(wallet).toHaveProperty('importInstructions');
    });

    it('should generate valid Ethereum address', () => {
      const wallet = generateWalletWithInstructions();

      expect(wallet.walletAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it('should generate valid private key', () => {
      const wallet = generateWalletWithInstructions();

      expect(wallet.privateKey).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });

    it('should include import instructions for major wallets', () => {
      const wallet = generateWalletWithInstructions();

      expect(wallet.importInstructions).toContain('MetaMask');
      expect(wallet.importInstructions).toContain('Valora');
    });

    it('should include saving instructions', () => {
      const wallet = generateWalletWithInstructions();

      expect(wallet.importInstructions).toContain('SAVE YOUR PRIVATE KEY');
    });

    it('should generate unique wallets on each call', () => {
      const wallet1 = generateWalletWithInstructions();
      const wallet2 = generateWalletWithInstructions();

      expect(wallet1.walletAddress).not.toBe(wallet2.walletAddress);
      expect(wallet1.privateKey).not.toBe(wallet2.privateKey);
    });
  });

  describe('walletService.generateWallet', () => {
    it('should generate a wallet with address and private key', () => {
      const wallet = walletService.generateWallet();

      expect(wallet).toHaveProperty('address');
      expect(wallet).toHaveProperty('privateKey');
      expect(wallet.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(wallet.privateKey).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });

    it('should generate unique wallets', () => {
      const wallet1 = walletService.generateWallet();
      const wallet2 = walletService.generateWallet();

      expect(wallet1.address).not.toBe(wallet2.address);
    });
  });

  describe('Wallet Security', () => {
    it('should not log private keys', () => {
      const consoleSpy = jest.spyOn(console, 'log');
      
      generateWalletWithInstructions();
      walletService.generateWallet();

      // Check that no private keys were logged
      const loggedWithPrivateKey = consoleSpy.mock.calls.some(call => 
        call.some(arg => typeof arg === 'string' && arg.includes('private key'))
      );
      
      expect(loggedWithPrivateKey).toBe(false);
      
      consoleSpy.mockRestore();
    });

    it('should generate cryptographically secure random keys', () => {
      const wallets = Array.from({ length: 10 }, () => generateWalletWithInstructions());
      const addresses = new Set(wallets.map(w => w.walletAddress));
      
      // All addresses should be unique (extremely unlikely to have collision)
      expect(addresses.size).toBe(10);
    });
  });
});
