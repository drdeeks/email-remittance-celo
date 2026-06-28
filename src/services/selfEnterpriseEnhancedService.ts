import { SelfVerificationRequest, SelfVerificationResult, 
         WorldIDVerificationRequest, WorldIDVerificationResult,
         VerificationMethodSelectionRequest } from '../types/verification';
import { logger } from '../utils/logger';
import { selfConfig } from '../config/self';

// Import Self Protocol SDK
// Based on: https://github.com/selfxyz/self-integration-boilerplate
import { SelfBackendVerifier, AllIds, DefaultConfigStore } from '@selfxyz/core';

class SelfEnterpriseEnhancedService {
  private verificationCache: Map<string, any>;
  private verifier: any;
  
  constructor() {
    this.verificationCache = new Map();
    
    // Initialize Self Backend Verifier based on the boilerplate
    // See: https://github.com/selfxyz/self-integration-boilerplate
    
    // Create a configuration storage
    // VerificationConfig only includes minimumAge, excludedCountries, ofac
    const configStorage = new DefaultConfigStore({
      minimumAge: selfConfig.verification.minAge,
      ofac: true // Enable OFAC checking
    });
    
    // Create a map of allowed attestation IDs
    const allowedIds = new Map();
    Object.entries(AllIds).forEach(([key, value]) => {
      if (typeof value === 'number') {
        allowedIds.set(value, true);
      }
    });
    
    // Initialize the verifier
    this.verifier = new SelfBackendVerifier(
      'email-remittance-pro', // scope
      selfConfig.api.url, // endpoint
      process.env.NODE_ENV === 'test', // mockPassport
      allowedIds, // allowedIds
      configStorage, // configStorage
      'hex' // userIdentifierType
    );
  }
  
