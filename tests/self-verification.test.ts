/**
 * Self Protocol Verification Tests
 *
 * Covers:
 * - /api/verifications/callback (claim — minimumAge:18)
 * - /api/verifications/sender-callback (send — name + dob + nationality + OFAC)
 * - V2 API shape validation
 * - Missing required fields
 * - Document type mapping (attestationId → string)
 * - Scope separation between claim and sender verifiers
 * - Demo/staging fallback
 */

import request from 'supertest';
import express from 'express';
import { verificationRoutes } from '../src/controllers/verificationController';
import { errorHandler } from '../src/middleware/errorHandler';

// ─── Mock @selfxyz/core ────────────────────────────────────────────────────────
// Applied globally — covers both selfVerification.service and selfSenderVerification.service

jest.mock('@selfxyz/core', () => ({
  SelfBackendVerifier: jest.fn().mockImplementation(() => ({
    verify: jest.fn().mockResolvedValue({
      isValidDetails: { isValid: true, isOlderThanValid: true, isOfacValid: true },
      discloseOutput: {
        nationality: 'USA',
        name: ['JOHN', 'DOE'],
        dateOfBirth: '01-01-1990',
      },
      nullifier: '0xabc123',
    }),
  })),
  AllIds: { 1: true, 2: true, 3: true, 4: true },
  DefaultConfigStore: jest.fn().mockImplementation((config: any) => ({ config })),
}));

// ─── Test app ─────────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());
app.use('/api/verifications', verificationRoutes);
app.use(errorHandler);

const VALID_PROOF_BODY = {
  attestationId: 1,
  proof: { pi_a: ['1', '2'], pi_b: [['3', '4'], ['5', '6']], pi_c: ['7', '8'] },
  pubSignals: Array(20).fill('0'),
  userContextData: '0xdeadbeef1234567890abcdef',
};

// ─── Claim callback ───────────────────────────────────────────────────────────

