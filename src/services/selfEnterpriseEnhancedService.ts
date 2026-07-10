import { SelfVerificationRequest, SelfVerificationResult, 
         WorldIDVerificationRequest, WorldIDVerificationResult,
         VerificationMethodSelectionRequest } from '../types/verification';
import { logger } from '../utils/logger';
import { selfConfig } from '../config/self';
import { verifyWorldIdProof } from './worldIdVerification.service';

// Self Enterprise SDK - replaces legacy @selfxyz/core
// Migration guide: https://docs.self.xyz/self-enterprise/migration
// Note: @selfxyz/enterprise-sdk is optional - install for production use
let SelfClient: any = null;
let SelfWebhooks: any = null;
try {
  const enterpriseSdk = require('@selfxyz/enterprise-sdk');
  SelfClient = enterpriseSdk.SelfClient;
  SelfWebhooks = enterpriseSdk.SelfWebhooks;
} catch (e) {
  // SDK not installed - will run in mock mode
}

class SelfEnterpriseEnhancedService {
  private verificationCache: Map<string, any>;
  private selfClient: any = null;
  private isConfigured: boolean = false;
  
  constructor() {
    this.verificationCache = new Map();
    this.initializeSelfEnterpriseClient();
  }
  
  private initializeSelfEnterpriseClient(): void {
    try {
      if (!SelfClient) {
        logger.warn('Self Enterprise SDK not installed (@selfxyz/enterprise-sdk). SELF verification will run in mock mode.', {
          service: 'selfEnterpriseEnhancedService'
        });
        this.isConfigured = false;
        return;
      }
      
      const apiKey = selfConfig.enterprise.apiKey || process.env.SELF_API_KEY || process.env.SELF_ENTERPRISE_API_KEY;
      
      if (!apiKey) {
        logger.warn('Self Enterprise API key not configured. SELF verification will run in mock mode.', {
          service: 'selfEnterpriseEnhancedService',
          missing: ['SELF_API_KEY']
        });
        this.isConfigured = false;
        return;
      }
      
      this.selfClient = new SelfClient({ apiKey });
      this.isConfigured = true;
      
      logger.info('Self Enterprise SDK initialized successfully', {
        service: 'selfEnterpriseEnhancedService',
        hasApiKey: !!apiKey
      });
    } catch (error) {
      logger.error('Failed to initialize Self Enterprise SDK', {
        service: 'selfEnterpriseEnhancedService',
        error: error.message,
        stack: error.stack
      });
      this.isConfigured = false;
    }
  }
  
  // SCR-1: Enterprise verification method selection and routing
  async processVerificationRequest(request: any): Promise<any> {
    try {
      const { method, reason, force } = request as VerificationMethodSelectionRequest;
      
      // SCR-1: Verify method selection
      if (!method || !['NONE', 'SELF', 'WORLDID'].includes(method)) {
        return this.createErrorResponse('Invalid verification method. Must be NONE, SELF, or WORLDID', method || 'invalid');
      }
      
      // Dry run mode for development/testing
      const dryRun = request.dryRun === true;
      const warnings: string[] = [];
      
      if (dryRun) {
        warnings.push('Running in dry-run mode - no actual verification performed');
        if (!request.proof) warnings.push('Mock proof data used for dry-run');
        if (!request.nullifierHash) warnings.push('Mock nullifier hash used for dry-run');
      }
      
      // Route based on selected method
      switch (method) {
        case 'NONE':
          return this.processNoVerificationRequest(request, dryRun, warnings);
        case 'SELF':
          return this.processSelfVerificationRequest(request, dryRun, warnings);
        case 'WORLDID':
          return this.processWorldIDVerificationRequest(request, dryRun, warnings);
        default:
          return this.createErrorResponse('Unsupported verification method', method, dryRun, warnings);
      }
    } catch (error) {
      this.logError('Failed to process enterprise verification request', error);
      return this.createErrorResponse(`Enterprise verification processing failed: ${error.message}`);
    }
  }
  
  // Create a SELF Enterprise verification session
  async createSelfVerificationSession(userId: string, flowId?: string): Promise<{ 
    success: boolean; 
    verificationUrl?: string; 
    sessionId?: string;
    error?: string;
  }> {
    try {
      if (!this.isConfigured || !this.selfClient) {
        return { 
          success: false, 
          error: 'Self Enterprise SDK not configured. Set SELF_API_KEY environment variable.' 
        };
      }
      
      const targetFlowId = flowId || process.env.SELF_FLOW_ID;
      if (!targetFlowId) {
        return { 
          success: false, 
          error: 'Self flow ID not configured. Set SELF_FLOW_ID environment variable.' 
        };
      }
      
      const session = await this.selfClient.sessions.create({
        flowId: targetFlowId,
        externalUuid: userId,
      });
      
      return {
        success: true,
        verificationUrl: session.verificationUrl,
        sessionId: session.id
      };
    } catch (error) {
      this.logError('Failed to create Self verification session', error);
      return { success: false, error: `Session creation failed: ${error.message}` };
    }
  }
  
