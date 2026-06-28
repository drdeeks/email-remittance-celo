import { Request, Response, Router } from 'express';
import { selfVerificationService } from '../services/selfVerification.service';
import { selfEnterpriseEnhancedService } from '../services/selfEnterpriseEnhancedService';
import { logger } from '../utils/logger';
import { VerificationMethodSelectionRequest } from '../types/verification';

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

export const selectVerificationMethod = async (req: Request, res: Response) => {
  try {
    // Dry run mode for testing - bypass actual verification in development
    const dryRun = process.env.NODE_ENV === 'development' && req.body.dryRun === true;
    
    const { method, reason, force } = req.body as VerificationMethodSelectionRequest;
    
    // SCR-1: User verification method selector - NONE, SELF, OR WORLDID
    if (!method || !['NONE', 'SELF', 'WORLDID'].includes(method)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid verification method. Must be NONE, SELF, or WORLDID',
        timestamp: new Date().toISOString(),
        method: method || 'invalid'
      });
    }
    
    // Validate required verification fields based on selected method
    if (method === 'SELF') {
      const { proof, pubSignals, attestationId, userContextData, recipient, amount, currency } = req.body;
      if ((!proof || !pubSignals || !attestationId || !userContextData) && !dryRun) {
        return res.status(400).json({
          success: false,
          error: 'Missing required Self Protocol verification fields',
          timestamp: new Date().toISOString(),
          method: 'SELF'
        });
      }
    } else if (method === 'WORLDID') {
      const { nullifierHash, merkleRoot, proof, recipient, amount, currency } = req.body;
      if ((!nullifierHash || !merkleRoot || !proof) && !dryRun) {
        return res.status(400).json({
          success: false,
          error: 'Missing required WorldID verification fields',
          timestamp: new Date().toISOString(),
          method: 'WORLDID'
        });
      }
    } else if (method === 'NONE') {
      // NONE method requires no verification fields
    }
    
    // Process the verification request using enterprise service
    const processedRequest = {
      ...req.body,
      method: method,
      reason: reason,
      force: force,
      dryRun: dryRun
    };
    
    const result = await selfEnterpriseEnhancedService.processVerificationRequest(processedRequest);
    
    if (!result.success) {
      return res.status(400).json({\n        success: false,
        error: result.error || 'Verification processing failed',
        timestamp: result.timestamp || new Date().toISOString(),
        method: method,
        dryRun: dryRun
      });
    }
    
    // Transform enterprise service response to match expected API format
    if (result.success && result.verified) {
      // Successful verification - return the expected format
      const response = {
        status: 'success',
        success: true,
        result: true,
        verificationToken: result.verificationToken,
        timestamp: result.timestamp,
        method: result.method || method,
        dryRun: dryRun,
        processingTime: result.processingTime || 'N/A'
      };
      
      if (result.credentialSubject) {
        response.credentialSubject = result.credentialSubject;
      }
      if (result.documentType) {
        response.documentType = result.documentType;
      }
      if (result.nullifierHash) {
        response.nullifierHash = result.nullifierHash;
      }
      if (result.merkleRoot) {
        response.merkleRoot = result.merkleRoot;
      }
      if (result.senderSessionToken) {
        response.senderSessionToken = result.senderSessionToken;
      }
      if (result.fallbackUsed) {
        response.fallbackUsed = result.fallbackUsed;
      }
      if (result.retryCount) {
        response.retryCount = result.retryCount;
      }
      
      res.json(response);
    } else {
      // Verification failed or not required - always include success flag for consistency
      res.json({\n        success: result.success,
        verified: result.verified,
        requireVerification: result.requireVerification,
        verificationToken: result.verificationToken,
        timestamp: result.timestamp || new Date().toISOString(),
        method: result.method || method,
        error: result.error || 'Verification not required or failed',
        dryRun: dryRun
      });
    }
  } catch (error) {
    logger.error('Failed to select verification method', { error, stack: error.stack });
    res.status(500).json({\n      success: false,
      error: `Failed to select verification method: ${error.message || 'Unknown error'}`,
      timestamp: new Date().toISOString(),
      method: req.body?.method || 'unknown'
    });
  }
};

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