describe('POST /api/verifications/callback (claim — age 18+)', () => {
  it('returns success:true with valid proof', async () => {
    const res = await request(app)
      .post('/api/verifications/callback')
      .send(VALID_PROOF_BODY);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.result).toBe(true);
  });

  it('returns documentType=passport for attestationId=1', async () => {
    const res = await request(app)
      .post('/api/verifications/callback')
      .send({ ...VALID_PROOF_BODY, attestationId: 1 });

    expect(res.body.documentType).toBe('passport');
  });

  it('returns documentType=eu_id_card for attestationId=2', async () => {
    const res = await request(app)
      .post('/api/verifications/callback')
      .send({ ...VALID_PROOF_BODY, attestationId: 2 });

    expect(res.body.documentType).toBe('eu_id_card');
  });

  it('returns documentType=aadhaar for attestationId=3', async () => {
    const res = await request(app)
      .post('/api/verifications/callback')
      .send({ ...VALID_PROOF_BODY, attestationId: 3 });

    expect(res.body.documentType).toBe('aadhaar');
  });

  it('returns documentType=kyc for unknown attestationId', async () => {
    const res = await request(app)
      .post('/api/verifications/callback')
      .send({ ...VALID_PROOF_BODY, attestationId: 99 });

    expect(res.body.documentType).toBe('kyc');
  });

  it('response includes timestamp', async () => {
    const res = await request(app)
      .post('/api/verifications/callback')
      .send(VALID_PROOF_BODY);

    expect(res.body).toHaveProperty('timestamp');
  });

  it('rejects when proof missing', async () => {
    const res = await request(app)
      .post('/api/verifications/callback')
      .send({ attestationId: 1, pubSignals: [], userContextData: '0x1234' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
  });

  it('rejects when pubSignals missing', async () => {
    const res = await request(app)
      .post('/api/verifications/callback')
      .send({ attestationId: 1, proof: {}, userContextData: '0x1234' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
  });

  it('rejects when attestationId missing', async () => {
    const res = await request(app)
      .post('/api/verifications/callback')
      .send({ proof: {}, pubSignals: [], userContextData: '0x1234' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
  });

  it('rejects when userContextData missing', async () => {
    const res = await request(app)
      .post('/api/verifications/callback')
      .send({ attestationId: 1, proof: {}, pubSignals: [] });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
  });

  it('rejects empty body', async () => {
    const res = await request(app)
      .post('/api/verifications/callback')
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
  });

  it('missing-fields error message mentions required', async () => {
    const res = await request(app)
      .post('/api/verifications/callback')
      .send({});

    expect(res.body.message || res.body.error?.message || '').toMatch(/required/i);
  });
});

// ─── Sender callback ────────────────────────────────────────────────────���─────

describe('POST /api/verifications/sender-callback (send — name + dob + nationality + OFAC)', () => {
  it('returns success:true with valid proof', async () => {
    const res = await request(app)
      .post('/api/verifications/sender-callback')
      .send(VALID_PROOF_BODY);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.result).toBe(true);
  });

  it('credentialSubject contains nationality', async () => {
    const res = await request(app)
      .post('/api/verifications/sender-callback')
      .send(VALID_PROOF_BODY);

    expect(res.body.credentialSubject?.nationality).toBe('USA');
  });

  it('credentialSubject contains name', async () => {
    const res = await request(app)
      .post('/api/verifications/sender-callback')
      .send(VALID_PROOF_BODY);

    expect(res.body.credentialSubject?.name).toEqual(['JOHN', 'DOE']);
  });

  it('returns documentType=passport for attestationId=1', async () => {
    const res = await request(app)
      .post('/api/verifications/sender-callback')
      .send({ ...VALID_PROOF_BODY, attestationId: 1 });

    expect(res.body.documentType).toBe('passport');
  });

  it('rejects when proof missing', async () => {
    const res = await request(app)
      .post('/api/verifications/sender-callback')
      .send({ attestationId: 1, pubSignals: [], userContextData: '0x1234' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
  });

  it('rejects when userContextData missing', async () => {
    const res = await request(app)
      .post('/api/verifications/sender-callback')
      .send({ attestationId: 1, proof: {}, pubSignals: [] });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
  });

  it('rejects empty body', async () => {
    const res = await request(app)
      .post('/api/verifications/sender-callback')
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
  });

  it('response includes timestamp', async () => {
    const res = await request(app)
      .post('/api/verifications/sender-callback')
      .send(VALID_PROOF_BODY);

    expect(res.body).toHaveProperty('timestamp');
  });
});

// ─── Scope separation ─────────────────────────────────────────────────────────

describe('Self Protocol scope separation', () => {
  it('claim scope is email-remittance-pro', () => {
    // Reset module cache to get fresh instances
    const { selfVerificationService } = require('../src/services/selfVerification.service');
    expect(selfVerificationService.getStatus().scope).toBe('email-remittance-pro');
  });

  it('sender scope is email-remittance-sender', () => {
    const { senderVerificationService } = require('../src/services/selfSenderVerification.service');
    expect(senderVerificationService.getStatus().scope).toBe('email-remittance-sender');
  });

  it('claim and sender scopes are different', () => {
    const { selfVerificationService } = require('../src/services/selfVerification.service');
    const { senderVerificationService } = require('../src/services/selfSenderVerification.service');
    expect(selfVerificationService.getStatus().scope).not.toBe(
      senderVerificationService.getStatus().scope
    );
  });

  it('claim disclosures contain minimumAge:18', () => {
    const { selfVerificationService } = require('../src/services/selfVerification.service');
    const cfg = selfVerificationService.getFrontendConfig('0xtest');
    expect(cfg.disclosures.minimumAge).toBe(18);
  });

  it('sender disclosures contain name, nationality, date_of_birth, ofac', () => {
    const { senderVerificationService } = require('../src/services/selfSenderVerification.service');
    const status = senderVerificationService.getStatus();
    expect(status.disclosures).toContain('name');
    expect(status.disclosures).toContain('nationality');
    expect(status.disclosures).toContain('date_of_birth');
    expect(status.disclosures).toContain('ofac');
  });

  it('claim disclosures do NOT contain name or date_of_birth', () => {
    const { selfVerificationService } = require('../src/services/selfVerification.service');
    const cfg = selfVerificationService.getFrontendConfig('0xtest');
    expect(cfg.disclosures.name).toBeUndefined();
    expect(cfg.disclosures.date_of_birth).toBeUndefined();
  });
});

// ─── Service unit tests ───────────────────────────────────────────────────────

describe('SelfVerificationService unit', () => {
  it('getStatus returns configured, mode, scope, endpoint', () => {
    const { selfVerificationService } = require('../src/services/selfVerification.service');
    const status = selfVerificationService.getStatus();
    expect(status).toHaveProperty('configured');
    expect(status).toHaveProperty('mode');
    expect(status).toHaveProperty('scope');
    expect(status).toHaveProperty('endpoint');
  });

  it('getFrontendConfig includes version:2', () => {
    const { selfVerificationService } = require('../src/services/selfVerification.service');
    const cfg = selfVerificationService.getFrontendConfig('abc123');
    expect(cfg.version).toBe(2);
  });

  it('getFrontendConfig uses provided userId', () => {
    const { selfVerificationService } = require('../src/services/selfVerification.service');
    const cfg = selfVerificationService.getFrontendConfig('my-user-id');
    expect(cfg.userId).toBe('my-user-id');
  });

  it('verifyProof returns structured result', async () => {
    const { selfVerificationService } = require('../src/services/selfVerification.service');
    const result = await selfVerificationService.verifyProof(1, {}, [], '0x1234');
    expect(result).toHaveProperty('verified');
    expect(typeof result.verified).toBe('boolean');
  });
});

describe('SelfSenderVerificationService unit', () => {
  it('getStatus returns correct scope and disclosures', () => {
    const { senderVerificationService } = require('../src/services/selfSenderVerification.service');
    const status = senderVerificationService.getStatus();
    expect(status.scope).toBe('email-remittance-sender');
    expect(Array.isArray(status.disclosures)).toBe(true);
  });

  it('verifyProof returns structured result', async () => {
    const { senderVerificationService } = require('../src/services/selfSenderVerification.service');
    const result = await senderVerificationService.verifyProof(1, {}, [], '0x1234');
    expect(result).toHaveProperty('verified');
    expect(typeof result.verified).toBe('boolean');
  });
});

// ─── V2 API contract ──────────────────────────────────────────────────────────

describe('Self Protocol V2 API response contract', () => {
  it('success response shape: { status, result, credentialSubject, documentType, timestamp }', async () => {
    const res = await request(app)
      .post('/api/verifications/callback')
      .send(VALID_PROOF_BODY);

    expect(res.body).toHaveProperty('status', 'success');
    expect(res.body).toHaveProperty('result', true);
    expect(res.body).toHaveProperty('credentialSubject');
    expect(res.body).toHaveProperty('documentType');
    expect(res.body).toHaveProperty('timestamp');
  });

  it('error response shape: { success:false, message, timestamp }', async () => {
    const res = await request(app)
      .post('/api/verifications/callback')
      .send({});

    expect(res.body.success).toBe(false);
    expect(res.body).toHaveProperty('message');
    expect(res.body).toHaveProperty('timestamp');
  });

  it('sender success response shape matches claim response shape', async () => {
    const claimRes = await request(app)
      .post('/api/verifications/callback')
      .send(VALID_PROOF_BODY);

    const senderRes = await request(app)
      .post('/api/verifications/sender-callback')
      .send(VALID_PROOF_BODY);

    // Both should have same top-level shape
    expect(Object.keys(claimRes.body).sort()).toEqual(Object.keys(senderRes.body).sort());
  });
});