  // Verify Self Enterprise webhook
  verifySelfWebhook(payload: Buffer, headers: Record<string, string>, secret: string): any {
    try {
      if (!SelfWebhooks) {
        return { 
          success: false, 
          error: 'Self Enterprise SDK not installed. Install @selfxyz/enterprise-sdk for webhook verification.' 
        };
      }
      const event = SelfWebhooks.verify(payload, headers, secret);
      return { success: true, event };
    } catch (error) {
      this.logError('Self webhook verification failed', error);
      return { success: false, error: `Webhook verification failed: ${error.message}` };
    }
  }
  
  // Process Self webhook event
  async processSelfWebhookEvent(event: any): Promise<{ success: boolean; result?: any; error?: string }> {
    try {
      if (event.type !== 'verification.completed') {
        return { success: true, result: { message: `Ignored event type: ${event.type}` } };
      }
      
      if (event.status !== 'valid') {
        return { 
          success: false, 
          error: `Verification failed: ${event.status}`,
          result: { verificationId: event.verification_id, status: event.status }
        };
      }
      
      const result = {
        success: true,
        verified: true,
        verificationId: event.verification_id,
        externalUuid: event.external_uuid,
        proofAttributes: event.proof_attributes,
        timestamp: new Date().toISOString(),
        method: 'SELF',
        fallbackUsed: false
      };
      
      // Cache the successful verification
      if (event.verification_id) {
        this.verificationCache.set(event.verification_id, result);
      }
      
      return { success: true, result };
    } catch (error) {
      this.logError('Failed to process Self webhook event', error);
      return { success: false, error: `Webhook processing failed: ${error.message}` };
    }
  }

  // Look up a previously-verified Self session (by verification id / token) cached from webhooks.
  // Returns the cached verification result if it exists and was verified, otherwise null.
  getVerifiedSession(idOrToken: string): any | null {
    if (!idOrToken) return null;
    const cached = this.verificationCache.get(idOrToken);
    if (cached && cached.verified === true) {
      return cached;
    }
    return null;
  }
  
  // Process NONE verification method (no verification required)
  private async processNoVerificationRequest(request: any, dryRun: boolean, warnings: string[]): Promise<any> {
    try {
      const response: any = {
        success: true,
        verified: false,
        requireVerification: false,
        verificationToken: '',
        timestamp: this.generateTimestamp(),
        method: 'NONE',
        message: 'No verification required - method selected as NONE',
        dryRun,
        processingTime: dryRun ? '0.001s (dry-run)' : 'instant',
        fallbackUsed: false,
        retryCount: 0,
        warnings: dryRun ? ['Running in dry-run mode - no actual verification performed'] : warnings,
        senderSessionToken: request.senderCallback ? this.generateSessionToken() : undefined
      };
      
      return response;
    } catch (error) {
      this.logError('Failed to process NONE verification request', error);
      return this.createErrorResponse(`NONE verification processing failed: ${error.message}`, 'NONE');
    }
  }
  
  // Process SELF verification method using Enterprise SDK
  private async processSelfVerificationRequest(request: any, dryRun: boolean, warnings: string[]): Promise<any> {
    try {
      if (dryRun) {
        warnings.push('SELF verification running in dry-run mode');
        if (!request.proof) warnings.push('SELF: Mock proof data used');
      }
      
      const validation = this.validateInput('SELF', request);
      if (!validation.isValid && !dryRun) {
        return this.createErrorResponse(`Missing required SELF verification fields: ${validation.errors.join(', ')}`, 'SELF', dryRun, warnings);
      }
      
      // For dry-run, return mock success
      if (dryRun) {
        return this.createDryRunSelfResponse(request, warnings);
      }
      
      // Check if Self Enterprise is configured
      if (!this.isConfigured || !this.selfClient) {
        return this.createErrorResponse('Self Enterprise SDK not configured. Set SELF_API_KEY and SELF_FLOW_ID.', 'SELF', dryRun, warnings);
      }
      
      // Create verification session instead of inline verification
      // The frontend will redirect to the verification URL
      const userId = request.userId || request.externalUuid || `user_${Date.now()}`;
      const sessionResult = await this.createSelfVerificationSession(userId);
      
      if (!sessionResult.success) {
        return this.createErrorResponse(sessionResult.error || 'Failed to create verification session', 'SELF', dryRun, warnings);
      }
      
      return {
        success: true,
        verified: false, // Will be true after webhook callback
        requireVerification: true,
        verificationToken: sessionResult.sessionId,
        verificationUrl: sessionResult.verificationUrl,
        timestamp: this.generateTimestamp(),
        method: 'SELF',
        message: 'Verification session created. Redirect user to verificationUrl.',
        sessionId: sessionResult.sessionId,
        fallbackUsed: false,
        retryCount: 0,
        warnings: warnings
      };
    } catch (error) {
      this.logError('Failed to process SELF verification request', error);
      return this.createErrorResponse(`SELF verification processing failed: ${error.message}`, 'SELF', dryRun, warnings);
    }
  }
  
