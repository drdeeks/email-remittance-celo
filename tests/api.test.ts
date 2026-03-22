import request from 'supertest';
import express from 'express';

// Import the app components
import { healthRoutes } from '../src/controllers/healthController';
import { transactionRoutes } from '../src/controllers/transactionController';
import { verificationRoutes } from '../src/controllers/verificationController';
import { celoRoutes } from '../src/controllers/celoController';
import { emailRoutes } from '../src/controllers/emailController';
import { errorHandler } from '../src/middleware/errorHandler';

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/health', healthRoutes);
  app.use('/api/transactions', transactionRoutes);
  app.use('/api/verifications', verificationRoutes);
  app.use('/api/celo', celoRoutes);
  app.use('/api/emails', emailRoutes);
  app.use(errorHandler);
  return app;
};

describe('Health Endpoints', () => {
  const app = createTestApp();

  test('GET /health returns ok status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('email-native-remittance');
  });

  test('GET /health/ready returns ready status', async () => {
    const res = await request(app).get('/health/ready');
    expect(res.status).toBe(200);
    expect(res.body.ready).toBe(true);
  });

  test('GET /health/live returns live status', async () => {
    const res = await request(app).get('/health/live');
    expect(res.status).toBe(200);
    expect(res.body.live).toBe(true);
  });
});

describe('Transaction Endpoints', () => {
  const app = createTestApp();

  test('POST /api/transactions creates a transaction', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .send({
        senderEmail: 'sender@example.com',
        recipientEmail: 'recipient@example.com',
        amount: 100,
        currency: 'cUSD',
      });
    
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.senderEmail).toBe('sender@example.com');
    expect(res.body.data.recipientEmail).toBe('recipient@example.com');
    expect(res.body.data.amount).toBe(100);
    expect(res.body.data.status).toBe('pending');
  });

  test('POST /api/transactions validates email format', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .send({
        senderEmail: 'invalid-email',
        recipientEmail: 'recipient@example.com',
        amount: 100,
      });
    
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toContain('email');
  });

  test('POST /api/transactions validates amount > 0', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .send({
        senderEmail: 'sender@example.com',
        recipientEmail: 'recipient@example.com',
        amount: -10,
      });
    
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toContain('Amount');
  });

  test('GET /api/transactions/:id returns 404 for unknown transaction', async () => {
    const res = await request(app).get('/api/transactions/nonexistent-id');
    expect(res.status).toBe(404);
  });
});

describe('Verification Endpoints', () => {
  const app = createTestApp();

  test('POST /api/verifications creates a verification request', async () => {
    const res = await request(app)
      .post('/api/verifications')
      .send({
        email: 'user@example.com',
        transactionId: 'tx-123',
      });
    
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('user@example.com');
    expect(res.body.data.status).toBe('pending');
  });

  test('GET /api/verifications/attributes/supported returns supported attributes', async () => {
    const res = await request(app).get('/api/verifications/attributes/supported');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.attributes).toContain('email');
  });
});

describe('Celo Endpoints', () => {
  const app = createTestApp();

  test('GET /api/celo/network returns network info', async () => {
    const res = await request(app).get('/api/celo/network');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toContain('Celo');
    expect(res.body.data.stablecoin.symbol).toBe('cUSD');
  });

  test('GET /api/celo/balance/:address validates address format', async () => {
    const res = await request(app).get('/api/celo/balance/invalid');
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toContain('Invalid');
  });

  test('GET /api/celo/balance/:address returns balance for valid address', async () => {
    const validAddress = '0x' + '1'.repeat(40);
    const res = await request(app).get(`/api/celo/balance/${validAddress}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.address).toBe(validAddress);
  });

  test('POST /api/celo/wallet/generate creates a wallet', async () => {
    const res = await request(app).post('/api/celo/wallet/generate');
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });
});

describe('Email Endpoints', () => {
  const app = createTestApp();

  test('POST /api/emails/verify validates email format', async () => {
    const res = await request(app)
      .post('/api/emails/verify')
      .send({ email: 'user@example.com' });
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('user@example.com');
    expect(res.body.data.valid).toBe(true);
  });

  test('POST /api/emails/verify detects disposable emails', async () => {
    const res = await request(app)
      .post('/api/emails/verify')
      .send({ email: 'user@tempmail.com' });
    
    expect(res.status).toBe(200);
    expect(res.body.data.disposable).toBe(true);
  });

  test('POST /api/emails/send-claim sends claim email', async () => {
    const res = await request(app)
      .post('/api/emails/send-claim')
      .send({
        recipientEmail: 'recipient@example.com',
        transactionId: 'tx-123',
        amount: 100,
        currency: 'cUSD',
        senderEmail: 'sender@example.com',
      });
    
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.type).toBe('claim');
    expect(res.body.data.status).toBe('sent');
  });
});
