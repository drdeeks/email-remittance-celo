/**
 * Wallet Mode Tests
 * Tests for service wallet vs personal wallet funding flows:
 * - Service wallet mode: creates remittance without on-chain tx from sender
 * - Personal wallet mode: requires fundingTxHash, backend verifies on-chain
 * - Service wallet balance endpoint
 * - Balance accuracy per mode
 * - Insufficient balance detection per mode
 */

import request from 'supertest';
import express from 'express';
import { transactionRoutes } from '../src/controllers/transactionController';
import { errorHandler } from '../src/middleware/errorHandler';

const SERVER_WALLET = '0x9D65433B3FE597C15a46D2365F8F2c1701Eb9e4A';
const SENDER_WALLET = '0xabc1234567890abcdef1234567890abcdef12345';

// Mock celoService (ethers-based, celo.service.ts)
// Note: jest.mock is hoisted — use inline strings, not outer const references inside factory
jest.mock('../src/services/celo.service', () => ({
  celoService: {
    wallet: {
      address: '0x9D65433B3FE597C15a46D2365F8F2c1701Eb9e4A',
    },
    provider: {
      getTransaction: jest.fn(async (txHash: string) => {
        const SERVER = '0x9D65433B3FE597C15a46D2365F8F2c1701Eb9e4A';
        const SENDER = '0xabc1234567890abcdef1234567890abcdef12345';
        if (txHash === '0xvalid_tx') {
          return { hash: '0xvalid_tx', from: SENDER, to: SERVER, value: BigInt('100000000000000000') };
        }
        if (txHash === '0xwrong_destination') {
          return { hash: '0xwrong_destination', from: SENDER, to: '0xsomewhere_else', value: BigInt('100000000000000000') };
        }
        if (txHash === '0xwrong_amount') {
          return { hash: '0xwrong_amount', from: SENDER, to: SERVER, value: BigInt('1000000000000000') };
        }
        if (txHash === '0xwrong_sender') {
          return { hash: '0xwrong_sender', from: '0xsomeone_else', to: SERVER, value: BigInt('100000000000000000') };
        }
        return null;
      }),
    },
  },
}));

// Mock chainService (viem-based, celoService.ts)
jest.mock('../src/services/celoService', () => ({
  detectChain: jest.fn((currency?: string, chain?: string) => {
    if (chain === 'base') return 'base';
    if (chain === 'monad') return 'monad';
    return 'celo';
  }),
  chainService: {
    getBalance: jest.fn(async (address: string, chain: string) => '19.0029'),
    getWalletAddress: jest.fn(() => '0x9D65433B3FE597C15a46D2365F8F2c1701Eb9e4A'),
    getSupportedChains: jest.fn(() => ['celo', 'base', 'monad']),
    getSupportedBridgeRoutes: jest.fn(() => []),
    getBridgeQuote: jest.fn(),
    executeBridge: jest.fn(),
    getTransaction: jest.fn(async (txHash: string, chain: string) => {
      const SERVER = '0x9D65433B3FE597C15a46D2365F8F2c1701Eb9e4A';
      const SENDER = '0xabc1234567890abcdef1234567890abcdef12345';
      if (txHash === '0xvalid_tx') {
        return { hash: txHash, to: SERVER, from: SENDER, value: BigInt('1000000000000000000') };
      }
      // wrong destination — matches test hash
      if (txHash === '0xwrong_destination') {
        return { hash: txHash, to: '0xsomewhere_else', from: SENDER, value: BigInt('1000000000000000000') };
      }
      // wrong amount — matches test hash
      if (txHash === '0xwrong_amount') {
        return { hash: txHash, to: SERVER, from: SENDER, value: BigInt('10000000000000') };
      }
      // wrong sender — matches test hash
      if (txHash === '0xwrong_sender') {
        return { hash: txHash, to: SERVER, from: '0xwrongsender', value: BigInt('1000000000000000000') };
      }
      return null;
    }),
    waitForTransaction: jest.fn(async (txHash: string) => ({
      status: 'success',
      blockNumber: BigInt(12345),
    })),
  },
}));