  private createDryRunSelfResponse(request: any, warnings: string[]): any {
    const timestamp = this.generateTimestamp();
    return {
      success: true,
      result: true,
      requireVerification: request.requireVerification !== false,
      verificationToken: `dry-run-token-${Math.random().toString(36).substring(2, 8)}`,
      credentialSubject: {
        nationality: 'DryRun',
        name: ['DRY', 'RUN'],
        dateOfBirth: '1970-01-01'
      },
      documentType: this.getDocumentType(request.attestationId || 1),
      timestamp,
      method: 'SELF',
      dryRun: true,
      warnings: warnings,
      processingTime: 'instant',
      fallbackUsed: false,
      retryCount: 0,
      senderSessionToken: request.senderCallback ? this.generateSessionToken() : undefined
    };
  }
  
  // Process WORLDID verification method
  private async processWorldIDVerificationRequest(request: any, dryRun: boolean, warnings: string[]): Promise<any> {
    try {
      if (dryRun) {
        warnings.push('WORLDID verification running in dry-run mode');
        if (!request.nullifierHash) warnings.push('WORLDID: Mock nullifierHash used');
        if (!request.merkleRoot) warnings.push('WORLDID: Mock merkleRoot used');
        if (!request.proof) warnings.push('WORLDID: Mock proof used');
      }
      
      if (!dryRun) {
        const validation = this.validateInput('WORLDID', request);
        if (!validation.isValid) {
          return this.createErrorResponse(validation.errors.join(', '), 'WORLDID', dryRun, warnings, validation.errors);
        }
      }
      
      if (!dryRun && (!request.recipient || !request.amount || !request.currency)) {
        return this.createErrorResponse('Recipient, amount, and currency are required for WorldID verification', 'WORLDID', dryRun, warnings);
      }
      
      if (dryRun) {
        return this.createDryRunWorldIdResponse(request, warnings);
      }
      
      // Real World ID verification against the Worldcoin Developer Portal verify endpoint.
      const worldIdResult = await verifyWorldIdProof(
        {
          nullifier_hash: request.nullifierHash,
          merkle_root: request.merkleRoot,
          proof: request.proof,
          verification_level: request.verificationLevel,
          action: request.action,
        },
        request.signal || request.recipient,
        request.action
      );

      if (!worldIdResult.configured) {
        return this.createErrorResponse(
          'World ID verification is not configured on the server (set WORLDID_APP_ID and WORLDID_APP_SECRET)',
          'WORLDID',
          false,
          warnings
        );
      }

      if (!worldIdResult.success) {
        return this.createErrorResponse(
          worldIdResult.error || 'World ID verification failed',
          'WORLDID',
          false,
          warnings
        );
      }

      const verifiedNullifier = worldIdResult.nullifierHash || request.nullifierHash;

      const verificationResult: WorldIDVerificationResult = {
        success: true,
        verified: true,
        requireVerification: request.requireVerification !== false,
        verificationToken: this.generateVerificationToken(),
        nullifierHash: verifiedNullifier,
        merkleRoot: request.merkleRoot,
        credentialSubject: {
          username: `user_${(verifiedNullifier || '').substring(0, 8)}`,
          humanitarianProof: true
        },
        timestamp: this.generateTimestamp(),
        method: 'WORLDID',
        fallbackUsed: false,
        retryCount: 0,
        warnings: warnings
      };
      
      if (request.senderCallback) {
        verificationResult.senderSessionToken = this.generateSessionToken();
      }
      
      this.verificationCache.set(verificationResult.verificationToken, verificationResult);
      return verificationResult;
    } catch (error) {
      this.logError('Failed to process WORLDID verification request', error);
      return this.createErrorResponse(`WORLDID verification processing failed: ${error.message}`, 'WORLDID', dryRun, warnings);
    }
  }
  
