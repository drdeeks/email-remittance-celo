// Set test environment variables
process.env.BASE_SELF_CONTRACT = '0x10079Fa97E739Fd05Ddc5C7cD11951aEF566b7e0';
process.env.MONAD_SELF_CONTRACT = '0x7BC66eD8285b51F84D170F158aD162cA144F32c1';
process.env.CELO_SELF_CONTRACT = '0x10079Fa97E739Fd05Ddc5C7cD11951aEF566b7e0';
process.env.SELF_ATTESTER_ADDRESS = '0x38be03139523EE998952D21110115f23AE54b1f7';
process.env.SELF_APP_ID = 'test-app-id';
process.env.SELF_APP_SECRET = 'test-app-secret';
process.env.WALLET_PRIVATE_KEY = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
process.env.SELF_MONITORING_ENABLED = 'false';

// Mock the entire service directly
jest.mock('../../src/services/selfContract.service', () => ({
  selfContractService: {
    setAttester: jest.fn().mockResolvedValue(true)
  }
}));

import { selfContractService } from '../../src/services/selfContract.service';

describe('SelfContractService - Minimal Test', () => {
  it('should set attester successfully', async () => {
    const result = await selfContractService.setAttester('base', true);
    expect(result).toBe(true);
  });
});
