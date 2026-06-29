import { Request, Response, Router } from 'express';
import { 
  createRemittance, 
  claimRemittance, 
  getRemittanceByClaimToken, 
  getRemittancesBySender, 
  getRemittancesByRecipient, 
  cancelRemittance,
  CreateRemittanceRequest,
  ClaimRemittanceRequest
} from '../services/remittanceService';
import { validateEmail } from '../services/emailValidator';
import { previewFee } from '../services/feeEngine';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/remittances/create
 * Creates a new remittance with claim token
 */
router.post('/create', async (req: Request, res: Response) => {
  try {
    const {
      senderId,
      senderEmail,
      recipientEmail,
      amountUsd,
      chainId,
      tokenAddress,
      requireAuth,
      idempotencyKey,
      memo
    } = req.body as CreateRemittanceRequest;

    // Validate required fields
    if (!senderId || !senderEmail || !recipientEmail || !amountUsd || !chainId || !tokenAddress || !idempotencyKey) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: senderId, senderEmail, recipientEmail, amountUsd, chainId, tokenAddress, idempotencyKey'
      });
    }

    // Validate email formats
    const senderEmailValidation = validateEmail(senderEmail);
    if (!senderEmailValidation.valid) {
      return res.status(400).json({ success: false, error: 'Invalid sender email format' });
    }

    const recipientEmailValidation = validateEmail(recipientEmail);
    if (!recipientEmailValidation.valid) {
      return res.status(400).json({ success: false, error: 'Invalid recipient email format' });
    }

    // Validate amount
    if (amountUsd <= 0) {
      return res.status(400).json({ success: false, error: 'Amount must be greater than 0' });
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(tokenAddress)) {
      return res.status(400).json({ success: false, error: 'Invalid token address format' });
    }

    // Validate chain ID
    if (!Number.isInteger(chainId) || chainId <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid chain ID' });
    }

    // Validate idempotency key format (UUID)
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotencyKey)) {
      return res.status(400).json({ success: false, error: 'Invalid idempotency key format (must be UUID v4)' });
    }

    // Preview fee
    const feePreview = await previewFee(amountUsd, chainId, tokenAddress);
    if (!feePreview) {
      return res.status(400).json({ 
        success: false, 
        error: 'Fee configuration not found for this chain/token combination' 
      });
    }

    // Check if amount covers fee
    if (amountUsd <= feePreview.feeUsd) {
      return res.status(400).json({ 
        success: false, 
        error: `Amount must be greater than fee ($${feePreview.feeUsd.toFixed(2)})` 
      });
    }

    const result = await createRemittance({
      senderId,
      senderEmail: senderEmailValidation.normalizedEmail!,
      recipientEmail: recipientEmailValidation.normalizedEmail!,
      amountUsd,
      chainId,
      tokenAddress: tokenAddress.toLowerCase(),
      requireAuth: requireAuth ?? true,
      idempotencyKey,
      memo
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('Create remittance error', { error: error.message, stack: error.stack });
    res.status(500).json({ success: false, error: 'Failed to create remittance' });
  }
});

/**
 * GET /api/remittances/preview-fee
 * Preview fee for a given amount/chain/token
 */
router.get('/preview-fee', async (req: Request, res: Response) => {
  try {
    const { amountUsd, chainId, tokenAddress } = req.query;

    if (!amountUsd || !chainId || !tokenAddress) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required query params: amountUsd, chainId, tokenAddress' 
      });
    }

    const amount = parseFloat(amountUsd as string);
    const chain = parseInt(chainId as string, 10);
    const token = tokenAddress as string;

    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid amountUsd' });
    }
    if (isNaN(chain) || chain <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid chainId' });
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(token)) {
      return res.status(400).json({ success: false, error: 'Invalid tokenAddress format' });
    }

    const preview = await previewFee(amount, chain, token);

    if (!preview) {
      return res.status(404).json({ 
        success: false, 
        error: 'Fee configuration not found for this chain/token' 
      });
    }

    res.json({ success: true, data: preview });
  } catch (error) {
    logger.error('Preview fee error', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to preview fee' });
  }
});

