/**
 * Unit tests for Admin Review Service
 *
 * Tests manager CRUD operations and review queue management.
 * Uses in-memory SQLite database for isolation.
 */

import Database from 'better-sqlite3';
import { 
  inviteManager, 
  approveManager, 
  submitForReview, 
  reviewSubmission, 
  getPendingReviews, 
  getActiveManagers, 
  getManagerById, 
  suspendManager 
} from '../../src/services/adminReviewService';

// Mock the database module
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

describe('Admin Review Service - Unit Tests', () => {
  let db: Database.Database;

  beforeAll(() => {
    // Get the mocked database
    db = require('../../src/db/database').db;
    
    // Create managers table
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

    // Create review_queue table
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

    // Create remittances table
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
  });

  beforeEach(() => {
    // Clear tables before each test
    db.exec('DELETE FROM managers');
    db.exec('DELETE FROM review_queue');
    db.exec('DELETE FROM remittances');
  });

  describe('inviteManager', () => {
    it('should create a pending manager', () => {
      const result = inviteManager({
        email: 'manager@example.com',
        role: 'manager',
        invitedBy: 'owner-id',
      });

      expect(result.success).toBe(true);
      expect(result.manager).toBeDefined();
      expect(result.manager!.email).toBe('manager@example.com');
      expect(result.manager!.role).toBe('manager');
      expect(result.manager!.status).toBe('pending');
      expect(result.manager!.invitedBy).toBe('owner-id');
    });

    it('should reject duplicate email', () => {
      inviteManager({
        email: 'manager@example.com',
        role: 'manager',
        invitedBy: 'owner-id',
      });

      const result = inviteManager({
        email: 'manager@example.com',
        role: 'admin',
        invitedBy: 'owner-id',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });

    it('should lowercase email', () => {
      const result = inviteManager({
        email: 'MANAGER@EXAMPLE.COM',
        role: 'manager',
        invitedBy: 'owner-id',
      });

      expect(result.success).toBe(true);
      expect(result.manager!.email).toBe('manager@example.com');
    });
  });

  describe('approveManager', () => {
    it('should approve a pending manager with dual identity', () => {
      const invite = inviteManager({
        email: 'manager@example.com',
        role: 'manager',
        invitedBy: 'owner-id',
      });

      const result = approveManager({
        managerId: invite.manager!.id,
        selfVerificationId: 'self-verification-123',
        walletSignature: 'wallet-signature-456',
        approvedBy: 'owner-id',
      });

      expect(result.success).toBe(true);
      expect(result.manager!.status).toBe('active');
      expect(result.manager!.selfVerificationId).toBe('self-verification-123');
      expect(result.manager!.selfVerified).toBe(1);
      expect(result.manager!.walletSignature).toBe('wallet-signature-456');
      expect(result.manager!.walletSignatureVerified).toBe(1);
      expect(result.manager!.approvedBy).toBe('owner-id');
    });

    it('should reject approval of non-existent manager', () => {
      const result = approveManager({
        managerId: 'non-existent-id',
        selfVerificationId: 'self-verification-123',
        walletSignature: 'wallet-signature-456',
        approvedBy: 'owner-id',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should reject approval of already active manager', () => {
      const invite = inviteManager({
        email: 'manager@example.com',
        role: 'manager',
        invitedBy: 'owner-id',
      });

      approveManager({
        managerId: invite.manager!.id,
        selfVerificationId: 'self-verification-123',
        walletSignature: 'wallet-signature-456',
        approvedBy: 'owner-id',
      });

      const result = approveManager({
        managerId: invite.manager!.id,
        selfVerificationId: 'self-verification-789',
        walletSignature: 'wallet-signature-012',
        approvedBy: 'owner-id',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('active');
    });
  });

  describe('submitForReview', () => {
    beforeEach(() => {
      // Create a test remittance
      db.prepare(`
        INSERT INTO remittances (id, claim_token, sender_email, recipient_email, amount_celo, status, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('remittance-1', 'token-1', 'sender@example.com', 'recipient@example.com', '1.0', 'pending', Math.floor(Date.now() / 1000) + 604800);
    });

    it('should submit a remittance for review', () => {
      const result = submitForReview('remittance-1', 'manager-id');

      expect(result.success).toBe(true);
      expect(result.reviewItem).toBeDefined();
      expect(result.reviewItem!.remittanceId).toBe('remittance-1');
      expect(result.reviewItem!.submittedBy).toBe('manager-id');
      expect(result.reviewItem!.status).toBe('pending');
    });

    it('should reject non-existent remittance', () => {
      const result = submitForReview('non-existent', 'manager-id');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should reject already claimed remittance', () => {
      db.prepare('UPDATE remittances SET status = ? WHERE id = ?').run('claimed', 'remittance-1');

      const result = submitForReview('remittance-1', 'manager-id');

      expect(result.success).toBe(false);
      expect(result.error).toContain('claimed');
    });

    it('should reject duplicate submission', () => {
      submitForReview('remittance-1', 'manager-id');
      const result = submitForReview('remittance-1', 'manager-id');

      expect(result.success).toBe(false);
      expect(result.error).toContain('already in review queue');
    });

    it('should update remittance review_status', () => {
      submitForReview('remittance-1', 'manager-id');

      const remittance = db.prepare('SELECT * FROM remittances WHERE id = ?').get('remittance-1') as any;
      expect(remittance.review_status).toBe('pending_review');
    });
  });

  describe('reviewSubmission', () => {
    beforeEach(() => {
      // Create a test manager
      const invite = inviteManager({
        email: 'manager@example.com',
        role: 'manager',
        invitedBy: 'owner-id',
      });
      approveManager({
        managerId: invite.manager!.id,
        selfVerificationId: 'self-verification-123',
        walletSignature: 'wallet-signature-456',
        approvedBy: 'owner-id',
      });

      // Create a test remittance
      db.prepare(`
        INSERT INTO remittances (id, claim_token, sender_email, recipient_email, amount_celo, status, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('remittance-1', 'token-1', 'sender@example.com', 'recipient@example.com', '1.0', 'pending', Math.floor(Date.now() / 1000) + 604800);

      // Submit for review
      submitForReview('remittance-1', invite.manager!.id);
    });

    it('should approve a pending review', () => {
      const manager = getActiveManagers()[0];
      const result = reviewSubmission({
        remittanceId: 'remittance-1',
        reviewerId: manager.id,
        action: 'approve',
      });

      expect(result.success).toBe(true);

      const remittance = db.prepare('SELECT * FROM remittances WHERE id = ?').get('remittance-1') as any;
      expect(remittance.review_status).toBe('approved');
    });

    it('should reject a pending review', () => {
      const manager = getActiveManagers()[0];
      const result = reviewSubmission({
        remittanceId: 'remittance-1',
        reviewerId: manager.id,
        action: 'reject',
        notes: 'Not approved',
      });

      expect(result.success).toBe(true);

      const remittance = db.prepare('SELECT * FROM remittances WHERE id = ?').get('remittance-1') as any;
      expect(remittance.review_status).toBe('rejected');
      expect(remittance.status).toBe('cancelled');
    });

    it('should reject review by inactive manager', () => {
      const manager = getActiveManagers()[0];
      suspendManager(manager.id, 'owner-id');

      const result = reviewSubmission({
        remittanceId: 'remittance-1',
        reviewerId: manager.id,
        action: 'approve',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not an active manager');
    });

    it('should reject review of non-existent remittance', () => {
      const manager = getActiveManagers()[0];
      const result = reviewSubmission({
        remittanceId: 'non-existent',
        reviewerId: manager.id,
        action: 'approve',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('No pending review');
    });
  });

  describe('getPendingReviews', () => {
    it('should return empty array when no pending reviews', () => {
      const reviews = getPendingReviews();
      expect(reviews).toEqual([]);
    });

    it('should return pending reviews with remittance details', () => {
      // Create a test remittance
      db.prepare(`
        INSERT INTO remittances (id, claim_token, sender_email, recipient_email, amount_celo, status, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('remittance-1', 'token-1', 'sender@example.com', 'recipient@example.com', '1.0', 'pending', Math.floor(Date.now() / 1000) + 604800);

      // Create a test manager and submit
      const invite = inviteManager({
        email: 'manager@example.com',
        role: 'manager',
        invitedBy: 'owner-id',
      });
      submitForReview('remittance-1', invite.manager!.id);

      const reviews = getPendingReviews();
      expect(reviews).toHaveLength(1);
      expect(reviews[0].sender_email).toBe('sender@example.com');
      expect(reviews[0].recipient_email).toBe('recipient@example.com');
    });
  });

  describe('getManagerById', () => {
    it('should return manager by ID', () => {
      const invite = inviteManager({
        email: 'manager@example.com',
        role: 'manager',
        invitedBy: 'owner-id',
      });

      const manager = getManagerById(invite.manager!.id);
      expect(manager).toBeDefined();
      expect(manager!.email).toBe('manager@example.com');
    });

    it('should return undefined for non-existent ID', () => {
      const manager = getManagerById('non-existent-id');
      expect(manager).toBeUndefined();
    });
  });

  describe('suspendManager', () => {
    it('should suspend an active manager', () => {
      const invite = inviteManager({
        email: 'manager@example.com',
        role: 'manager',
        invitedBy: 'owner-id',
      });
      approveManager({
        managerId: invite.manager!.id,
        selfVerificationId: 'self-verification-123',
        walletSignature: 'wallet-signature-456',
        approvedBy: 'owner-id',
      });

      const result = suspendManager(invite.manager!.id, 'owner-id');
      expect(result).toBe(true);

      const manager = getManagerById(invite.manager!.id);
      expect(manager!.status).toBe('suspended');
    });

    it('should not allow suspending owner', () => {
      // Create an owner
      db.prepare(`
        INSERT INTO managers (id, email, role, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run('owner-id', 'owner@example.com', 'owner', 'active', Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000));

      const result = suspendManager('owner-id', 'other-owner-id');
      expect(result).toBe(false);
    });
  });
});
