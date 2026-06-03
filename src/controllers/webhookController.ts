import { Router, Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { remittanceService } from '../services/remittanceService';

const router = Router();

// Resend webhook handler (email events)
router.post('/resend', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Verify webhook signature
    const signature = req.headers['x-resend-signature'] as string;
    const secret = process.env.RESEND_WEBHOOK_SECRET;
    
    if (!signature || !secret) {
      logger.warn('Missing webhook signature or secret');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // TODO: Implement signature verification
    // const isValid = verifyResendSignature(req.body, signature, secret);
    // if (!isValid) {
    //   logger.warn('Invalid webhook signature');
    //   return res.status(401).json({ error: 'Unauthorized' });
    // }

    const { type, data } = req.body;
    const { email, created_at, subject, to, from, tags } = data;

    logger.info('Resend webhook received', { type, email });

    // Handle different email events
    switch (type) {
      case 'email.delivered':
        logger.info('Email delivered', { email, created_at });
        // Update remittance status to 'email_sent'
        if (tags && tags.includes('remittance:')) {
          const claimToken = tags.find(tag => tag.startsWith('remittance:'))?.split(':')[1];
          if (claimToken) {
            await remittanceService.markEmailSent(claimToken);
          }
        }
        break;
      case 'email.opened':
        logger.info('Email opened', { email, created_at });
        break;
      case 'email.clicked':
        logger.info('Email link clicked', { email, created_at });
        break;
      case 'email.bounced':
        logger.warn('Email bounced', { email, created_at });
        // Mark remittance for recovery
        if (tags && tags.includes('remittance:')) {
          const claimToken = tags.find(tag => tag.startsWith('remittance:'))?.split(':')[1];
          if (claimToken) {
            await remittanceService.markEmailFailed(claimToken);
          }
        }
        break;
      case 'email.complained':
        logger.warn('Email marked as spam', { email, created_at });
        break;
      default:
        logger.debug('Unknown email event', { type, email });
    }

    res.json({ received: true });
  } catch (error) {
    next(error);
  }
});

// Self protocol webhook handler (verification events)
router.post('/self', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { event, verificationId, userId, attributes, timestamp } = req.body;

    logger.info('Self protocol webhook received', { event, verificationId });

    switch (event) {
      case 'verification.completed':
        logger.info('Self verification completed', { verificationId, userId });
        // Update transaction status, trigger fund release
        break;
      case 'verification.failed':
        logger.warn('Self verification failed', { verificationId, userId });
        break;
      case 'verification.expired':
        logger.info('Self verification expired', { verificationId });
        break;
      default:
        logger.debug('Unknown Self event', { event, verificationId });
    }

    res.json({ received: true });
  } catch (error) {
    next(error);
  }
});

// Celo blockchain webhook handler (transaction events)
router.post('/celo', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { event, txHash, from, to, value, blockNumber } = req.body;

    logger.info('Celo webhook received', { event, txHash });

    switch (event) {
      case 'transaction.confirmed':
        logger.info('Celo transaction confirmed', { txHash, from, to, value });
        break;
      case 'transaction.failed':
        logger.warn('Celo transaction failed', { txHash });
        break;
      default:
        logger.debug('Unknown Celo event', { event, txHash });
    }

    res.json({ received: true });
  } catch (error) {
    next(error);
  }
});

export const webhookRoutes = router;