/**
 * GET /api/remittances/claim/:claimToken
 * Get remittance details by claim token (for claim page)
 */
router.get('/claim/:claimToken', async (req: Request, res: Response) => {
  try {
    const { claimToken } = req.params;

    if (!claimToken || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(claimToken)) {
      return res.status(400).json({ success: false, error: 'Invalid claim token format' });
    }

    const remittance = getRemittanceByClaimToken(claimToken);

    if (!remittance) {
      return res.status(404).json({ success: false, error: 'Remittance not found' });
    }

    // Don't expose claim_token hash
    const { claim_token, ...safeRemittance } = remittance;

    res.json({ success: true, data: safeRemittance });
  } catch (error) {
    logger.error('Get remittance by claim token error', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to get remittance' });
  }
});

/**
 * POST /api/remittances/claim
 * Claims a remittance
 */
router.post('/claim', async (req: Request, res: Response) => {
  try {
    const {
      claimToken,
      claimSecret,
      recipientWallet,
      recipientEmail,
      verificationMethod,
      verificationData,
      idempotencyKey
    } = req.body as ClaimRemittanceRequest;

    // Validate required fields
    if (!claimToken || !claimSecret || !recipientWallet || !recipientEmail || !idempotencyKey) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: claimToken, claimSecret, recipientWallet, recipientEmail, idempotencyKey'
      });
    }

    // Validate email
    const emailValidation = validateEmail(recipientEmail);
    if (!emailValidation.valid) {
      return res.status(400).json({ success: false, error: 'Invalid recipient email' });
    }

    // Validate wallet address
    if (!/^0x[a-fA-F0-9]{40}$/.test(recipientWallet)) {
      return res.status(400).json({ success: false, error: 'Invalid wallet address format' });
    }

    // Validate claim token format (UUID)
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(claimToken)) {
      return res.status(400).json({ success: false, error: 'Invalid claim token format' });
    }

    // Validate idempotency key
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotencyKey)) {
      return res.status(400).json({ success: false, error: 'Invalid idempotency key format' });
    }

    const result = await claimRemittance({
      claimToken,
      claimSecret,
      recipientWallet: recipientWallet.toLowerCase(),
      recipientEmail: emailValidation.normalizedEmail!,
      verificationMethod,
      verificationData,
      idempotencyKey
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('Claim remittance error', { error: error.message, stack: error.stack });
    res.status(500).json({ success: false, error: 'Failed to claim remittance' });
  }
});

/**
 * GET /api/remittances/sender/:senderId
 * Get remittances sent by a user
 */
router.get('/sender/:senderId', async (req: Request, res: Response) => {
  try {
    const { senderId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    if (!senderId) {
      return res.status(400).json({ success: false, error: 'Sender ID required' });
    }

    const remittances = getRemittancesBySender(senderId, limit, offset);
    res.json({ success: true, data: remittances });
  } catch (error) {
    logger.error('Get remittances by sender error', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to get remittances' });
  }
});

/**
 * GET /api/remittances/recipient/:recipientId
 * Get remittances received by a user
 */
router.get('/recipient/:recipientId', async (req: Request, res: Response) => {
  try {
    const { recipientId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    if (!recipientId) {
      return res.status(400).json({ success: false, error: 'Recipient ID required' });
    }

    const remittances = getRemittancesByRecipient(recipientId, limit, offset);
    res.json({ success: true, data: remittances });
  } catch (error) {
    logger.error('Get remittances by recipient error', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to get remittances' });
  }
});

/**
 * DELETE /api/remittances/:id/cancel
 * Cancel a pending remittance (sender only)
 */
router.delete('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { senderId } = req.body;

    if (!id || !senderId) {
      return res.status(400).json({ success: false, error: 'Remittance ID and sender ID required' });
    }

    const cancelled = cancelRemittance(id, senderId);

    if (!cancelled) {
      return res.status(400).json({ success: false, error: 'Remittance not found, not pending, or not owned by sender' });
    }

    res.json({ success: true, message: 'Remittance cancelled successfully' });
  } catch (error) {
    logger.error('Cancel remittance error', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to cancel remittance' });
  }
});

export { router as remittanceRoutes };