import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { validateEmail, validationError } from '../utils/errors';
import { logger } from '../utils/logger';

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

// Verification callback (called by Self protocol)
router.post('/callback', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { verificationId, verified, attributes, proof } = req.body;

    const verification = verifications.get(verificationId);

    if (!verification) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Verification not found' },
        timestamp: new Date().toISOString(),
      });
    }

    verification.status = verified ? 'verified' : 'failed';
    verification.verifiedAt = verified ? new Date() : undefined;
    verification.attributes = attributes;
    verification.proof = proof;

    logger.info('Verification callback received', { verificationId, verified });

    res.json({
      success: true,
      data: verification,
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
