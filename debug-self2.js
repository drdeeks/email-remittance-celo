// Debug script to test self verification service with proper test env
process.env.NODE_ENV = 'test';
process.env.BASE_SELF_CONTRACT = '0x10079Fa97E739Fd05Ddc5C7cD11951aEF566b7e0';
process.env.MONAD_SELF_CONTRACT = '0x7BC66eD8285b51F84D170F158aD162cA144F32c1';
process.env.CELO_SELF_CONTRACT = '0x10079Fa97E739Fd05Ddc5C7cD11951aEF566b7e0';
process.env.SELF_ATTESTER_ADDRESS = '0x38be03139523EE998952D21110115f23AE54b1f7';
process.env.SELF_APP_ID = 'test-app-id';
process.env.SELF_APP_SECRET = 'test-app-secret';

// Mock the selfApi
jest.mock('../../src/services/selfApi', () => ({
  selfApi: {
    verifyIdentity: jest.fn()
  }
}));
// Actually require the module after mocking
const { selfVerificationService } = require('../../src/services/selfVerification.service');
const { selfApi } = require('../../src/services/selfApi');

async function test() {
  console.log('Testing high value verification (amount: 150)...');
  
  // Reset and set up the mock
  selfApi.verifyIdentity.mockReset();
  selfApi.verifyIdentity.mockResolvedValue({
    success: true,
    proof: 'mock-proof',
    pubSignals: ['mock-signal'],
    userContextData: {}
  });
  
  try {
    const result = await selfVerificationService.verifyIdentity({
      recipient: 'test@example.com',
      amount: 150,
      currency: 'USD'
    });
    console.log('High value result:', JSON.stringify(result, null, 2));
    console.log('Mock called:', selfApi.verifyIdentity.mock.calls.length, 'times');
    if (selfApi.verifyIdentity.mock.calls.length > 0) {
      console.log('Mock called with:', selfApi.verifyIdentity.mock.calls[0]);
    }
  } catch (error) {
    console.error('High value error:', error);
  }
  
  // Clear mock
  selfApi.verifyIdentity.mockReset();
  
  console.log('\nTesting low value verification (amount: 50)...');
  try {
    const result = await selfVerificationService.verifyIdentity({
      recipient: 'test@example.com',
      amount: 50,
      currency: 'USD'
    });
    console.log('Low value result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Low value error:', error);
  }
  
  // Test failure case
  console.log('\nTesting failure case (amount: 150)...');
  selfApi.verifyIdentity.mockReset();
  selfApi.verifyIdentity.mockRejectedValueOnce(new Error('Verification failed'));
  
  try {
    const result = await selfVerificationService.verifyIdentity({
      recipient: 'test-fail@example.com',
      amount: 150,
      currency: 'USD'
    });
    console.log('Failure case result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Failure case error:', error);
  }
}

// Since we're not in Jest context, we need to mock differently
// Let's just require the modules directly and manually mock
process.env.NODE_ENV = 'test';
process.env.BASE_SELF_CONTRACT = '0x10079Fa97E739Fd05Ddc5C7cD11951aEF566b7e0';
process.env.MONAD_SELF_CONTRACT = '0x7BC66eD8285b51F84D170F158aD162cA144F32c1';
process.env.CELO_SELF_CONTRACT = '0x10079Fa97E739Fd05Ddc5C7cD11951aEF566b7e0';
process.env.SELF_ATTESTER_ADDRESS = '0x38be03139523EE998952D21110115f23AE54b1f7';
process.env.SELF_APP_ID = 'test-app-id';
process.env.SELF_APP_SECRET = 'test-app-secret';

// Manual mock
const originalSelfApi = {};

// Store original require cache
const moduleCache = {};

function mockRequire(modulePath) {
  if (modulePath === '../../src/services/selfApi') {
    return {
      selfApi: {
        verifyIdentity: jest.fn()
      }
    };
  }
  // For all other modules, return the actual module
  if (!moduleCache[modulePath]) {
    moduleCache[modulePath] = require(modulePath);
  }
  return moduleCache[modulePath];
}

// Temporarily override require
const originalRequire = require;
require = mockRequire;

try {
  const { selfVerificationService } = require('../../src/services/selfVerification.service');
  const { selfApi } = require('../../src/services/selfApi');
  
  async function test() {
    console.log('Testing high value verification (amount: 150)...');
    
    // Reset and set up the mock
    selfApi.verifyIdentity.mockReset();
    selfApi.verifyIdentity.mockResolvedValue({
      success: true,
      proof: 'mock-proof',
      pubSignals: ['mock-signal'],
      userContextData: {}
    });
    
    try {
      const result = await selfVerificationService.verifyIdentity({
        recipient: 'test@example.com',
        amount: 150,
        currency: 'USD'
      });
      console.log('High value result:', JSON.stringify(result, null, 2));
      console.log('Mock called:', selfApi.verifyIdentity.mock.calls.length, 'times');
      if (selfApi.verifyIdentity.mock.calls.length > 0) {
        console.log('Mock called with:', selfApi.verifyIdentity.mock.calls[0]);
      }
    } catch (error) {
      console.error('High value error:', error);
    }
    
    // Clear mock
    selfApi.verifyIdentity.mockReset();
    
    console.log('\nTesting low value verification (amount: 50)...');
    try {
      const result = await selfVerificationService.verifyIdentity({
        recipient: 'test@example.com',
        amount: 50,
        currency: 'USD'
      });
      console.log('Low value result:', JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('Low value error:', error);
    }
    
    // Test failure case
    console.log('\nTesting failure case (amount: 150)...');
    selfApi.verifyIdentity.mockReset();
    selfApi.verifyIdentity.mockRejectedValueOnce(new Error('Verification failed'));
    
    try {
      const result = await selfVerificationService.verifyIdentity({
        recipient: 'test-fail@example.com',
        amount: 150,
        currency: 'USD'
      });
      console.log('Failure case result:', JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('Failure case error:', error);
    }
  }
  
  test().catch(console.error);
} finally {
  // Restore require
  require = originalRequire;
}