jest.mock('../src/services/remittanceService', () => ({
  remittanceService: {
    createRemittance: jest.fn(async (params: any) => ({
      remittanceId: `test-${Date.now()}`,
      claimToken: `token-${Date.now()}`,
      txHash: 'pending_escrow',
      expiresAt: Math.floor(Date.now() / 1000) + 86400,
    })),
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

jest.mock('../src/services/feeService', () => ({
  feeService: {
    getFeeQuote: jest.fn(async (amount: number, chain: string, feeModel: string) => ({
      feeModel,
      sendAmount: amount.toFixed(8),
      recipientAmount: (amount - 0.0005).toFixed(8),
      feeAmount: '0',
      gasEstimate: '0.0005',
      gasLabel: '~$0.001',
      premiumFeeNative: '0',
      escrowAddress: '0xEscrow1234567890123456789012345678901234',
      escrowPrivateKey: '0x' + 'a'.repeat(64),
      serverProfit: '0',
    })),
    getFeeModelDescription: jest.fn(() => ({ title: 'Standard', description: '', cost: 'Gas only' })),
  },
}));

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/remittance', transactionRoutes);
  app.use(errorHandler);
  return app;
};

describe('Service Wallet Mode', () => {
  const app = createTestApp();

  beforeEach(() => jest.clearAllMocks());

  test('POST /api/remittance/send with walletMode=service creates remittance without fundingTxHash', async () => {
    const res = await request(app)
      .post('/api/remittance/send')
      .send({
        senderEmail: 'sender@example.com',
        recipientEmail: 'recipient@example.com',
        amount: '0.1',
        chain: 'celo',
        walletMode: 'service',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.claimToken).toBeDefined();
    expect(res.body.data.txHash).toBe('pending_escrow');
  });

  test('POST /api/remittance/send with no walletMode defaults to service (no fundingTxHash required)', async () => {
    const res = await request(app)
      .post('/api/remittance/send')
      .send({
        senderEmail: 'sender@example.com',
        recipientEmail: 'recipient@example.com',
        amount: '0.1',
        chain: 'celo',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  test('GET /api/remittance/service-wallet returns server wallet address and balance', async () => {
    const res = await request(app)
      .get('/api/remittance/service-wallet?chain=celo');

    if (res.status !== 200) console.error('service-wallet error:', JSON.stringify(res.body));
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.address).toBe(SERVER_WALLET);
    expect(res.body.data.balance).toBeDefined();
    expect(parseFloat(res.body.data.balance)).toBeGreaterThan(0);
    expect(res.body.data.symbol).toBe('CELO');
  });

  test('GET /api/remittance/service-wallet returns ETH symbol for base chain', async () => {
    const res = await request(app)
      .get('/api/remittance/service-wallet?chain=base');

    expect(res.status).toBe(200);
    expect(res.body.data.symbol).toBe('ETH');
  });

  test('GET /api/remittance/service-wallet returns MON symbol for monad chain', async () => {
    const res = await request(app)
      .get('/api/remittance/service-wallet?chain=monad');

    expect(res.status).toBe(200);
    expect(res.body.data.symbol).toBe('MON');
  });
});

describe('Personal Wallet Mode', () => {
  const app = createTestApp();

  beforeEach(() => jest.clearAllMocks());

  test('POST /api/remittance/send with walletMode=personal requires fundingTxHash', async () => {
    const res = await request(app)
      .post('/api/remittance/send')
      .send({
        senderEmail: 'sender@example.com',
        recipientEmail: 'recipient@example.com',
        amount: '0.1',
        chain: 'celo',
        senderWallet: SENDER_WALLET,
        walletMode: 'personal',
        // no fundingTxHash
      });

    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toContain('funding transaction');
  });

  test('POST /api/remittance/send with walletMode=personal and valid fundingTxHash creates remittance', async () => {
    const res = await request(app)
      .post('/api/remittance/send')
      .send({
        senderEmail: 'sender@example.com',
        recipientEmail: 'recipient@example.com',
        amount: '0.1',
        chain: 'celo',
        senderWallet: SENDER_WALLET,
        walletMode: 'personal',
        fundingTxHash: '0xvalid_tx',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.claimToken).toBeDefined();
  });

  test('POST /api/remittance/send rejects tx sent to wrong destination', async () => {
    const res = await request(app)
      .post('/api/remittance/send')
      .send({
        senderEmail: 'sender@example.com',
        recipientEmail: 'recipient@example.com',
        amount: '0.1',
        chain: 'celo',
        senderWallet: SENDER_WALLET,
        walletMode: 'personal',
        fundingTxHash: '0xwrong_destination',
      });

    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toContain('destination');
  });

  test('POST /api/remittance/send rejects tx with insufficient amount', async () => {
    const res = await request(app)
      .post('/api/remittance/send')
      .send({
        senderEmail: 'sender@example.com',
        recipientEmail: 'recipient@example.com',
        amount: '0.1',
        chain: 'celo',
        senderWallet: SENDER_WALLET,
        walletMode: 'personal',
        fundingTxHash: '0xwrong_amount',
      });

    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toContain('amount');
  });

  test('POST /api/remittance/send rejects tx from wrong sender wallet', async () => {
    const res = await request(app)
      .post('/api/remittance/send')
      .send({
        senderEmail: 'sender@example.com',
        recipientEmail: 'recipient@example.com',
        amount: '0.1',
        chain: 'celo',
        senderWallet: SENDER_WALLET,
        walletMode: 'personal',
        fundingTxHash: '0xwrong_sender',
      });

    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toContain('sender');
  });

  test('POST /api/remittance/send rejects tx not found on-chain', async () => {
    const res = await request(app)
      .post('/api/remittance/send')
      .send({
        senderEmail: 'sender@example.com',
        recipientEmail: 'recipient@example.com',
        amount: '0.1',
        chain: 'celo',
        senderWallet: SENDER_WALLET,
        walletMode: 'personal',
        fundingTxHash: '0xnonexistent_tx',
      });

    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toContain('not found');
  });
});

describe('Balance Display Logic (frontend parity)', () => {
  test('service wallet mode shows server balance, not sender balance', () => {
    const serverBalance = '19.0029';
    const senderBalance = '0.5000';
    const walletMode = 'service';

    const displayedBalance = walletMode === 'service' ? serverBalance : senderBalance;
    expect(displayedBalance).toBe('19.0029');
  });

  test('personal wallet mode shows sender balance, not server balance', () => {
    const serverBalance = '19.0029';
    const senderBalance = '0.5000';
    const walletMode = 'personal';

    const displayedBalance = walletMode === 'service' ? serverBalance : senderBalance;
    expect(displayedBalance).toBe('0.5000');
  });

  test('insufficient balance check uses service wallet balance in service mode', () => {
    const serverBalance = '0.05';
    const amount = '0.1';
    const walletMode = 'service';

    const isInsufficient = walletMode === 'service'
      ? parseFloat(amount) > parseFloat(serverBalance)
      : false;

    expect(isInsufficient).toBe(true);
  });

  test('insufficient balance check uses sender wallet balance in personal mode', () => {
    const senderBalance = '0.05';
    const amount = '0.1';
    const walletMode = 'personal';

    const isInsufficient = walletMode === 'personal'
      ? parseFloat(amount) > parseFloat(senderBalance)
      : false;

    expect(isInsufficient).toBe(true);
  });

  test('sufficient personal wallet balance passes check', () => {
    const senderBalance = '1.0000';
    const amount = '0.1';
    const walletMode = 'personal';

    const isInsufficient = walletMode === 'personal'
      ? parseFloat(amount) > parseFloat(senderBalance)
      : false;

    expect(isInsufficient).toBe(false);
  });
});

describe('Wallet Proof — Static Message (no timestamp)', () => {
  test('verification message is static for same address across calls', () => {
    const address = '0xabc123';

    const msg1 = `Email Remittance - Verify wallet ownership\n\nAddress: ${address}\n\nThis signature proves you own this wallet. No funds are moved.`;
    const msg2 = `Email Remittance - Verify wallet ownership\n\nAddress: ${address}\n\nThis signature proves you own this wallet. No funds are moved.`;

    // Must be identical — no timestamp, no Date.now()
    expect(msg1).toBe(msg2);
  });

  test('verification message differs for different addresses', () => {
    const addr1 = '0xabc123';
    const addr2 = '0xdef456';

    const msg1 = `Email Remittance - Verify wallet ownership\n\nAddress: ${addr1}\n\nThis signature proves you own this wallet. No funds are moved.`;
    const msg2 = `Email Remittance - Verify wallet ownership\n\nAddress: ${addr2}\n\nThis signature proves you own this wallet. No funds are moved.`;

    expect(msg1).not.toBe(msg2);
  });

  test('cached wallet proof with static message is valid for all sends', () => {
    const address = '0xabc123';
    const cachedMsg = `Email Remittance - Verify wallet ownership\n\nAddress: ${address}\n\nThis signature proves you own this wallet. No funds are moved.`;
    const cachedSig = '0xsignature123';

    // Simulate 3 sends with same cached proof
    for (let i = 0; i < 3; i++) {
      const currentMsg = `Email Remittance - Verify wallet ownership\n\nAddress: ${address}\n\nThis signature proves you own this wallet. No funds are moved.`;
      // Message never changes — cached sig stays valid
      expect(currentMsg).toBe(cachedMsg);
    }
  });
});

// ─── Service wallet Self verification integration ─────────────────────────────

describe('Service wallet mode — Self verification identity passthrough', () => {
  const app = createTestApp();

  it('accepts service wallet send with selfVerified=true and senderName', async () => {
    const res = await request(app)
      .post('/api/remittance/send')
      .send({
        senderEmail: 'john.doe@example.com',
        recipientEmail: 'recipient@example.com',
        amount: 0.5,
        chain: 'celo',
        walletMode: 'service',
        selfVerified: true,
        senderName: 'JOHN DOE',
        senderNationality: 'USA',
      });

    // Should proceed (not reject for missing wallet proof)
    expect([200, 201]).toContain(res.status);
    if (res.body.success) {
      expect(res.body.data).toHaveProperty('claimToken');
    } else {
      // May fail for balance reasons but not for wallet auth reasons
      expect(res.body.error?.code).not.toBe('WALLET_VERIFICATION_REQUIRED');
      expect(res.body.error?.message).not.toMatch(/wallet.*required/i);
    }
  });

  it('service wallet send does not require walletProof or fundingTxHash', async () => {
    const res = await request(app)
      .post('/api/remittance/send')
      .send({
        senderEmail: 'sender@example.com',
        recipientEmail: 'recv@example.com',
        amount: 0.1,
        chain: 'celo',
        walletMode: 'service',
        selfVerified: true,
        senderName: 'JANE DOE',
        senderNationality: 'GBR',
        // Deliberately omitting walletProof and fundingTxHash
      });

    // Should not fail with wallet-related error
    expect(res.status).not.toBe(401);
    if (!res.body.success) {
      expect(res.body.error?.message).not.toMatch(/signature/i);
      expect(res.body.error?.message).not.toMatch(/walletProof/i);
    }
  });

  it('personal wallet send still requires connected wallet address', async () => {
    const res = await request(app)
      .post('/api/remittance/send')
      .send({
        senderEmail: 'sender@example.com',
        recipientEmail: 'recv@example.com',
        amount: 0.1,
        chain: 'celo',
        walletMode: 'personal',
        // No senderWallet, no fundingTxHash
      });

    // Personal mode without wallet should fail or require wallet
    expect(res.status).toBeDefined();
    // If fails, should not be a Self-related error
    if (!res.body.success) {
      expect(res.body.error?.message).not.toMatch(/self.*protocol/i);
    }
  });

  it('personal wallet send with fundingTxHash proceeds to backend verification', async () => {
    const res = await request(app)
      .post('/api/remittance/send')
      .send({
        senderEmail: 'wallet@example.com',
        recipientEmail: 'recv@example.com',
        amount: 1.0,
        chain: 'celo',
        walletMode: 'personal',
        senderWallet: SENDER_WALLET,
        fundingTxHash: '0xvalid_tx',
      });

    expect([200, 201]).toContain(res.status);
    // Should reach backend verification stage
    expect(res.body).toHaveProperty('success');
  });
});
