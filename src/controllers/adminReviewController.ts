/**
 * Admin Review Controller
 *
 * API routes for admin/manager review workflow:
 * - Manager management (invite, approve, suspend)
 * - Review queue (submit, approve/reject, list pending)
 * - Configurable verification requirements
 */

import { Router, Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import {
  inviteManager,
  approveManager,
  submitForReview,
  reviewSubmission,
  getPendingReviews,
  getActiveManagers,
  getManagerById,
  suspendManager,
} from '../services/adminReviewService';
import { emailNotifier } from '../services/emailNotifier';

const router = Router();

// ─── Manager Management ──────────────────────────────────────────────────────

/**
 * POST /api/admin/managers/invite
 * Invite a new manager (owner/admin only)
 */
router.post('/managers/invite', async (req: Request, res: Response) => {
  try {
    const { email, role, invitedBy } = req.body;

    if (!email || !role || !invitedBy) {
      return res.status(400).json({ success: false, error: 'Missing required fields: email, role, invitedBy' });
    }

    if (!['admin', 'manager'].includes(role)) {
      return res.status(400).json({ success: false, error: 'Role must be admin or manager' });
    }

    // Verify inviter is active owner or admin
    const inviter = getManagerById(invitedBy);
    if (!inviter || inviter.status !== 'active' || !['owner', 'admin'].includes(inviter.role)) {
      return res.status(403).json({ success: false, error: 'Only owner or admin can invite managers' });
    }

    const result = inviteManager({ email, role: role as 'admin' | 'manager', invitedBy });

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    res.json({ success: true, manager: result.manager });
  } catch (error: any) {
    logger.error('Manager invite failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to invite manager' });
  }
});

/**
 * POST /api/admin/managers/approve
 * Approve a pending manager (owner/admin only)
 * Requires dual identity: Self verification + wallet signature
 */
router.post('/managers/approve', async (req: Request, res: Response) => {
  try {
    const { managerId, selfVerificationId, walletSignature, approvedBy } = req.body;

    if (!managerId || !selfVerificationId || !walletSignature || !approvedBy) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: managerId, selfVerificationId, walletSignature, approvedBy',
      });
    }

    // Verify approver is active owner or admin
    const approver = getManagerById(approvedBy);
    if (!approver || approver.status !== 'active' || !['owner', 'admin'].includes(approver.role)) {
      return res.status(403).json({ success: false, error: 'Only owner or admin can approve managers' });
    }

    const result = approveManager({ managerId, selfVerificationId, walletSignature, approvedBy });

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    res.json({ success: true, manager: result.manager });
  } catch (error: any) {
    logger.error('Manager approval failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to approve manager' });
  }
});

/**
 * GET /api/admin/managers
 * List all active managers
 */
router.get('/managers', async (req: Request, res: Response) => {
  try {
    const managers = getActiveManagers();
    res.json({ success: true, managers });
  } catch (error: any) {
    logger.error('Failed to list managers', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to list managers' });
  }
});

/**
 * POST /api/admin/managers/suspend
 * Suspend a manager (owner only)
 */
router.post('/managers/suspend', async (req: Request, res: Response) => {
  try {
    const { managerId, suspendedBy } = req.body;

    if (!managerId || !suspendedBy) {
      return res.status(400).json({ success: false, error: 'Missing required fields: managerId, suspendedBy' });
    }

    const suspender = getManagerById(suspendedBy);
    if (!suspender || suspender.status !== 'active' || suspender.role !== 'owner') {
      return res.status(403).json({ success: false, error: 'Only owner can suspend managers' });
    }

    const success = suspendManager(managerId, suspendedBy);
    if (!success) {
      return res.status(400).json({ success: false, error: 'Cannot suspend this manager' });
    }

    res.json({ success: true });
  } catch (error: any) {
    logger.error('Manager suspension failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to suspend manager' });
  }
});

// ─── Review Queue ────────────────────────────────────────────────────────────

/**
 * POST /api/admin/review/submit
 * Submit a remittance for review (service mode — email held until approved)
 */
router.post('/review/submit', async (req: Request, res: Response) => {
  try {
    const { remittanceId, submittedBy } = req.body;

    if (!remittanceId || !submittedBy) {
      return res.status(400).json({ success: false, error: 'Missing required fields: remittanceId, submittedBy' });
    }

    // Verify submitter is an active manager
    const submitter = getManagerById(submittedBy);
    if (!submitter || submitter.status !== 'active') {
      return res.status(403).json({ success: false, error: 'Submitter is not an active manager' });
    }

    const result = submitForReview(remittanceId, submittedBy);

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    res.json({ success: true, reviewItem: result.reviewItem });
  } catch (error: any) {
    logger.error('Review submission failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to submit for review' });
  }
});

/**
 * POST /api/admin/review/action
 * Approve or reject a pending review
 */
router.post('/review/action', async (req: Request, res: Response) => {
  try {
    const { remittanceId, reviewerId, action, notes } = req.body;

    if (!remittanceId || !reviewerId || !action) {
      return res.status(400).json({ success: false, error: 'Missing required fields: remittanceId, reviewerId, action' });
    }

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, error: 'Action must be approve or reject' });
    }

    const result = reviewSubmission({ remittanceId, reviewerId, action, notes });

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    // If approved, send the claim email (was held during service mode review)
    if (action === 'approve') {
      try {
        const { db } = await import('../db/database');
        const remittance = db.prepare('SELECT * FROM remittances WHERE id = ?').get(remittanceId) as any;
        if (remittance) {
          await emailNotifier.sendClaimEmail(
            remittance.recipient_email,
            parseFloat(remittance.amount_celo || '0'),
            remittance.claim_token,
            remittance.chain || 'celo',
            remittance.sender_email
          );
          logger.info('Claim email sent after approval', { remittanceId });
        }
      } catch (emailErr: any) {
        logger.warn('Failed to send claim email after approval', { remittanceId, error: emailErr.message });
      }
    }

    res.json({ success: true });
  } catch (error: any) {
    logger.error('Review action failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to process review' });
  }
});

/**
 * GET /api/admin/review/pending
 * List all pending review items
 */
router.get('/review/pending', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const items = getPendingReviews(limit, offset);
    res.json({ success: true, items, count: items.length });
  } catch (error: any) {
    logger.error('Failed to list pending reviews', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to list pending reviews' });
  }
});

export { router as adminReviewRoutes };
