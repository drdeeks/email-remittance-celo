import { Router, Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

const router = Router();

// Ampersend webhook handler (email events)
router.post('/ampersend', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { event, messageId, email, timestamp, metadata } = req.body;

    logger.info('Ampersend webhook received', { event, messageId, email });

    // Handle different email events
    switch (event) {
      case 'delivered':
        logger.info('Email delivered', { messageId, email });
        break;
      case 'opened':
        logger.info('Email opened', { messageId, email });
        break;
      case 'clicked':
        logger.info('Email link clicked', { messageId, email });
        break;
      case 'bounced':
        logger.warn('Email bounced', { messageId, email });
        break;
      case 'complained':
        logger.warn('Email marked as spam', { messageId, email });
        break;
      default:
        logger.debug('Unknown email event', { event, messageId });
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
