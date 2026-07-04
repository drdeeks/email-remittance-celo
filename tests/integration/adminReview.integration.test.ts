/**
 * Integration tests for Admin Review API Routes
 *
 * Tests the complete admin review workflow through API endpoints.
 */

import request from 'supertest';
import express from 'express';
import Database from 'better-sqlite3';
import { adminReviewRoutes } from '../../src/controllers/adminReviewController';

// Mock the database
jest.mock('../../src/db/database', () => {
  const db = new Database(':memory:');
  return { db };
});

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock email notifier
jest.mock('../../src/services/emailNotifier', () => ({
  emailNotifier: {
    sendClaimEmail: jest.fn().mockResolvedValue(true),
  },
}));

describe('Admin Review API Routes - Integration Tests', () => {
  let app: express.Application;
  let db: Database.Database;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/admin', adminReviewRoutes);

    // Get the mocked database
    db = require('../../src/db/database').db;

    // Create tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS managers (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'manager')),
        wallet_address TEXT,
        self_verification_id TEXT,
        self_verified INTEGER DEFAULT 0,
        wallet_signature TEXT,
        wallet_signature_verified INTEGER DEFAULT 0,
        invited_by TEXT,
        approved_by TEXT,
        approved_at INTEGER,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'revoked')),
        created_at INTEGER DEFAULT (unixepoch()),
        updated_at INTEGER DEFAULT (unixepoch())
      );
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS review_queue (
        id TEXT PRIMARY KEY,
        remittance_id TEXT NOT NULL,
        submitted_by TEXT NOT NULL,
        reviewed_by TEXT,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
        submitted_at INTEGER DEFAULT (unixepoch()),
        reviewed_at INTEGER,
        review_notes TEXT,
        created_at INTEGER DEFAULT (unixepoch()),
        updated_at INTEGER DEFAULT (unixepoch())
      );
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS remittances (
        id TEXT PRIMARY KEY,
        claim_token TEXT UNIQUE NOT NULL,
        sender_email TEXT NOT NULL,
        recipient_email TEXT NOT NULL,
        amount_celo TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        chain TEXT DEFAULT 'celo',
        review_status TEXT DEFAULT 'none',
        submitted_by TEXT,
        reviewed_by TEXT,
        reviewed_at INTEGER,
        created_at INTEGER DEFAULT (unixepoch()),
        updated_at INTEGER DEFAULT (unixepoch()),
        expires_at INTEGER NOT NULL
      );
    `);

    // Create an owner for testing
    db.prepare(`
      INSERT INTO managers (id, email, role, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('owner-id', 'owner@example.com', 'owner', 'active', Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000));
  });

  beforeEach(() => {
    db.prepare('DELETE FROM managers WHERE id != ?').run('owner-id');
    db.prepare('DELETE FROM review_queue').run();
    db.prepare('DELETE FROM remittances').run();
  });

  describe('POST /api/admin/managers/invite', () => {
    it('should invite a new manager', async () => {
      const response = await request(app)
        .post('/api/admin/managers/invite')
        .send({
          email: 'manager@example.com',
          role: 'manager',
          invitedBy: 'owner-id',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.manager).toBeDefined();
      expect(response.body.manager.email).toBe('manager@example.com');
      expect(response.body.manager.status).toBe('pending');
    });

    it('should reject invite without required fields', async () => {
      const response = await request(app)
        .post('/api/admin/managers/invite')
        .send({
          email: 'manager@example.com',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Missing required fields');
    });

    it('should reject invite from non-owner/admin', async () => {
      // Create a regular manager
      const inviteResponse = await request(app)
        .post('/api/admin/managers/invite')
        .send({
          email: 'pending@example.com',
          role: 'manager',
          invitedBy: 'owner-id',
        });

      const managerId = inviteResponse.body.manager.id;

      // Approve the manager
      await request(app)
        .post('/api/admin/managers/approve')
        .send({
          managerId,
          selfVerificationId: 'self-123',
          walletSignature: 'sig-456',
          approvedBy: 'owner-id',
        });

      // Try to invite from this manager (should fail)
      const response = await request(app)
        .post('/api/admin/managers/invite')
        .send({
          email: 'new-manager@example.com',
          role: 'manager',
          invitedBy: managerId,
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/admin/managers/approve', () => {
    it('should approve a pending manager', async () => {
      // First invite a manager
      const inviteResponse = await request(app)
        .post('/api/admin/managers/invite')
        .send({
          email: 'manager@example.com',
          role: 'manager',
          invitedBy: 'owner-id',
        });

      const managerId = inviteResponse.body.manager.id;

      // Then approve
      const response = await request(app)
        .post('/api/admin/managers/approve')
        .send({
          managerId,
          selfVerificationId: 'self-verification-123',
          walletSignature: 'wallet-signature-456',
          approvedBy: 'owner-id',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.manager.status).toBe('active');
      expect(response.body.manager.self_verified).toBe(1);
      expect(response.body.manager.wallet_signature_verified).toBe(1);
    });

    it('should reject approval without dual identity', async () => {
      const inviteResponse = await request(app)
        .post('/api/admin/managers/invite')
        .send({
          email: 'manager@example.com',
          role: 'manager',
          invitedBy: 'owner-id',
        });

      const response = await request(app)
        .post('/api/admin/managers/approve')
        .send({
          managerId: inviteResponse.body.manager.id,
          selfVerificationId: 'self-123',
          // Missing walletSignature
          approvedBy: 'owner-id',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/admin/managers', () => {
    it('should list active managers', async () => {
      // Invite and approve a manager
      const inviteResponse = await request(app)
        .post('/api/admin/managers/invite')
        .send({
          email: 'manager@example.com',
          role: 'manager',
          invitedBy: 'owner-id',
        });

      await request(app)
        .post('/api/admin/managers/approve')
        .send({
          managerId: inviteResponse.body.manager.id,
          selfVerificationId: 'self-123',
          walletSignature: 'sig-456',
          approvedBy: 'owner-id',
        });

      const response = await request(app)
        .get('/api/admin/managers')
        .expect(200);

      expect(response.body.success).toBe(true);
      // Owner + newly created manager
      expect(response.body.managers).toHaveLength(2);
      expect(response.body.managers.find((m: any) => m.email === 'manager@example.com')).toBeDefined();
    });
  });

  describe('POST /api/admin/review/submit', () => {
    it('should submit a remittance for review', async () => {
      // Create a test remittance
      db.prepare(`
        INSERT INTO remittances (id, claim_token, sender_email, recipient_email, amount_celo, status, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('remittance-1', 'token-1', 'sender@example.com', 'recipient@example.com', '1.0', 'pending', Math.floor(Date.now() / 1000) + 604800);

      // Create and approve a manager
      const inviteResponse = await request(app)
        .post('/api/admin/managers/invite')
        .send({
          email: 'manager@example.com',
          role: 'manager',
          invitedBy: 'owner-id',
        });

      await request(app)
        .post('/api/admin/managers/approve')
        .send({
          managerId: inviteResponse.body.manager.id,
          selfVerificationId: 'self-123',
          walletSignature: 'sig-456',
          approvedBy: 'owner-id',
        });

      const managerId = inviteResponse.body.manager.id;

      // Submit for review
      const response = await request(app)
        .post('/api/admin/review/submit')
        .send({
          remittanceId: 'remittance-1',
          submittedBy: managerId,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.reviewItem).toBeDefined();
      expect(response.body.reviewItem.status).toBe('pending');
    });

    it('should reject submission from inactive manager', async () => {
      // Create a test remittance
      db.prepare(`
        INSERT INTO remittances (id, claim_token, sender_email, recipient_email, amount_celo, status, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('remittance-1', 'token-1', 'sender@example.com', 'recipient@example.com', '1.0', 'pending', Math.floor(Date.now() / 1000) + 604800);

      const response = await request(app)
        .post('/api/admin/review/submit')
        .send({
          remittanceId: 'remittance-1',
          submittedBy: 'non-existent-manager',
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/admin/review/action', () => {
    it('should approve a pending review', async () => {
      // Create a test remittance
      db.prepare(`
        INSERT INTO remittances (id, claim_token, sender_email, recipient_email, amount_celo, status, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('remittance-1', 'token-1', 'sender@example.com', 'recipient@example.com', '1.0', 'pending', Math.floor(Date.now() / 1000) + 604800);

      // Create and approve a manager
      const inviteResponse = await request(app)
        .post('/api/admin/managers/invite')
        .send({
          email: 'manager@example.com',
          role: 'manager',
          invitedBy: 'owner-id',
        });

      await request(app)
        .post('/api/admin/managers/approve')
        .send({
          managerId: inviteResponse.body.manager.id,
          selfVerificationId: 'self-123',
          walletSignature: 'sig-456',
          approvedBy: 'owner-id',
        });

      const managerId = inviteResponse.body.manager.id;

      // Submit for review
      await request(app)
        .post('/api/admin/review/submit')
        .send({
          remittanceId: 'remittance-1',
          submittedBy: managerId,
        });

      // Approve the review
      const response = await request(app)
        .post('/api/admin/review/action')
        .send({
          remittanceId: 'remittance-1',
          reviewerId: managerId,
          action: 'approve',
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify remittance was approved
      const remittance = db.prepare('SELECT * FROM remittances WHERE id = ?').get('remittance-1') as any;
      expect(remittance.review_status).toBe('approved');
    });

    it('should reject a pending review', async () => {
      // Create a test remittance
      db.prepare(`
        INSERT INTO remittances (id, claim_token, sender_email, recipient_email, amount_celo, status, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('remittance-1', 'token-1', 'sender@example.com', 'recipient@example.com', '1.0', 'pending', Math.floor(Date.now() / 1000) + 604800);

      // Create and approve a manager
      const inviteResponse = await request(app)
        .post('/api/admin/managers/invite')
        .send({
          email: 'manager@example.com',
          role: 'manager',
          invitedBy: 'owner-id',
        });

      await request(app)
        .post('/api/admin/managers/approve')
        .send({
          managerId: inviteResponse.body.manager.id,
          selfVerificationId: 'self-123',
          walletSignature: 'sig-456',
          approvedBy: 'owner-id',
        });

      const managerId = inviteResponse.body.manager.id;

      // Submit for review
      await request(app)
        .post('/api/admin/review/submit')
        .send({
          remittanceId: 'remittance-1',
          submittedBy: managerId,
        });

      // Reject the review
      const response = await request(app)
        .post('/api/admin/review/action')
        .send({
          remittanceId: 'remittance-1',
          reviewerId: managerId,
          action: 'reject',
          notes: 'Not approved',
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify remittance was rejected and cancelled
      const remittance = db.prepare('SELECT * FROM remittances WHERE id = ?').get('remittance-1') as any;
      expect(remittance.review_status).toBe('rejected');
      expect(remittance.status).toBe('cancelled');
    });
  });

  describe('GET /api/admin/review/pending', () => {
    it('should list pending reviews', async () => {
      // Create a test remittance
      db.prepare(`
        INSERT INTO remittances (id, claim_token, sender_email, recipient_email, amount_celo, status, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('remittance-1', 'token-1', 'sender@example.com', 'recipient@example.com', '1.0', 'pending', Math.floor(Date.now() / 1000) + 604800);

      // Create and approve a manager
      const inviteResponse = await request(app)
        .post('/api/admin/managers/invite')
        .send({
          email: 'manager@example.com',
          role: 'manager',
          invitedBy: 'owner-id',
        });

      await request(app)
        .post('/api/admin/managers/approve')
        .send({
          managerId: inviteResponse.body.manager.id,
          selfVerificationId: 'self-123',
          walletSignature: 'sig-456',
          approvedBy: 'owner-id',
        });

      const managerId = inviteResponse.body.manager.id;

      // Submit for review
      await request(app)
        .post('/api/admin/review/submit')
        .send({
          remittanceId: 'remittance-1',
          submittedBy: managerId,
        });

      // Get pending reviews
      const response = await request(app)
        .get('/api/admin/review/pending')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].sender_email).toBe('sender@example.com');
    });
  });
});
