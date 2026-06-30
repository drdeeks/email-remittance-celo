/**
 * Admin Manager Review Service
 *
 * Handles the complete admin/manager review workflow:
 * - Manager registration and approval (dual identity: verification + wallet signature)
 * - Review queue management (pending sends → approval → email sent)
 * - Configurable verification requirements per sender/recipient
 */

import { db } from '../db/database';
import { logger } from '../utils/logger';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

// Types
export interface Manager {
  id: string;
  email: string;
  role: 'owner' | 'admin' | 'manager';
  wallet_address: string | null;
  self_verification_id: string | null;
  self_verified: number;
  wallet_signature: string | null;
  wallet_signature_verified: number;
  invited_by: string | null;
  approved_by: string | null;
  approved_at: number | null;
  status: 'pending' | 'active' | 'suspended' | 'revoked';
  created_at: number;
  updated_at: number;
}

export interface ReviewQueueItem {
  id: string;
  remittance_id: string;
  submitted_by: string;
  reviewed_by: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  submitted_at: number;
  reviewed_at: number | null;
  review_notes: string | null;
  created_at: number;
  updated_at: number;
}

export interface InviteManagerRequest {
  email: string;
  role: 'admin' | 'manager';
  invitedBy: string;
}

export interface ApproveManagerRequest {
  managerId: string;
  selfVerificationId: string;
  walletSignature: string;
  approvedBy: string;
}

export interface ReviewSubmissionRequest {
  remittanceId: string;
  reviewerId: string;
  action: 'approve' | 'reject';
  notes?: string;
}

/**
 * Invites a new manager. Creates pending record.
 * Owner/admin approves after dual identity verification.
 */
export function inviteManager(request: InviteManagerRequest): { success: boolean; manager?: Manager; error?: string } {
  // Check if email already exists
  const existing = db.prepare('SELECT id FROM managers WHERE email = ?').get(request.email) as Manager | undefined;
  if (existing) {
    return { success: false, error: 'Manager with this email already exists' };
  }

  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);

  db.prepare(`
    INSERT INTO managers (id, email, role, invited_by, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'pending', ?, ?)
  `).run(id, request.email.toLowerCase(), request.role, request.invitedBy, now, now);

  const manager = db.prepare('SELECT * FROM managers WHERE id = ?').get(id) as Manager;

  logger.info('Manager invited', { managerId: id, email: request.email, role: request.role, invitedBy: request.invitedBy });

  return { success: true, manager };
}

/**
 * Approves a manager after dual identity verification.
 * Manager must complete: (1) Self Protocol verification AND (2) wallet signature.
 */
export function approveManager(request: ApproveManagerRequest): { success: boolean; manager?: Manager; error?: string } {
  const manager = db.prepare('SELECT * FROM managers WHERE id = ?').get(request.managerId) as Manager | undefined;

  if (!manager) {
    return { success: false, error: 'Manager not found' };
  }

  if (manager.status !== 'pending') {
    return { success: false, error: `Manager is already ${manager.status}` };
  }

  const now = Math.floor(Date.now() / 1000);

  db.prepare(`
    UPDATE managers
    SET self_verification_id = ?,
        self_verified = 1,
        wallet_signature = ?,
        wallet_signature_verified = 1,
        approved_by = ?,
        approved_at = ?,
        status = 'active',
        updated_at = ?
    WHERE id = ?
  `).run(
    request.selfVerificationId,
    request.walletSignature,
    request.approvedBy,
    now,
    now,
    request.managerId
  );

  const updated = db.prepare('SELECT * FROM managers WHERE id = ?').get(request.managerId) as Manager;

  logger.info('Manager approved', {
    managerId: request.managerId,
    approvedBy: request.approvedBy,
    selfVerificationId: request.selfVerificationId,
  });

  return { success: true, manager: updated };
}

/**
 * Submits a remittance to the review queue (service mode).
 * Email is NOT sent until approved.
 */
