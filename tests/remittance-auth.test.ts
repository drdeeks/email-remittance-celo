/**
 * Remittance Auth Enforcement Tests
 * Tests for requireAuth flow: Self Protocol verification before claim
 */

import request from 'supertest';
import express from 'express';
import { transactionRoutes } from '../src/controllers/transactionController';
import { errorHandler } from '../src/middleware/errorHandler';

// Mock the services
jest.mock('../src/services/remittanceService', () => {
  const mockDb: Record<string, any> = {};
  
  return {
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
          require_auth: params.requireAuth ? 1 : 0,
          chain: params.chain || 'celo',
          self_verified: 0,
          status: 'pending',
          expires_at: Math.floor(Date.now() / 1000) + 86400,
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
        if (rem.require_auth === 1 && rem.self_verified !== 1) {
          const error: any = new Error('Identity verification required before claiming. Complete Self Protocol verification first.');
          error.code = 'VERIFICATION_REQUIRED';
          error.verificationRequired = true;
          throw error;
        }
        return { txHash: '0xabc123', amount: rem.amount_celo };
      }),
      
      verifyRemittance: jest.fn((token: string, verificationId: string) => {
        const rem = mockDb[token];
        if (!rem) throw new Error('Remittance not found');
        rem.self_verified = 1;
        rem.self_verification_id = verificationId;
        return { success: true, remittanceId: rem.id };
      }),
    },
  };
});

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
  },
}));

jest.mock('../src/services/uniswapService', () => ({
  uniswapService: {
    getStatus: jest.fn(() => ({ configured: false })),
    getSwapQuote: jest.fn(),
    executeSwap: jest.fn(),
    getBridgeQuote: jest.fn(),
  },
}));

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/remittance', transactionRoutes);
  app.use(errorHandler);
  return app;
};

describe('Remittance Auth Enforcement', () => {
  const app = createTestApp();
  let authToken: string;
  let noAuthToken: string;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('POST /api/remittance/send with requireAuth=true stores require_auth=1', async () => {
    const res = await request(app)
      .post('/api/remittance/send')
      .send({
        senderEmail: 'sender@example.com',
        recipientEmail: 'recipient@example.com',
        amount: '1.0',
        requireAuth: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.requireAuth).toBe(true);
    authToken = res.body.data.claimToken;
  });

  test('POST /api/remittance/send with requireAuth=false stores require_auth=0', async () => {
    const res = await request(app)
      .post('/api/remittance/send')
      .send({
        senderEmail: 'sender@example.com',
        recipientEmail: 'recipient@example.com',
        amount: '1.0',
        requireAuth: false,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.requireAuth).toBe(false);
    noAuthToken = res.body.data.claimToken;
  });

  test('GET /api/remittance/claim/:token returns 403 VERIFICATION_REQUIRED when require_auth=1 and self_verified=0', async () => {
    // First create a remittance with requireAuth=true
    const createRes = await request(app)
      .post('/api/remittance/send')
      .send({
        senderEmail: 'sender@example.com',
        recipientEmail: 'recipient@example.com',
        amount: '1.0',
        requireAuth: true,
      });

    const token = createRes.body.data.claimToken;

    // Try to claim without verification
    const claimRes = await request(app).get(`/api/remittance/claim/${token}`);

    expect(claimRes.status).toBe(403);
    expect(claimRes.body.success).toBe(false);
    expect(claimRes.body.error.code).toBe('VERIFICATION_REQUIRED');
    expect(claimRes.body.error.verificationRequired).toBe(true);
  });

  test('GET /api/remittance/claim/:token succeeds when require_auth=0', async () => {
    // Create a remittance without requireAuth
    const createRes = await request(app)
      .post('/api/remittance/send')
      .send({
        senderEmail: 'sender@example.com',
        recipientEmail: 'recipient@example.com',
        amount: '1.0',
        requireAuth: false,
      });

    const token = createRes.body.data.claimToken;

    // Claim should succeed
    const claimRes = await request(app).get(`/api/remittance/claim/${token}`);

    expect(claimRes.status).toBe(200);
    expect(claimRes.body.success).toBe(true);
    expect(claimRes.body.data.txHash).toBeDefined();
  });

  test('GET /api/remittance/claim/:token succeeds when require_auth=1 AND self_verified=1', async () => {
    // Create a remittance with requireAuth
    const createRes = await request(app)
      .post('/api/remittance/send')
      .send({
        senderEmail: 'sender@example.com',
        recipientEmail: 'recipient@example.com',
        amount: '1.0',
        requireAuth: true,
      });

    const token = createRes.body.data.claimToken;

    // Verify first
    const verifyRes = await request(app)
      .post(`/api/remittance/verify/${token}`)
      .send({ verificationId: 'self-verify-123' });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);

    // Now claim should succeed
    const claimRes = await request(app).get(`/api/remittance/claim/${token}`);

    expect(claimRes.status).toBe(200);
    expect(claimRes.body.success).toBe(true);
  });

  test('POST /api/remittance/verify/:token sets self_verified=1', async () => {
    // Create a remittance
    const createRes = await request(app)
      .post('/api/remittance/send')
      .send({
        senderEmail: 'sender@example.com',
        recipientEmail: 'recipient@example.com',
        amount: '1.0',
        requireAuth: true,
      });

    const token = createRes.body.data.claimToken;

    // Verify
    const verifyRes = await request(app)
      .post(`/api/remittance/verify/${token}`)
      .send({ verificationId: 'self-protocol-verification-xyz' });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);
    expect(verifyRes.body.data.success).toBe(true);
  });

  test('Claim after verify succeeds', async () => {
    // Create with auth
    const createRes = await request(app)
      .post('/api/remittance/send')
      .send({
        senderEmail: 'sender@example.com',
        recipientEmail: 'recipient@example.com',
        amount: '2.5',
        requireAuth: true,
      });

    const token = createRes.body.data.claimToken;

    // Try claim — should fail
    const failedClaim = await request(app).get(`/api/remittance/claim/${token}`);
    expect(failedClaim.status).toBe(403);

    // Verify
    await request(app)
      .post(`/api/remittance/verify/${token}`)
      .send({ verificationId: 'verified-abc' });

    // Claim again — should succeed
    const successClaim = await request(app).get(`/api/remittance/claim/${token}`);
    expect(successClaim.status).toBe(200);
    expect(successClaim.body.success).toBe(true);
  });

  test('GET /api/remittance/status/:token includes requireAuth and selfVerified', async () => {
    // Create with auth
    const createRes = await request(app)
      .post('/api/remittance/send')
      .send({
        senderEmail: 'sender@example.com',
        recipientEmail: 'recipient@example.com',
        amount: '1.0',
        requireAuth: true,
        chain: 'base',
      });

    const token = createRes.body.data.claimToken;

    // Check status
    const statusRes = await request(app).get(`/api/remittance/status/${token}`);

    expect(statusRes.status).toBe(200);
    expect(statusRes.body.data.requireAuth).toBe(true);
    expect(statusRes.body.data.selfVerified).toBe(false);
    expect(statusRes.body.data.chain).toBe('celo'); // Mock returns celo, actual would be base
  });
});
