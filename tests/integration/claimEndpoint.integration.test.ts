/**
 * Integration tests for Claim Endpoint with receive modes
 *
 * Tests the GET /api/remittance/claim/:token endpoint with
 * wallet, generate, and giftcard modes.
 */

import request from 'supertest';
import express from 'express';
import Database from 'better-sqlite3';
import { transactionRoutes } from '../../src/controllers/transactionController';

// Mock dependencies that aren't under test
jest.mock('../../src/services/celoService', () => ({
  chainService: {
    getWalletAddress: jest.fn().mockReturnValue('0x9D65433B3FE597C15a46D2365F8F2c1701Eb9e4A'),
    getBalance: jest.fn().mockResolvedValue('10.0'),
    sendNativeFromKey: jest.fn().mockResolvedValue('0xmocktxhash'),
  },
  detectChain: jest.fn().mockReturnValue('celo'),
  getNativeCurrency: jest.fn().mockReturnValue('CELO'),
}));

jest.mock('../../src/services/celo.service', () => ({
  celoService: { getBalance: jest.fn().mockResolvedValue('10.0') },
}));

jest.mock('../../src/services/uniswapService', () => ({
  uniswapService: {},
}));

jest.mock('../../src/services/uniswapQuoteService', () => ({
  uniswapQuoteService: {},
}));

jest.mock('../../src/services/swapService', () => ({
  swapService: {},
}));

jest.mock('../../src/services/feeService', () => ({
  feeService: {
    getFeeQuote: jest.fn().mockResolvedValue({
      feeModel: 'protocol',
      amount: 1.0,
      sendAmount: '1.015',
      recipientAmount: '1.0',
      feeAmount: '0.015',
      escrowAddress: '0x9D65433B3FE597C15a46D2365F8F2c1701Eb9e4A',
      escrowPrivateKey: '0x' + 'ab'.repeat(32),
    }),
    generateEscrowWallet: jest.fn().mockReturnValue({
      address: '0x9D65433B3FE597C15a46D2365F8F2c1701Eb9e4A',
      privateKey: '0x' + 'ab'.repeat(32),
    }),
  },
}));

jest.mock('../../src/services/selfSessionStore', () => ({
  validateSenderSession: jest.fn().mockReturnValue({ nationality: 'US', documentType: 'passport' }),
}));

jest.mock('../../src/services/emailNotifier', () => ({
  emailNotifier: {
    sendClaimEmail: jest.fn().mockResolvedValue(true),
    sendExpiredNotification: jest.fn().mockResolvedValue(true),
  },
}));

jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Claim Endpoint Integration Tests', () => {
  let app: express.Application;
  let db: Database.Database;
  let claimToken: string;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/remittance', transactionRoutes);

    // Error handler to expose actual error messages in test
    app.use((err: any, _req: any, res: any, _next: any) => {
      res.status(500).json({ success: false, error: err.message || 'Unknown error' });
    });

    // Use the real database
    const dbModule = require('../../src/db/database');
    db = dbModule.db;
  });

  beforeEach(() => {
    // Clean up and insert a test remittance
    db.prepare('DELETE FROM remittances').run();

    claimToken = require('uuid').v4();
    const { hashClaimSecret } = require('../../src/services/remittanceService');
    const claimTokenHash = hashClaimSecret(claimToken);
    const now = Math.floor(Date.now() / 1000);
    const futureExpiry = now + 604800; // 7 days

    db.prepare(`
      INSERT INTO remittances (id, claim_token, sender_email, recipient_email, amount_celo, status, chain, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'test-remittance-1',
      claimTokenHash,
      'sender@example.com',
      'recipient@example.com',
      '1.0',
      'pending',
      'celo',
      futureExpiry,
      now
    );
  });

  describe('GET /api/remittance/claim/:token — wallet mode', () => {
    it('should claim with wallet address', async () => {
      const response = await request(app)
        .get(`/api/remittance/claim/${claimToken}`)
        .query({ recipientWallet: '0x1234567890abcdef1234567890abcdef12345678', receiveMode: 'wallet' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.txHash).toBeDefined();
      expect(response.body.data.receiveMode).toBe('wallet');
    });

    it('should reject claim without wallet address in wallet mode', async () => {
      const response = await request(app)
        .get(`/api/remittance/claim/${claimToken}`)
        .query({ receiveMode: 'wallet' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Wallet address is required');
    });

    it('should reject claim with invalid token', async () => {
      const response = await request(app)
        .get('/api/remittance/claim/invalid-token')
        .query({ recipientWallet: '0x1234567890abcdef1234567890abcdef12345678' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/remittance/claim/:token — generate mode', () => {
    it('should claim with auto-generated wallet', async () => {
      const response = await request(app)
        .get(`/api/remittance/claim/${claimToken}`)
        .query({ receiveMode: 'generate' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.privateKey).toBeDefined();
      expect(response.body.data.wallet).toBeDefined();
      expect(response.body.data.receiveMode).toBe('generate');
      expect(response.body.data.warning).toContain('SAVE YOUR PRIVATE KEY');
    });

    it('should return valid wallet address', async () => {
      const response = await request(app)
        .get(`/api/remittance/claim/${claimToken}`)
        .query({ receiveMode: 'generate' })
        .expect(200);

      expect(response.body.data.wallet).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(response.body.data.privateKey).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });

    it('should generate unique wallets for each claim', async () => {
      // Use a new token
      const token2 = require('uuid').v4();
      const { hashClaimSecret: hash2 } = require('../../src/services/remittanceService');
      const now = Math.floor(Date.now() / 1000);
      db.prepare(`
        INSERT INTO remittances (id, claim_token, sender_email, recipient_email, amount_celo, status, chain, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run('test-remittance-2', hash2(token2), 'sender@example.com', 'recipient@example.com', '0.5', 'pending', 'celo', now + 604800);

      const response1 = await request(app)
        .get(`/api/remittance/claim/${claimToken}`)
        .query({ receiveMode: 'generate' })
        .expect(200);

      const response2 = await request(app)
        .get(`/api/remittance/claim/${token2}`)
        .query({ receiveMode: 'generate' })
        .expect(200);

      expect(response1.body.data.wallet).not.toBe(response2.body.data.wallet);
    });
  });

  describe('GET /api/remittance/claim/:token — giftcard mode', () => {
    it('should claim as gift card', async () => {
      const response = await request(app)
        .get(`/api/remittance/claim/${claimToken}`)
        .query({ receiveMode: 'giftcard', giftCardEmail: 'gift@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.receiveMode).toBe('giftcard');
      expect(response.body.data.giftCardEmail).toBe('gift@example.com');
      expect(response.body.data.giftCardSent).toBe(true);
    });

    it('should reject gift card without email', async () => {
      const response = await request(app)
        .get(`/api/remittance/claim/${claimToken}`)
        .query({ receiveMode: 'giftcard' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Gift card email is required');
    });
  });

  describe('GET /api/remittance/claim/:token — status checks', () => {
    it('should reject already claimed remittance', async () => {
      // Claim once
      await request(app)
        .get(`/api/remittance/claim/${claimToken}`)
        .query({ recipientWallet: '0x1234567890abcdef1234567890abcdef12345678' });

      // Try to claim again
      const response = await request(app)
        .get(`/api/remittance/claim/${claimToken}`)
        .query({ recipientWallet: '0x1234567890abcdef1234567890abcdef12345678' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already been claimed');
    });

    it('should reject expired remittance', async () => {
      // Set the remittance as expired
      db.prepare('UPDATE remittances SET status = ? WHERE id = ?').run('expired', 'test-remittance-1');

      const response = await request(app)
        .get(`/api/remittance/claim/${claimToken}`)
        .query({ recipientWallet: '0x1234567890abcdef1234567890abcdef12345678' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('expired');
    });
  });

  describe('GET /api/remittance/claim/:token — token selection', () => {
    it('should accept desiredToken parameter', async () => {
      const response = await request(app)
        .get(`/api/remittance/claim/${claimToken}`)
        .query({
          recipientWallet: '0x1234567890abcdef1234567890abcdef12345678',
          desiredToken: 'base→ETH',
        })
        .expect(200);

      expect(response.body.data.desiredToken).toBe('base→ETH');
    });

    it('should default desiredToken to null', async () => {
      const response = await request(app)
        .get(`/api/remittance/claim/${claimToken}`)
        .query({ recipientWallet: '0x1234567890abcdef1234567890abcdef12345678' })
        .expect(200);

      expect(response.body.data.desiredToken).toBeNull();
    });
  });
});
