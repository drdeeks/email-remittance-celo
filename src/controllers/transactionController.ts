import { Router, Request, Response, NextFunction } from 'express';
import { validationError, validateEmail, validateAmount } from '../utils/errors';
import { logger } from '../utils/logger';
import { remittanceService } from '../services/remittanceService';

const router = Router();

// Create a new remittance transaction
router.post('/send', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { senderEmail, recipientEmail, amount, message } = req.body;

    // Validate inputs
    if (!senderEmail || !recipientEmail) {
      throw validationError('Sender and recipient emails are required');
    }
    validateEmail(senderEmail);
    validateEmail(recipientEmail);
    validateAmount(amount);

    const amountCelo = parseFloat(amount);

    const result = await remittanceService.createRemittance({
      senderEmail,
      recipientEmail,
      amountCelo,
      message,
    });

    logger.info('Remittance created', {
      remittanceId: result.remittanceId,
      senderEmail,
      recipientEmail,
      amount: amountCelo,
    });

    res.status(201).json({
      success: true,
      data: {
        remittanceId: result.remittanceId,
        claimToken: result.claimToken,
        txHash: result.txHash,
        expiresAt: new Date(result.expiresAt * 1000).toISOString(),
        claimUrl: `${process.env.BASE_URL}/api/remittance/claim/${result.claimToken}`,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// Claim a remittance
router.get('/claim/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params;
    const { recipientWallet } = req.query;

    if (!token) {
      throw validationError('Claim token is required');
    }

    const result = await remittanceService.claimRemittance(
      token,
      recipientWallet as string | undefined
    );

    logger.info('Remittance claimed', { token, txHash: result.txHash });

    const response: any = {
      success: true,
      data: {
        txHash: result.txHash,
        amount: result.amount,
        explorerUrl: `https://explorer.celo.org/mainnet/tx/${result.txHash}`,
      },
      timestamp: new Date().toISOString(),
    };

    if (result.privateKey) {
      response.data.wallet = result.wallet;
      response.data.privateKey = result.privateKey;
      response.data.warning = '⚠️ SAVE YOUR PRIVATE KEY! This will only be shown once. You need it to access your funds.';
    }

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// Get remittance status by ID
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const remittance = remittanceService.getRemittanceStatus(id);

    if (!remittance) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Remittance not found' },
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      data: {
        id: remittance.id,
        senderEmail: remittance.sender_email,
        recipientEmail: remittance.recipient_email,
        amount: remittance.amount_celo,
        status: remittance.status,
        message: remittance.message,
        createdAt: new Date(remittance.created_at * 1000).toISOString(),
        expiresAt: new Date(remittance.expires_at * 1000).toISOString(),
        claimedAt: remittance.claimed_at ? new Date(remittance.claimed_at * 1000).toISOString() : null,
        escrowTxHash: remittance.escrow_tx_hash,
        claimTxHash: remittance.claim_tx_hash,
        recipientWallet: remittance.recipient_wallet,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// Demo endpoint for hackathon
router.post('/demo', async (req: Request, res: Response, next: NextFunction) => {
  try {
    logger.info('Creating demo remittance');

    const result = await remittanceService.createRemittance({
      senderEmail: 'titan@openclaw.ai',
      recipientEmail: 'drdeeks@outlook.com',
      amountCelo: 0.01,
      message: 'Demo remittance from Titan - testing email-native crypto transfers on Celo!',
    });

    res.status(201).json({
      success: true,
      message: 'Demo remittance created! Check drdeeks@outlook.com for claim email.',
      data: {
        remittanceId: result.remittanceId,
        claimToken: result.claimToken,
        txHash: result.txHash,
        expiresAt: new Date(result.expiresAt * 1000).toISOString(),
        claimUrl: `${process.env.BASE_URL}/api/remittance/claim/${result.claimToken}`,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

export const transactionRoutes = router;
