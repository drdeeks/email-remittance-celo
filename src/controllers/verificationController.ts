import express from 'express';
import { Request, Response, Router } from 'express';
import { selfVerificationService } from '../services/selfVerification.service';
import { selfEnterpriseEnhancedService } from '../services/selfEnterpriseEnhancedService';
import { logger } from '../utils/logger';
import { VerificationMethodSelectionRequest } from '../types/verification';

export const selectVerificationMethod = async (req: Request, res: Response) => {
  try {
    const dryRun = req.body.dryRun === true;
    
    const { method, reason, force } = req.body as VerificationMethodSelectionRequest;
    
    if (!method || !['NONE', 'SELF', 'WORLDID'].includes(method)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid verification method. Must be NONE, SELF, or WORLDID',
        timestamp: new Date().toISOString(),
        method: method || 'invalid'
      });
    }
    
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
    }
    
    const processedRequest = {
      ...req.body,
      method,
      reason,
      force,
      dryRun
    };
    
    const result = await selfEnterpriseEnhancedService.processVerificationRequest(processedRequest);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || 'Verification processing failed',
        timestamp: result.timestamp || new Date().toISOString(),
        method,
        dryRun
      });
    }
    
    if (result.success && result.verified) {
      const response: any = {
        status: 'success',
        success: true,
        result: true,
        verificationToken: result.verificationToken,
        timestamp: result.timestamp,
        method: result.method || method,
        dryRun,
        processingTime: result.processingTime || 'N/A'
      };
      
      if (result.credentialSubject) response.credentialSubject = result.credentialSubject;
      if (result.documentType) response.documentType = result.documentType;
      if (result.nullifierHash) response.nullifierHash = result.nullifierHash;
      if (result.merkleRoot) response.merkleRoot = result.merkleRoot;
      if (result.senderSessionToken) response.senderSessionToken = result.senderSessionToken;
      if (result.fallbackUsed) response.fallbackUsed = result.fallbackUsed;
      if (result.retryCount) response.retryCount = result.retryCount;
      if (result.verificationUrl) response.verificationUrl = result.verificationUrl;
      if (result.sessionId) response.sessionId = result.sessionId;
      
      res.json(response);
    } else {
      res.json({
        success: result.success,
        verified: result.verified,
        requireVerification: result.requireVerification,
        verificationToken: result.verificationToken,
        timestamp: result.timestamp || new Date().toISOString(),
        method: result.method || method,
        error: result.error || 'Verification not required or failed',
        dryRun,
        verificationUrl: result.verificationUrl,
        sessionId: result.sessionId
      });
    }
  } catch (error) {
    logger.error('Failed to select verification method', { error, stack: error.stack });
    res.status(500).json({
      success: false,
      error: `Failed to select verification method: ${error.message || 'Unknown error'}`,
      timestamp: new Date().toISOString(),
      method: req.body?.method || 'unknown'
    });
  }
};

export const selfEnterpriseWebhook = async (req: Request, res: Response) => {
  try {
    const webhookSecret = process.env.SELF_WEBHOOK_SECRET;
    if (!webhookSecret) {
      logger.error('SELF_WEBHOOK_SECRET not configured');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }
    
    const payload = req.body;
    const headers = req.headers as Record<string, string>;
    
    const verificationResult = selfEnterpriseEnhancedService.verifySelfWebhook(
      Buffer.from(JSON.stringify(payload)),
      headers,
      webhookSecret
    );
    
    if (!verificationResult.success) {
      logger.warn('Self webhook verification failed', { error: verificationResult.error });
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }
    
    const event = verificationResult.event;
    
    if (event.type === 'verification.completed') {
      const processResult = await selfEnterpriseEnhancedService.processSelfWebhookEvent(event);
      
      if (!processResult.success) {
        logger.error('Failed to process Self webhook event', { error: processResult.error });
        return res.status(400).json({ error: processResult.error });
      }
      
      logger.info('Self verification completed successfully', {
        verificationId: event.verification_id,
        externalUuid: event.external_uuid,
        status: event.status
      });
    }
    
    res.status(200).end();
  } catch (error) {
    logger.error('Self webhook handler error', { error, stack: error.stack });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

export const verifyIdentity = async (req: Request, res: Response) => {
  try {
    const result = await selfVerificationService.verifyIdentity(req.body);
    
    if (result.success && result.result === true && result.credentialSubject) {
      res.json({
        status: 'success',
        result: true,
        credentialSubject: result.credentialSubject,
        documentType: result.documentType,
        timestamp: result.timestamp
      });
    } else if (!result.success) {
      res.json({
        success: false,
        error: result.message || 'Verification failed',
        timestamp: result.timestamp
      });
    } else {
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
    res.json({ status: 'verified' });
  } catch (error) {
    logger.error('Failed to get verification status', { error });
    res.status(500).json({ error: 'Failed to get verification status' });
  }
};

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
verificationRoutes.post('/webhooks/self', express.raw({ type: 'application/json' }), selfEnterpriseWebhook);
