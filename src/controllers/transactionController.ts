import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { validationError, validateEmail, validateAmount, validateCurrency } from '../utils/errors';
import { logger } from '../utils/logger';
import { mandateService } from '../services/mandateService';

const router = Router();

// In-memory store for demo (would use DB in production)
const transactions: Map<string, any> = new Map();

// Create a new remittance transaction
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { senderEmail, recipientEmail, amount, currency = 'cUSD' } = req.body;

    // Validate inputs
    if (!senderEmail || !recipientEmail) {
      throw validationError('Sender and recipient emails are required');
    }
    validateEmail(senderEmail);
    validateEmail(recipientEmail);
    validateAmount(amount);
    validateCurrency(currency);

    const transaction = {
      id: uuidv4(),
      senderEmail,
      recipientEmail,
      amount,
      currency,
      status: 'pending',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    };

    transactions.set(transaction.id, transaction);

    logger.info('Transaction created', { transactionId: transaction.id, senderEmail, recipientEmail, amount, currency });

    res.status(201).json({
      success: true,
      data: transaction,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// Get transaction status
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const transaction = transactions.get(id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Transaction not found' },
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      data: transaction,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// List transactions (for demo purposes)
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, status, limit = 10, offset = 0 } = req.query;
    
    let results = Array.from(transactions.values());
    
    if (email) {
      results = results.filter(t => t.senderEmail === email || t.recipientEmail === email);
    }
    if (status) {
      results = results.filter(t => t.status === status);
    }

    const paged = results.slice(Number(offset), Number(offset) + Number(limit));

    res.json({
      success: true,
      data: paged,
      pagination: {
        total: results.length,
        limit: Number(limit),
        offset: Number(offset),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// Claim transaction (recipient claims funds)
router.post('/:id/claim', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { claimToken, recipientAddress } = req.body;

    const transaction = transactions.get(id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Transaction not found' },
        timestamp: new Date().toISOString(),
      });
    }

    if (transaction.status !== 'pending' && transaction.status !== 'verified') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: `Transaction cannot be claimed in ${transaction.status} state` },
        timestamp: new Date().toISOString(),
      });
    }

    if (new Date() > new Date(transaction.expiresAt)) {
      transaction.status = 'expired';
      return res.status(400).json({
        success: false,
        error: { code: 'EXPIRED', message: 'Transaction has expired' },
        timestamp: new Date().toISOString(),
      });
    }

    // MANDATE POLICY CHECK - validate before fund release
    const validation = await mandateService.validateTransfer({
      action: 'claim',
      reason: `Email remittance from ${transaction.senderEmail} to ${transaction.recipientEmail} for ${transaction.amount} ${transaction.currency} on Celo`,
      amount: parseFloat(transaction.amount),
      to: recipientAddress,
      token: transaction.currency,
    });

    if (!validation.allowed) {
      const message = mandateService.formatValidationMessage(
        validation,
        transaction.amount,
        transaction.currency,
        transaction.recipientEmail,
        transaction.senderEmail,
      );
      logger.error(message);
      return res.status(403).json({
        success: false,
        error: {
          code: 'MANDATE_BLOCKED',
          message: message,
          blockReason: validation.blockReason,
        },
        timestamp: new Date().toISOString(),
      });
    }

    logger.info(mandateService.formatValidationMessage(
      validation,
      transaction.amount,
      transaction.currency,
      transaction.recipientEmail,
      transaction.senderEmail,
    ));

    // In production, this would:
    // 1. Verify claimToken
    // 2. Check Self protocol verification
    // 3. Transfer funds via Celo
    transaction.status = 'completed';
    transaction.recipientAddress = recipientAddress;
    transaction.completedAt = new Date();
    transaction.disbursementTxHash = '0x' + 'a'.repeat(64); // Mock tx hash
    transaction.mandateIntentId = validation.intentId;

    logger.info('Transaction claimed', { transactionId: id, recipientAddress });
    logger.info(`Transfer confirmed: ${transaction.disbursementTxHash}`);

    res.json({
      success: true,
      data: transaction,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

export const transactionRoutes = router;