export function submitForReview(remittanceId: string, submittedBy: string): { success: boolean; reviewItem?: ReviewQueueItem; error?: string } {
  // Check remittance exists and is pending
  const remittance = db.prepare('SELECT * FROM remittances WHERE id = ?').get(remittanceId) as any;
  if (!remittance) {
    return { success: false, error: 'Remittance not found' };
  }

  if (remittance.status !== 'pending') {
    return { success: false, error: `Remittance is already ${remittance.status}` };
  }

  // Check if already in review queue
  const existing = db.prepare('SELECT id FROM review_queue WHERE remittance_id = ? AND status = ?')
    .get(remittanceId, 'pending') as ReviewQueueItem | undefined;
  if (existing) {
    return { success: false, error: 'Remittance is already in review queue' };
  }

  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);

  db.prepare(`
    INSERT INTO review_queue (id, remittance_id, submitted_by, status, submitted_at, created_at, updated_at)
    VALUES (?, ?, ?, 'pending', ?, ?, ?)
  `).run(id, remittanceId, submittedBy, now, now, now);

  // Update remittance review status
  db.prepare(`
    UPDATE remittances SET review_status = 'pending_review', submitted_by = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(submittedBy, remittanceId);

  const reviewItem = db.prepare('SELECT * FROM review_queue WHERE id = ?').get(id) as ReviewQueueItem;

  logger.info('Remittance submitted for review', { remittanceId, submittedBy, reviewItemId: id });

  return { success: true, reviewItem };
}

/**
 * Reviews a submission — approve or reject.
 * On approve: sends claim email to recipient.
 * On reject: marks remittance as cancelled.
 */
export function reviewSubmission(request: ReviewSubmissionRequest): { success: boolean; error?: string } {
  const reviewItem = db.prepare('SELECT * FROM review_queue WHERE remittance_id = ? AND status = ?')
    .get(request.remittanceId, 'pending') as ReviewQueueItem | undefined;

  if (!reviewItem) {
    return { success: false, error: 'No pending review found for this remittance' };
  }

  // Verify reviewer is an active manager/admin/owner
  const reviewer = db.prepare('SELECT * FROM managers WHERE id = ? AND status = ?')
    .get(request.reviewerId, 'active') as Manager | undefined;

  if (!reviewer) {
    return { success: false, error: 'Reviewer is not an active manager' };
  }

  const now = Math.floor(Date.now() / 1000);
  const newStatus = request.action === 'approve' ? 'approved' : 'rejected';

  db.prepare(`
    UPDATE review_queue
    SET status = ?, reviewed_by = ?, reviewed_at = ?, review_notes = ?, updated_at = ?
    WHERE id = ?
  `).run(newStatus, request.reviewerId, now, request.notes || null, now, reviewItem.id);

  // Update remittance
  if (request.action === 'approve') {
    db.prepare(`
      UPDATE remittances
      SET review_status = 'approved', reviewed_by = ?, reviewed_at = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(request.reviewerId, now, request.remittanceId);

    // Now send the claim email (was held during service mode)
    // The email sending is triggered by the caller after this function returns
    logger.info('Remittance approved for claim email', {
      remittanceId: request.remittanceId,
      reviewedBy: request.reviewerId,
    });
  } else {
    db.prepare(`
      UPDATE remittances
      SET review_status = 'rejected', reviewed_by = ?, reviewed_at = ?, status = 'cancelled', updated_at = datetime('now')
      WHERE id = ?
    `).run(request.reviewerId, now, request.remittanceId);

    logger.info('Remittance rejected', {
      remittanceId: request.remittanceId,
      reviewedBy: request.reviewerId,
      notes: request.notes,
    });
  }

  return { success: true };
}

/**
 * Gets pending review items with remittance details.
 */
export function getPendingReviews(limit = 50, offset = 0): Array<ReviewQueueItem & { remittance: any }> {
  const items = db.prepare(`
    SELECT rq.*, r.sender_email, r.recipient_email, r.amount_celo, r.chain, r.status as remittance_status
    FROM review_queue rq
    JOIN remittances r ON rq.remittance_id = r.id
    WHERE rq.status = 'pending'
    ORDER BY rq.submitted_at ASC
    LIMIT ? OFFSET ?
  `).all(limit, offset) as any[];

  return items;
}

/**
 * Gets all active managers.
 */
export function getActiveManagers(): Manager[] {
  return db.prepare("SELECT * FROM managers WHERE status = 'active' ORDER BY created_at ASC").all() as Manager[];
}

/**
 * Gets manager by ID.
 */
export function getManagerById(id: string): Manager | undefined {
  return db.prepare('SELECT * FROM managers WHERE id = ?').get(id) as Manager | undefined;
}

/**
 * Suspends a manager.
 */
export function suspendManager(managerId: string, suspendedBy: string): boolean {
  const manager = db.prepare('SELECT * FROM managers WHERE id = ?').get(managerId) as Manager | undefined;
  if (!manager || manager.role === 'owner') return false; // Cannot suspend owner

  const result = db.prepare(`
    UPDATE managers SET status = 'suspended', updated_at = ? WHERE id = ?
  `).run(Math.floor(Date.now() / 1000), managerId);

  logger.info('Manager suspended', { managerId, suspendedBy });
  return result.changes > 0;
}
