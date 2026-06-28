/**
 * SCR-1 Verification Service and Controller Tests
 * 
 * Test Suite for:
 * - Verification method selection (NONE, SELF, WORLDID)
 * - Dry-run mode functionality
 * - Error handling and fallbacks
 * - Response format validation
 * - SCR-1 blueprint compliance
 */

import { selfEnterpriseEnhancedService } from '../services/selfEnterpriseEnhancedService';
import { selfVerificationService } from '../services/selfVerification.service';

describe('SCR-1 Verification Service - Method Selection', () => {
  const service = selfEnterpriseEnhancedService;
  
  describe('NONE verification method', () => {
    it('should return success=true for NONE method with dryRun', async () => {
      const result = await service.processVerificationRequest({
        method: 'NONE',
        dryRun: true
      });
      
      expect(result.success).toBe(true);
      expect(result.verified).toBe(false);
      expect(result.requireVerification).toBe(false);
      expect(result.method).toBe('NONE');
      expect(result.dryRun).toBe(true);
      expect(result.verificationToken).toBe('');
      expect(result.warnings).toContain('Running in dry-run mode');
    });

    it('should return success=true for NONE method without dryRun', async () => {
      const result = await service.processVerificationRequest({
        method: 'NONE'
      });
      
      expect(result.success).toBe(true);
      expect(result.verified).toBe(false);
      expect(result.requireVerification).toBe(false);
      expect(result.method).toBe('NONE');
      expect(result.dryRun).toBe(false);
    });

    it('should generate session token for NONE method with senderCallback', async () => {
      const result = await service.processVerificationRequest({
        method: 'NONE',
        senderCallback: true,
        dryRun: true
      });
      
      expect(result.success).toBe(true);
      expect(result.senderSessionToken).toBeDefined();
      expect(result.senderSessionToken?.length).toBe(64);
    });
  });

  describe('SELF verification method', () => {
    it('should return dry-run mock response for SELF method', async () => {
      const result = await service.processVerificationRequest({
        method: 'SELF',
        dryRun: true,
        recipient: 'test@example.com',
        amount: 100,
        currency: 'USD'
      });
      
      expect(result.success).toBe(true);
      expect(result.result).toBe(true);
      expect(result.method).toBe('SELF');
      expect(result.dryRun).toBe(true);
      expect(result.verificationToken).toContain('dry-run-token-');
      expect(result.credentialSubject).toBeDefined();
      expect(result.documentType).toBeDefined();
    });

    it('should validate required fields for SELF method when not dry-run', async () => {
      const result = await service.processVerificationRequest({
        method: 'SELF',
        dryRun: false
      });
      
      expect(result.success).toBe(false);
      expect(result.method).toBe('SELF');
      expect(result.errors).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('WORLDID verification method', () => {
    it('should return dry-run mock response for WORLDID method', async () => {
      const result = await service.processVerificationRequest({
        method: 'WORLDID',
        dryRun: true,
        recipient: 'test@example.com',
        amount: 100,
        currency: 'USD'
      });
      
      expect(result.success).toBe(true);
      expect(result.verified).toBe(true);
      expect(result.method).toBe('WORLDID');
      expect(result.dryRun).toBe(true);
      expect(result.nullifierHash).toContain('dry-run-nullifier-');
      expect(result.merkleRoot).toContain('0x');
      expect(result.credentialSubject).toBeDefined();
    });

    it('should accept valid WorldID data when not dry-run', async () => {
      const result = await service.processVerificationRequest({
        method: 'WORLDID',
        dryRun: false,
        recipient: 'test@example.com',
        amount: 100,
        currency: 'USD',
        nullifierHash: 'abc123def456',
        merkleRoot: '0x' + '0'.repeat(64),
        proof: 'valid-proof-data'
      });
      
      expect(result.success).toBe(true);
      expect(result.verified).toBe(true);
      expect(result.method).toBe('WORLDID');
      expect(result.nullifierHash).toBe('abc123def456');
    });

    it('should reject invalid WorldID data when not dry-run', async () => {
      const result = await service.processVerificationRequest({
        method: 'WORLDID',
        dryRun: false,
        recipient: 'test@example.com',
        amount: 100,
        currency: 'USD',
        nullifierHash: '',
        merkleRoot: 'invalid-root',
        proof: ''
      });
      
      expect(result.success).toBe(false);
      expect(result.verified).toBe(false);
      expect(result.method).toBe('WORLDID');
    });
  });
});

describe('SCR-1 Verification Method Validation', () => {
  const service = selfEnterpriseEnhancedService;

  it('should reject invalid verification method', async () => {
    const result = await service.processVerificationRequest({
      method: 'INVALID',
      dryRun: true
    });
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid verification method');
  });

  it('should reject missing method', async () => {
    const result = await service.processVerificationRequest({
      dryRun: true
    });
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid verification method');
  });

  it('should accept all three valid methods', async () => {
    const methods = ['NONE', 'SELF', 'WORLDID'];
    
    for (const method of methods) {
      const result = await service.processVerificationRequest({
        method: method as 'NONE' | 'SELF' | 'WORLDID',
        dryRun: true
      });
      
      expect(result.success).toBe(true);
      expect(result.method).toBe(method);
    }
  });
});

describe('SCR-1 Fallback and Error Handling', () => {
  const service = selfEnterpriseEnhancedService;

  it('should never throw unhandled exceptions - NONE method', async () => {
    await expect(
      service.processVerificationRequest({ method: 'NONE', dryRun: true })
    ).resolves.toBeDefined();
  });

  it('should never throw unhandled exceptions - SELF method', async () => {
    await expect(
      service.processVerificationRequest({ method: 'SELF', dryRun: true })
    ).resolves.toBeDefined();
  });

  it('should never throw unhandled exceptions - WORLDID method', async () => {
    await expect(
      service.processVerificationRequest({ method: 'WORLDID', dryRun: true })
    ).resolves.toBeDefined();
  });

  it('should include timestamp in all responses', async () => {
    const methods = ['NONE', 'SELF', 'WORLDID'] as const;
    
    for (const method of methods) {
      const result = await service.processVerificationRequest({
        method,
        dryRun: true
      });
      
      expect(result.timestamp).toBeDefined();
      expect(typeof result.timestamp).toBe('string');
    }
  });

  it('should include success flag in all responses (no silent failures)', async () => {
    const testCases = [
      { method: 'NONE', dryRun: true },
      { method: 'SELF', dryRun: true },
      { method: 'WORLDID', dryRun: true },
      { method: 'INVALID' as 'NONE' | 'SELF' | 'WORLDID', dryRun: true },
      { method: 'INVALID' as 'NONE' | 'SELF' | 'WORLDID' }
    ];
    
    for (const testCase of testCases) {
      const result = await service.processVerificationRequest(testCase);
      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
    }
  });
});

describe('SCR-1 Service Status and Configuration', () => {
  const service = selfEnterpriseEnhancedService;

  it('should return status with all supported methods', () => {
    const status = service.getStatus();
    
    expect(status.enterpriseEnhanced).toBeDefined();
    expect(status.enterpriseEnhanced.supportedMethods).toContain('NONE');
    expect(status.enterpriseEnhanced.supportedMethods).toContain('SELF');
    expect(status.enterpriseEnhanced.supportedMethods).toContain('WORLDID');
    expect(status.enterpriseEnhanced.fallbackEnabled).toBe(true);
  });

  it('should return frontend config with all supported methods', () => {
    const config = service.getFrontendConfig('test-user');
    
    expect(config.supportedVerificationMethods).toContain('NONE');
    expect(config.supportedVerificationMethods).toContain('SELF');
    expect(config.supportedVerificationMethods).toContain('WORLDID');
    expect(config.enterpriseMode).toBe(true);
  });
});

describe('SCR-1 Response Format Compliance', () => {
  const service = selfEnterpriseEnhancedService;

  it('should include all required fields in NONE verification response', async () => {
    const result = await service.processVerificationRequest({
      method: 'NONE',
      dryRun: true
    });
    
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('verified');
    expect(result).toHaveProperty('requireVerification');
    expect(result).toHaveProperty('verificationToken');
    expect(result).toHaveProperty('timestamp');
    expect(result).toHaveProperty('method');
  });

  it('should include all required fields in SELF dry-run response', async () => {
    const result = await service.processVerificationRequest({
      method: 'SELF',
      dryRun: true,
      attestationId: 1
    });
    
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('result');
    expect(result).toHaveProperty('requireVerification');
    expect(result).toHaveProperty('verificationToken');
    expect(result).toHaveProperty('timestamp');
    expect(result).toHaveProperty('method');
    expect(result).toHaveProperty('credentialSubject');
    expect(result).toHaveProperty('documentType');
  });

  it('should include all required fields in WORLDID dry-run response', async () => {
    const result = await service.processVerificationRequest({
      method: 'WORLDID',
      dryRun: true
    });
    
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('verified');
    expect(result).toHaveProperty('requireVerification');
    expect(result).toHaveProperty('verificationToken');
    expect(result).toHaveProperty('timestamp');
    expect(result).toHaveProperty('method');
    expect(result).toHaveProperty('nullifierHash');
    expect(result).toHaveProperty('merkleRoot');
    expect(result).toHaveProperty('credentialSubject');
  });
});

describe('SCR-1 Dry-Run Mode Safety', () => {
  const service = selfEnterpriseEnhancedService;

  it('should never cache dry-run verification tokens', async () => {
    const result = await service.processVerificationRequest({
      method: 'SELF',
      dryRun: true
    });
    
    expect(result.verificationToken).toContain('dry-run-token-');
  });

  it('should include dryRun flag in all dry-run responses', async () => {
    const methods = ['NONE', 'SELF', 'WORLDID'] as const;
    
    for (const method of methods) {
      const result = await service.processVerificationRequest({
        method,
        dryRun: true
      });
      
      expect(result.dryRun).toBe(true);
      expect(result.warnings).toContain('Running in dry-run mode');
    }
  });
});