  private createDryRunWorldIdResponse(request: any, warnings: string[]): any {
    const timestamp = this.generateTimestamp();
    const mockNullifierHash = `dry-run-nullifier-${Math.random().toString(36).substring(2, 10)}`;
    const mockMerkleRoot = `0x${'0'.repeat(64)}`;
    
    return {
      success: true,
      verified: true,
      requireVerification: request.requireVerification !== false,
      verificationToken: `dry-run-token-${Math.random().toString(36).substring(2, 8)}`,
      nullifierHash: mockNullifierHash,
      merkleRoot: mockMerkleRoot,
      credentialSubject: {
        username: `user_${mockNullifierHash.substring(0, 8)}`,
        humanitarianProof: true
      },
      timestamp,
      method: 'WORLDID',
      dryRun: true,
      warnings: warnings,
      processingTime: 'instant',
      fallbackUsed: false,
      retryCount: 0,
      senderSessionToken: request.senderCallback ? this.generateSessionToken() : undefined
    };
  }
  
  // Helper methods
  private generateVerificationToken(): string {
    return `verification-token-${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
  }
  
  private generateSessionToken(): string {
    return 'a'.repeat(64);
  }
  
  private getDocumentType(attestationId: number): string {
    switch (attestationId) {
      case 1: return 'passport';
      case 2: return 'eu_id_card';
      case 3: return 'aadhaar';
      default: return 'kyc';
    }
  }
  
  private generateTimestamp(): string {
    return new Date().toISOString();
  }
  
  private getRetryDelay(retryCount: number): number {
    return Math.min(1000 * Math.pow(2, retryCount), 30000);
  }
  
  private logWithContext(level: string, message: string, context: any = {}) {
    const logEntry = {
      level,
      message,
      context: { ...context, timestamp: this.generateTimestamp(), service: 'selfEnterpriseEnhancedService' }
    };
    
    if (level === 'error') logger.error(message, logEntry);
    else if (level === 'warn') logger.warn(message, logEntry);
    else logger.info(message, logEntry);
  }
  
  private logError(message: string, error: any) {
    this.logWithContext('error', message, { error: error.message, stack: error.stack });
  }
  
  private createErrorResponse(error: string, method?: string, dryRun?: boolean, warnings?: string[], errors?: string[]): any {
    return {
      success: false,
      error,
      timestamp: this.generateTimestamp(),
      method: method || 'unknown',
      dryRun: dryRun || false,
      warnings: warnings || [],
      errors: errors || []
    };
  }
  
  private validateInput(method: string, request: any): { isValid: boolean, errors: string[] } {
    const errors: string[] = [];
    
    if (method === 'SELF') {
      if (!request.recipient) errors.push('recipient is required');
      if (!request.amount) errors.push('amount is required');
      if (!request.currency) errors.push('currency is required');
      if (!request.proof) errors.push('proof is required');
      if (!request.pubSignals) errors.push('pubSignals is required');
      if (!request.attestationId) errors.push('attestationId is required');
      if (!request.userContextData) errors.push('userContextData is required');
    } else if (method === 'WORLDID') {
      if (!request.recipient) errors.push('recipient is required');
      if (!request.amount) errors.push('amount is required');
      if (!request.currency) errors.push('currency is required');
      if (!request.nullifierHash) errors.push('nullifierHash is required');
      if (!request.merkleRoot) errors.push('merkleRoot is required');
      if (!request.proof) errors.push('proof is required');
    }
    
    return { isValid: errors.length === 0, errors };
  }
  
  getStatus() {
    return {
      enterpriseEnhanced: {
        configured: true,
        verificationEnabled: true,
        highValueThreshold: selfConfig.verification.highValueThreshold,
        monitoringEnabled: selfConfig.monitoring.enabled,
        supportedMethods: ['NONE', 'SELF', 'WORLDID'],
        fallbackEnabled: true,
        dryRunSupported: process.env.NODE_ENV === 'development',
        selfEnterpriseConfigured: this.isConfigured,
        lastUpdate: this.generateTimestamp()
      }
    };
  }
  
  getFrontendConfig(userId: string) {
    return {
      version: 4, // Enterprise version
      userId,
      disclosures: {
        minimumAge: 18,
        name: undefined,
        date_of_birth: undefined
      },
      requireVerification: false,
      enterpriseMode: true,
      supportedVerificationMethods: ['NONE', 'SELF', 'WORLDID'],
      selfEnterprise: {
        configured: this.isConfigured,
        flowId: process.env.SELF_FLOW_ID || 'not-configured'
      }
    };
  }
}

export const selfEnterpriseEnhancedService = new SelfEnterpriseEnhancedService();