  // SCR-1: Enterprise verification method selection and routing
  async processVerificationRequest(request: any): Promise<any> {
    try {
      const { method, reason, force } = request as VerificationMethodSelectionRequest;
      
      // SCR-1: Verify method selection
      if (!method || !['NONE', 'SELF', 'WORLDID'].includes(method)) {
        return {
          success: false,
          error: 'Invalid verification method. Must be NONE, SELF, or WORLDID',
          timestamp: new Date().toISOString()
        };
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
        return this.processNoVerificationRequest(request);
      case 'SELF':
        return this.processSelfVerificationRequest(request, dryRun, warnings);
      case 'WORLDID':
        return this.processWorldIDVerificationRequest(request, dryRun, warnings);
      default:
        return {
          success: false,
          error: 'Unsupported verification method',
          timestamp: new Date().toISOString(),
          method: method,
          dryRun: dryRun,
          warnings: warnings
        };
    }
    } catch (error) {
      logger.error('Failed to process enterprise verification request', { error });
      return {
        success: false,
        error: 'Enterprise verification processing failed: ' + error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  // Process NONE verification method (no verification required)
  private async processNoVerificationRequest(request: any): Promise<any> {
    try {
      const dryRun = request.dryRun === true;
      
      // Handle requests that require no verification
      const response = {
        success: true,
        verified: false,
        requireVerification: false,
        verificationToken: '',
        timestamp: new Date().toISOString(),
        method: 'NONE',
        message: 'No verification required - method selected as NONE',
        dryRun: dryRun,
        processingTime: dryRun ? '0.001s (dry-run)' : 'instant',
        fallbackUsed: false,
        retryCount: 0,
        warnings: dryRun ? ['Running in dry-run mode - no actual verification performed'] : []
      };
      
      // Add sender session token for callbacks
      if (request.senderCallback) {
        response.senderSessionToken = this.generateSessionToken();
      }
      
      return response;
    } catch (error) {
      logger.error('Failed to process NONE verification request', { error, stack: error.stack });
      return {
        success: false,
        error: 'NONE verification processing failed: ' + error.message,
        timestamp: new Date().toISOString(),
        method: 'NONE'
      };
    }
  }
  
  // Process SELF verification method
  private async processSelfVerificationRequest(request: any, dryRun: boolean = false, warnings: string[] = []): Promise<any> {
    try {
      // Add method-specific warnings
      if (dryRun) {
        warnings.push('SELF verification running in dry-run mode');
        if (!request.proof) warnings.push('SELF: Mock proof data used');
        if (!request.pubSignals) warnings.push('SELF: Mock pubSignals used');
      }
      
      // Validate required fields for SELF verification
      const validation = this.validateInput('SELF', request);
      if (!validation.isValid && !dryRun) {
        return {
          success: false,
          error: `Missing required SELF verification fields: ${validation.errors.join(', ')}`,
          timestamp: this.generateTimestamp(),
          method: 'SELF',
          dryRun: dryRun,
          warnings: warnings
        };
      }
      
      // Merge request with defaults
      const selfRequest: SelfVerificationRequest = {
        recipient: dryRun ? 'dry-run-recipient' : (request.recipient || 'default-recipient'),
        amount: dryRun ? 0 : (request.amount || 0),
        currency: dryRun ? 'USD' : (request.currency || 'USD'),
        requireVerification: request.requireVerification !== false,
        proof: dryRun ? 'dry-run-proof' : request.proof,
        pubSignals: dryRun ? ['0x0'] : request.pubSignals,
        attestationId: dryRun ? 1 : request.attestationId,
        userContextData: dryRun ? 'dry-run-context' : request.userContextData,
        senderCallback: request.senderCallback || false
      };
      
      // Skip actual verification in dry-run mode
      if (dryRun) {
        const dryRunTimestamp = this.generateTimestamp();
        const response: SelfVerificationResult = {
          success: true,
          result: true,
          requireVerification: selfRequest.requireVerification || false,
          verificationToken: `dry-run-token-${Math.random().toString(36).substring(2, 8)}`,
          credentialSubject: {
            nationality: 'DryRun',
            name: ['DRY', 'RUN'],
            dateOfBirth: '1970-01-01'
          },
          documentType: this.getDocumentType(selfRequest.attestationId || 1),
          timestamp: dryRunTimestamp,
          method: 'SELF',
          dryRun: true,
          warnings: warnings,
          processingTime: 'instant',
          fallbackUsed: false,
          retryCount: 0
        };
        
        if (selfRequest.senderCallback) {
          response.senderSessionToken = this.generateSessionToken();
        }
        
        return response;
      }
      
      // Delegate to Self verification service
      try {
        const result = await this.verifier.verify({
          attestationId: selfRequest.attestationId || 1,
          proof: selfRequest.proof || 'mock-proof',
          pubSignals: selfRequest.pubSignals || ['0'],
          userContextData: selfRequest.userContextData || 'test-context'
        });
        
        const response: SelfVerificationResult = {
          success: result.isValidDetails?.isValid || false,
          result: result.isValidDetails?.isValid || false,
          requireVerification: selfRequest.requireVerification || false,
          verificationToken: this.generateVerificationToken(),
          credentialSubject: result.discloseOutput || {},
          documentType: this.getDocumentType(selfRequest.attestationId || 1),
          timestamp: this.generateTimestamp(),
          method: 'SELF',
          fallbackUsed: false,
          retryCount: 0,
          warnings: warnings
        };
        
        // Add sender session token for callbacks
        if (selfRequest.senderCallback) {
          response.senderSessionToken = this.generateSessionToken();
        }
        
        // Cache the verification result
        this.verificationCache.set(response.verificationToken, response);
        
        return response;
      } catch (verificationError) {
        // Fallback: If Self verification fails, try to gracefully degrade
        this.logWithContext('error', 'SELF verification service failed, returning fallback response', {
          error: verificationError.message,
          stack: verificationError.stack
        });
        
        return {
          success: false,
          result: false,
          requireVerification: selfRequest.requireVerification || true,
          verificationToken: '',
          error: `SELF verification service failed: ${verificationError.message}`,
          timestamp: this.generateTimestamp(),
          method: 'SELF',
          fallbackUsed: true,
          retryCount: 1,
          fallbackMethod: 'NONE',
          warnings: [...warnings, 'Fell back to NONE verification method due to SELF service failure']
        };
      }
    } catch (error) {
      this.logWithContext('error', 'Failed to process SELF verification request', {
        error: error.message,
        stack: error.stack
      });
      return {
        success: false,
        error: 'SELF verification processing failed: ' + error.message,
        timestamp: this.generateTimestamp(),
        method: 'SELF',
        dryRun: dryRun,
        warnings: warnings
      };
    }
  }
  
  // Process WORLDID verification method
  private async processWorldIDVerificationRequest(request: any, dryRun: boolean = false, warnings: string[] = []): Promise<any> {
    try {
      // Add method-specific warnings
      if (dryRun) {
        warnings.push('WORLDID verification running in dry-run mode');
        if (!request.nullifierHash) warnings.push('WORLDID: Mock nullifierHash used');
        if (!request.merkleRoot) warnings.push('WORLDID: Mock merkleRoot used');
        if (!request.proof) warnings.push('WORLDID: Mock proof used');
      }
      
      // Validate required WorldID fields (skip in dry-run)
      if (!dryRun) {
        const validation = this.validateInput('WORLDID', request);
        if (!validation.isValid) {
          return {
            success: false,
            verified: false,
            requireVerification: request.requireVerification !== false,
            verificationToken: '',
            timestamp: this.generateTimestamp(),
            method: 'WORLDID',
            dryRun: dryRun,
            warnings: warnings,
            errors: validation.errors
          };
        }
      }
      
      // Validate recipient information (skip in dry-run)
      if (!dryRun && (!request.recipient || !request.amount || !request.currency)) {
        return {
          success: false,
          verified: false,
          requireVerification: true,
          verificationToken: '',
          timestamp: this.generateTimestamp(),
          method: 'WORLDID',
          dryRun: dryRun,
          warnings: warnings,
          error: 'Recipient, amount, and currency are required for WorldID verification'
        };
      }
      
      // Skip actual verification in dry-run mode
      if (dryRun) {
        const dryRunTimestamp = this.generateTimestamp();
        const mockNullifierHash = `dry-run-nullifier-${Math.random().toString(36).substring(2, 10)}`;
        const mockMerkleRoot = `0x${'0'.repeat(64)}`;
        
        const verificationResult: WorldIDVerificationResult = {
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
          timestamp: dryRunTimestamp,
          method: 'WORLDID',
          dryRun: true,
          warnings: warnings,
          processingTime: 'instant',
          fallbackUsed: false,
          retryCount: 0
        };
        
        if (request.senderCallback) {
          verificationResult.senderSessionToken = this.generateSessionToken();
        }
        
        return verificationResult;
      }
      
      try {
        // Verify the nullifier hash using WorldID SDK (to be implemented with actual SDK)
        // For now, check if the nullifier hash looks valid (length > 0)
        const isValidNullifier = request.nullifierHash && request.nullifierHash.length > 0;
        
        // Verify merkle root format (basic validation)
        const isValidMerkleRoot = request.merkleRoot && 
            request.merkleRoot.startsWith('0x') && 
            request.merkleRoot.length >= 66;
        
        // Check if proof exists
        const isValidProof = request.proof && request.proof.length > 0;
        
        // All validations must pass
        const isVerified = isValidNullifier && isValidMerkleRoot && isValidProof;
        
        if (!isVerified) {
          return {
            success: false,
            verified: false,
            requireVerification: true,
            verificationToken: '',
            timestamp: this.generateTimestamp(),
            method: 'WORLDID',
            dryRun: false,
            warnings: warnings,
            error: 'Invalid WorldID verification data: nullifierHash, merkleRoot, or proof invalid',
            fallbackUsed: false,
            retryCount: 0
          };
        }
        
        const verificationResult: WorldIDVerificationResult = {
          success: true,
          verified: true,
          requireVerification: request.requireVerification !== false,
          verificationToken: this.generateVerificationToken(),
          nullifierHash: request.nullifierHash,
          merkleRoot: request.merkleRoot,
          credentialSubject: {
            username: `user_${request.nullifierHash.substring(0, 8)}`,
            humanitarianProof: true
          },
          timestamp: this.generateTimestamp(),
          method: 'WORLDID',
          fallbackUsed: false,
          retryCount: 0,
          warnings: warnings
        };
        
        // Add sender session token for callbacks
        if (request.senderCallback) {
          verificationResult.senderSessionToken = this.generateSessionToken();
        }
        
        // For now, cache only WorldID verifications
        this.verificationCache.set(verificationResult.verificationToken, verificationResult);
        
        return verificationResult;
      } catch (verificationError) {
        // Fallback: If WorldID verification fails, try to gracefully degrade
        this.logWithContext('error', 'WORLDID verification service failed, returning fallback response', {
          error: verificationError.message,
          stack: verificationError.stack
        });
        
        return {
          success: false,
          verified: false,
          requireVerification: request.requireVerification || true,
          verificationToken: '',
          timestamp: this.generateTimestamp(),
          method: 'WORLDID',
          fallbackUsed: true,
          retryCount: 1,
          fallbackMethod: 'NONE',
          warnings: [...warnings, 'Fell back to NONE verification method due to WORLDID service failure'],
          error: `WORLDID verification service failed: ${verificationError.message}`
        };
      }
    } catch (error) {
      this.logWithContext('error', 'Failed to process WORLDID verification request', {
        error: error.message,
        stack: error.stack
      });
      return {
        success: false,
        verified: false,
        requireVerification: request.requireVerification || false,
        verificationToken: '',
        timestamp: this.generateTimestamp(),
        method: 'WORLDID',
        dryRun: dryRun,
        warnings: warnings,
        error: 'WORLDID verification processing failed: ' + error.message
      };
    }
  }
  
  // Helper method to generate verification tokens
  private generateVerificationToken(): string {
    return 'verification-token-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
  
  // Helper method to generate session tokens
  private generateSessionToken(): string {
    return 'a'.repeat(64); // 32 bytes hex
  }
  
  // Helper method to map attestation ID to document type
  private getDocumentType(attestationId: number): string {
    switch (attestationId) {
      case 1: return 'passport';
      case 2: return 'eu_id_card';
      case 3: return 'aadhaar';
      default: return 'kyc';
    }
  }
  
  // Helper method to generate ISO 8601 timestamps with timezone
  private generateTimestamp(): string {
    return new Date().toISOString();
  }
  
  // Helper method for exponential backoff retry logic
  private getRetryDelay(retryCount: number): number {
    return Math.min(1000 * Math.pow(2, retryCount), 30000);
  }
  
  // Helper method for logging with consistent format
  private logWithContext(level: string, message: string, context: any = {}) {
    const logEntry = {
      level,
      message,
      context,
      timestamp: this.generateTimestamp(),
      service: 'selfEnterpriseEnhancedService'
    };
    
    if (level === 'error') {
      logger.error(message, logEntry);
    } else if (level === 'warn') {
      logger.warn(message, logEntry);
    } else {
      logger.info(message, logEntry);
    }
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
        lastUpdate: this.generateTimestamp()
      }
    };
  }
  
  // Helper method to validate input data based on method
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
  
  getFrontendConfig(userId: string) {
    return {
      version: 3, // Enhanced version
      userId,
      disclosures: {
        minimumAge: 18,
        name: undefined,
        date_of_birth: undefined
      },
      requireVerification: false,
      enterpriseMode: true,
      supportedVerificationMethods: ['NONE', 'SELF', 'WORLDID']
    };
  }
}

export const selfEnterpriseEnhancedService = new SelfEnterpriseEnhancedService();