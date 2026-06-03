import { Request, Response, Router } from 'express';
import { selfVerificationService } from '../services/selfVerification.service';
import { logger } from '../utils/logger';

export const verifyIdentity = async (req: Request, res: Response) => {
  try {
    const result = await selfVerificationService.verifyIdentity(req.body);
    
     // Transform the service response to match expected API format
     if (result.success && result.result === true && result.credentialSubject) {
       // Successful verification with proof - return the expected format
       res.json({
         status: 'success',
         result: true,
         credentialSubject: result.credentialSubject,
         documentType: result.documentType,
         timestamp: result.timestamp
       });
     } else if (!result.success) {
       // Verification failed
       res.json({
         success: false,
         error: result.message || 'Verification failed',
         timestamp: result.timestamp
       });
     } else {
       // Verification not required or other success case
       res.json(result);
     }
  } catch (error) {
    logger.error('Failed to verify identity', { error });
    res.status(500).json({ error: 'Failed to verify identity' });
  }
};

export const getVerificationStatus = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    // Implementation would go here
    res.json({ status: 'verified' });
  } catch (error) {
    logger.error('Failed to get verification status', { error });
    res.status(500).json({ error: 'Failed to get verification status' });
  }
};

// Create and export router for verification routes
export const verificationRoutes = Router();

const verifyIdentityHandler = async (req: Request, res: Response) => {
  try {
    const result = await selfVerificationService.verifyIdentity({
      ...req.body,
      senderCallback: req.path.includes('sender-callback')
    });
    res.json(result);
  } catch (error) {
    logger.error('Failed to verify identity', { error });
    res.status(500).json({ error: 'Failed to verify identity' });
  }
};

verificationRoutes.post('/callback', verifyIdentityHandler);
verificationRoutes.post('/sender-callback', verifyIdentityHandler);
verificationRoutes.get('/status/:token', getVerificationStatus);
