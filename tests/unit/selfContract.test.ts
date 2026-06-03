// Set test environment variables
process.env.BASE_SELF_CONTRACT = '0x10079Fa97E739Fd05Ddc5C7cD11951aEF566b7e0';
process.env.MONAD_SELF_CONTRACT = '0x7BC66eD8285b51F84D170F158aD162cA144F32c1';
process.env.CELO_SELF_CONTRACT = '0x10079Fa97E739Fd05Ddc5C7cD11951aEF566b7e0';
process.env.SELF_ATTESTER_ADDRESS = '0x38be03139523EE998952D21110115f23AE54b1f7';
process.env.SELF_APP_ID = 'test-app-id';
process.env.SELF_APP_SECRET = 'test-app-secret';
process.env.WALLET_PRIVATE_KEY = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
process.env.SELF_MONITORING_ENABLED = 'false';

import { selfContractService } from '../../src/services/selfContract.service';

// Mock ethers
jest.mock('ethers', () => ({
  ...jest.requireActual('ethers'),
  Contract: jest.fn()
}));

// Mock chain service
jest.mock('../../src/services/celoService', () => ({
  chainService: {
    getClients: jest.fn().mockReturnValue({
      walletClient: {}
    })
  }
}));

// Mock rollback
jest.mock('../../src/utils/rollback', () => ({
  rollback: {
    executeWithRollback: jest.fn().mockImplementation(async (fn) => await fn())
  }
}));

// Mock monitoring
jest.mock('../../src/utils/monitoring', () => ({
  monitoring: {
    incrementMetric: jest.fn(),
    recordMetric: jest.fn(),
    triggerAlert: jest.fn(),
    getMetrics: jest.fn().mockReturnValue({}),
    registerMetric: jest.fn(),
  }
}));

describe('SelfContractService', () => {
  let mockContract: any;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock contract
    mockContract = {
      setAttester: jest.fn().mockResolvedValue({
        wait: jest.fn().mockResolvedValue({ hash: '0x123' })
      }),
      attestIdentity: jest.fn(),
      verifyIdentity: jest.fn(),
      isMinimumAgeValid: jest.fn(),
      isOfacValid: jest.fn(),
      getFeeBps: jest.fn(),
      registerVerificationConfig: jest.fn(),
    };
    
    // Set the mock contract
    require('ethers').Contract.mockReturnValue(mockContract);
    
    // Directly modify the service instance
    (selfContractService as any).contracts = {
      base: mockContract,
      monad: mockContract,
      celo: mockContract
    };
  });

describe('setAttester', () => {
    it('should set attester successfully', async () => {
      const result = await selfContractService.setAttester('base', true);
      expect(result).toBe(true);
      expect(mockContract.setAttester).toHaveBeenCalled();
    });
    
    it('should return false when contract call fails', async () => {
      mockContract.setAttester.mockRejectedValue(new Error('Contract call failed'));
      const result = await selfContractService.setAttester('base', true);
      expect(result).toBe(false);
    });
  });
});
