import express from 'express';
import { Request, Response, Router } from 'express';
import { selfVerificationService } from '../services/selfVerification.service';
import { selfEnterpriseEnhancedService } from '../services/selfEnterpriseEnhancedService';
import { logger } from '../utils/logger';
import { VerificationMethodSelectionRequest } from '../types/verification';
import { decideVerificationMethod, getFundingEntity } from '../services/verificationPolicy';
import { verifyWorldIdProof } from '../services/worldIdVerification.service';

/**
 * Returns the SERVER-DECIDED verification method for a funding context.
 *
 * The verification method is decided by the funding entity (server wallet in service
 * mode, sender wallet in personal mode) — NEVER by the user. Any client-supplied
 * `method` is ignored. Users cannot choose or override the method.
 */
export const selectVerificationMethod = async (req: Request, res: Response) => {
  try {
    const walletMode = req.body?.walletMode === 'personal' ? 'personal' : 'service';
    const ctx = {
      walletMode: walletMode as 'service' | 'personal',
      senderWallet: req.body?.senderWallet,
      serverWallet: req.body?.serverWallet || process.env.SERVER_WALLET_ADDRESS,
    };

    const method = decideVerificationMethod(ctx);

    if (req.body?.method && req.body.method !== method) {
      logger.info('Ignoring client-supplied verification method — method is server-decided', {
        clientMethod: req.body.method,
        serverMethod: method,
      });
    }

    return res.json({
      success: true,
      method,
      requireVerification: method !== 'NONE',
      fundingEntity: getFundingEntity(ctx) || null,
      clientChoiceIgnored: !!req.body?.method,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to resolve verification method', { error, stack: error.stack });
    res.status(500).json({
      success: false,
      error: `Failed to resolve verification method: ${error.message || 'Unknown error'}`,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Real World ID proof verification endpoint.
 * POST /api/verification/worldid/verify
 */
export const verifyWorldId = async (req: Request, res: Response) => {
  try {
    const { proof, signal, action } = req.body || {};
    const worldIdProof = proof || req.body;

    const result = await verifyWorldIdProof(worldIdProof, signal, action);

    if (!result.configured) {
      return res.status(503).json({
        success: false,
        configured: false,
        error: result.error || 'World ID verification is not configured on the server',
        timestamp: new Date().toISOString(),
      });
    }

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || 'World ID verification failed',
        alreadyUsed: result.alreadyUsed || false,
        code: result.code,
        timestamp: new Date().toISOString(),
      });
    }

    return res.json({
      success: true,
      verified: true,
      nullifierHash: result.nullifierHash,
      verificationLevel: result.verificationLevel,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('World ID verify endpoint error', { error, stack: error.stack });
    res.status(500).json({
      success: false,
      error: `World ID verification error: ${error.message || 'Unknown error'}`,
      timestamp: new Date().toISOString(),
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
    
    const headers = req.headers as Record<string, string>;

    // Prefer the exact raw bytes (captured in index.ts) so the Svix signature matches.
    const rawBody: Buffer = (req as any).rawBody instanceof Buffer
      ? (req as any).rawBody
      : Buffer.isBuffer(req.body)
        ? req.body
        : Buffer.from(JSON.stringify(req.body));

    const verificationResult = selfEnterpriseEnhancedService.verifySelfWebhook(
      rawBody,
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
