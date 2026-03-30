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

// Verification callback — called by Self Protocol app with ZK proof (V2 API)
// Self app sends: { attestationId, proof, pubSignals, userContextData }
router.post('/callback', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { attestationId, proof, pubSignals, userContextData } = req.body;

    // Validate required V2 fields
    if (!proof || !pubSignals || !attestationId || !userContextData) {
      return res.status(200).json({
        success: false,
        message: 'proof, pubSignals, attestationId and userContextData are required',
        timestamp: new Date().toISOString(),
      });
    }

    // Run ZK proof verification via SelfBackendVerifier V2
    const result = await selfVerificationService.verifyProof(
      attestationId,
      proof,
      pubSignals,
      userContextData
    );

    logger.info('Self Protocol V2 callback', {
      verified: result.verified,
      documentType: result.documentType,
      nationality: result.nationality,
      isMinimumAgeValid: result.isMinimumAgeValid,
      isOfacValid: result.isOfacValid,
    });

    if (!result.verified) {
      return res.status(200).json({
        status: 'error',
        result: false,
        reason: result.error || 'Verification failed',
        error_code: 'VERIFICATION_FAILED',
        details: { isMinimumAgeValid: result.isMinimumAgeValid, isOfacValid: result.isOfacValid },
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      status: 'success',
      result: true,
      credentialSubject: result.discloseOutput,
      documentType: result.documentType,
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
