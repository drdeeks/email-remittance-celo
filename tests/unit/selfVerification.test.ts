// Set test environment variables
process.env.BASE_SELF_CONTRACT = '0x10079Fa97E739Fd05Ddc5C7cD11951aEF566b7e0';
process.env.MONAD_SELF_CONTRACT = '0x7BC66eD8285b51F84D170F158aD162cA144F32c1';
process.env.CELO_SELF_CONTRACT = '0x10079Fa97E739Fd05Ddc5C7cD11951aEF566b7e0';
process.env.SELF_ATTESTER_ADDRESS = '0x38be03139523EE998952D21110115f23AE54b1f7';
process.env.SELF_APP_ID = 'test-app-id';
process.env.SELF_APP_SECRET = 'test-app-secret';

import { selfVerificationService } from '../../src/services/selfVerification.service';
import { logger } from '../../src/utils/logger';

// Mock the SelfAPI
jest.mock('../../src/services/selfApi', () => ({
  selfApi: {
    verifyIdentity: jest.fn()
  }
}));

describe('SelfVerificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear the cache before each test
    (selfVerificationService as any).clearCache();
    
    // Reset the mock to return success by default
    const { selfApi } = require('../../src/services/selfApi');
    selfApi.verifyIdentity.mockResolvedValue({
      success: true,
      proof: 'mock-proof',
      pubSignals: ['mock-signal'],
      userContextData: {}
    });
  });

describe('verifyIdentity', () => {
    it('should return success when verification is required and passes', async () => {
      // Add proof data to trigger verification
      const result = await selfVerificationService.verifyIdentity({
        recipient: 'test@example.com',
        amount: 150,
        currency: 'USD',
        requireVerification: true,
        proof: {},
        pubSignals: ['signal1', 'signal2'],
        attestationId: 1,
        userContextData: '0x1234'
      });
      
      expect(result.success).toBe(true);
      expect(result.requireVerification).toBe(true);
      expect(result.verificationToken).toBeDefined();
    });
    
    it('should return success when verification is not required', async () => {
      const result = await selfVerificationService.verifyIdentity({
        recipient: 'test@example.com',
        amount: 50,
        currency: 'USD'
      });
      
      expect(result.success).toBe(true);
      expect(result.requireVerification).toBe(false);
      expect(result.verificationToken).toBe('');
    });
    
    it('should return failure when verification fails', async () => {
      const { selfApi } = require('../../src/services/selfApi');
      selfApi.verifyIdentity.mockRejectedValueOnce(new Error('Verification failed'));
      
      const result = await selfVerificationService.verifyIdentity({
        recipient: 'test-fail@example.com',
        amount: 150,
        currency: 'USD',
        requireVerification: true,
        proof: {},
        pubSignals: ['signal1', 'signal2'],
        attestationId: 1,
        userContextData: '0x1234'
      });
      
      expect(result.success).toBe(false);
      expect(result.requireVerification).toBe(true);
    });
  });
});
