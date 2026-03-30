import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { validateEmail, validationError } from '../utils/errors';
import { logger } from '../utils/logger';
import { selfVerificationService } from '../services/selfVerification.service';

const router = Router();

// In-memory store for demo
const verifications: Map<string, any> = new Map();

// Create verification request
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, transactionId, callbackUrl } = req.body;

    if (!email) {
      throw validationError('Email is required');
    }
    validateEmail(email);

    const verification = {
      id: uuidv4(),
      email,
      transactionId,
      status: 'pending',
      verificationUrl: `https://self.xyz/verify/${uuidv4()}`,
      qrCode: 'data:image/png;base64,...', // Would be actual QR code
      callbackUrl,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };

    verifications.set(verification.id, verification);

    logger.info('Verification created', { verificationId: verification.id, email });

    res.status(201).json({
      success: true,
      data: verification,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// Get verification status
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const verification = verifications.get(id);

    if (!verification) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Verification not found' },
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      data: verification,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// Verification callback — called by Self Protocol app with ZK proof
// Self app sends: { proof, publicSignals } directly to this endpoint
router.post('/callback', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { proof, publicSignals, verificationId } = req.body;

    // Run ZK proof verification via SelfBackendVerifier
    const result = await selfVerificationService.verifyProof(proof, publicSignals);

    logger.info('Self Protocol callback', {
      verified: result.verified,
      nationality: result.nationality,
      isMinimumAgeValid: result.isMinimumAgeValid,
      isOfacValid: result.isOfacValid,
    });

    if (!result.verified) {
      return res.status(400).json({
        success: false,
        error: { message: result.error || 'Verification failed' },
        timestamp: new Date().toISOString(),
      });
    }

    // Update in-memory store if verificationId provided
    if (verificationId) {
      const verification = verifications.get(verificationId);
      if (verification) {
        verification.status = 'verified';
        verification.verifiedAt = new Date();
        verification.nullifier = result.nullifier;
        verification.nationality = result.nationality;
      }
    }

    res.json({
      success: true,
      data: {
        verified: true,
        nullifier: result.nullifier,
        nationality: result.nationality,
        isMinimumAgeValid: result.isMinimumAgeValid,
        isOfacValid: result.isOfacValid,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// Get supported verification attributes
router.get('/attributes/supported', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({
      success: true,
      data: {
        attributes: ['email', 'phone', 'name', 'address', 'birthdate', 'nationality'],
        required: ['email'],
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

export const verificationRoutes = router;
