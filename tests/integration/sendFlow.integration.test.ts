/**
 * Integration tests for Remittance Send Flow with Wallet Generation
 *
 * Tests the complete send flow including wallet generation endpoint.
 */

import request from 'supertest';
import express from 'express';
import { transactionRoutes } from '../../src/controllers/transactionController';

// Mock dependencies
jest.mock('../../src/services/remittanceService', () => ({
  remittanceService: {
    createRemittance: jest.fn().mockResolvedValue({
      id: 'remittance-123',
      claimToken: 'token-123',
      claimUrl: 'http://localhost:3000/claim/token-123',
    }),
    getRemittanceStatus: jest.fn().mockReturnValue({
      id: 'remittance-123',
      status: 'pending',
      senderEmail: 'sender@example.com',
      recipientEmail: 'recipient@example.com',
      amountCelo: '1.0',
    }),
  },
}));

jest.mock('../../src/services/celoService', () => ({
  chainService: {
    getWalletAddress: jest.fn().mockReturnValue('0x1234567890abcdef1234567890abcdef12345678'),
    getBalance: jest.fn().mockResolvedValue('10.0'),
  },
  detectChain: jest.fn().mockReturnValue('celo'),
}));

jest.mock('../../src/services/celo.service', () => ({
  celoService: {
    getBalance: jest.fn().mockResolvedValue('10.0'),
  },
}));

jest.mock('../../src/services/feeService', () => ({
  feeService: {
    getFeeQuote: jest.fn().mockResolvedValue({
      feeModel: 'protocol',
      amount: 1.0,
      currency: 'CELO',
      platformFee: '0.015',
      protocolFee: '0.015',
      totalFee: '0.015',
      sendAmount: '1.015',
      recipientAmount: '1.0',
      feeAmount: '0.015',
      gasEstimate: '0.0005',
      gasLabel: '~$0.001',
      premiumFeeNative: '1.0',
      escrowAddress: '0x1234567890abcdef1234567890abcdef12345678',
      escrowPrivateKey: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      serverProfit: '0.015',
    }),
    generateEscrowWallet: jest.fn().mockReturnValue({
      address: '0x1234567890abcdef1234567890abcdef12345678',
      privateKey: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    }),
  },
}));

jest.mock('../../src/services/selfSessionStore', () => ({
  validateSenderSession: jest.fn().mockReturnValue({
    nationality: 'US',
    documentType: 'passport',
  }),
}));

jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Remittance Send Flow with Wallet Generation - Integration Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/remittance', transactionRoutes);
  });

  describe('POST /api/remittance/wallet/generate', () => {
    it('should generate a new wallet', async () => {
      const response = await request(app)
        .post('/api/remittance/wallet/generate')
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('address');
      expect(response.body.data).toHaveProperty('privateKey');
      expect(response.body.data).toHaveProperty('importInstructions');
      expect(response.body.data.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(response.body.data.privateKey).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });

    it('should include warning about saving private key', async () => {
      const response = await request(app)
        .post('/api/remittance/wallet/generate')
        .expect(201);

      expect(response.body.data.warning).toContain('SAVE YOUR PRIVATE KEY');
    });

    it('should include import instructions', async () => {
      const response = await request(app)
        .post('/api/remittance/wallet/generate')
        .expect(201);

      expect(response.body.data.importInstructions).toContain('MetaMask');
      expect(response.body.data.importInstructions).toContain('Valora');
    });

    it('should generate unique wallets on each request', async () => {
      const response1 = await request(app)
        .post('/api/remittance/wallet/generate')
        .expect(201);

      const response2 = await request(app)
        .post('/api/remittance/wallet/generate')
        .expect(201);

      expect(response1.body.data.address).not.toBe(response2.body.data.address);
      expect(response1.body.data.privateKey).not.toBe(response2.body.data.privateKey);
    });
  });

  describe('GET /api/remittance/service-wallet', () => {
    it('should return service wallet info', async () => {
      const response = await request(app)
        .get('/api/remittance/service-wallet')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('address');
      expect(response.body.data).toHaveProperty('balance');
      expect(response.body.data).toHaveProperty('chain');
    });

    it('should accept chain query parameter', async () => {
      const response = await request(app)
        .get('/api/remittance/service-wallet?chain=base')
        .expect(200);

      expect(response.body.data.chain).toBe('base');
    });
  });
});
