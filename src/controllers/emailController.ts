import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { validateEmail, validationError } from '../utils/errors';
import { logger } from '../utils/logger';

const router = Router();

// In-memory store for demo
const emailLogs: Map<string, any> = new Map();

// Send claim email to recipient
router.post('/send-claim', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { recipientEmail, transactionId, amount, currency, senderEmail } = req.body;

    if (!recipientEmail || !transactionId) {
      throw validationError('Recipient email and transaction ID are required');
    }
    validateEmail(recipientEmail);

    const claimUrl = `https://remittance.app/claim/${transactionId}`;
    
    const emailLog = {
      id: uuidv4(),
      transactionId,
      to: recipientEmail,
      from: 'noreply@remittance.app',
      subject: `You've received ${amount} ${currency}!`,
      status: 'sent',
      type: 'claim',
      sentAt: new Date(),
      metadata: { amount, currency, senderEmail, claimUrl },
    };

    emailLogs.set(emailLog.id, emailLog);

    logger.info('Claim email sent', { emailId: emailLog.id, recipientEmail, transactionId });

    res.status(201).json({
      success: true,
      data: emailLog,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// Send completion confirmation email
router.post('/send-completion', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { recipientEmail, transactionId, amount, currency, txHash } = req.body;

    if (!recipientEmail || !transactionId) {
      throw validationError('Recipient email and transaction ID are required');
    }
    validateEmail(recipientEmail);

    const emailLog = {
      id: uuidv4(),
      transactionId,
      to: recipientEmail,
      from: 'noreply@remittance.app',
      subject: `Your ${amount} ${currency} has been deposited!`,
      status: 'sent',
      type: 'completion',
      sentAt: new Date(),
      metadata: { amount, currency, txHash },
    };

    emailLogs.set(emailLog.id, emailLog);

    logger.info('Completion email sent', { emailId: emailLog.id, recipientEmail, transactionId });

    res.status(201).json({
      success: true,
      data: emailLog,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// Verify email address
router.post('/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw validationError('Email is required');
    }
    validateEmail(email);

    // Mock email verification
    const disposableDomains = ['tempmail.com', 'throwaway.email', '10minutemail.com'];
    const isDisposable = disposableDomains.some(domain => email.endsWith(`@${domain}`));

    res.json({
      success: true,
      data: {
        email,
        valid: true,
        exists: !isDisposable,
        disposable: isDisposable,
        reason: isDisposable ? 'Disposable email address not allowed' : undefined,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// Get email logs for a transaction
router.get('/logs/:transactionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { transactionId } = req.params;
    
    const logs = Array.from(emailLogs.values()).filter(log => log.transactionId === transactionId);

    res.json({
      success: true,
      data: logs,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

export const emailRoutes = router;
