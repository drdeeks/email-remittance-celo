// Set test environment variables
process.env.BASE_SELF_CONTRACT = '0x10079Fa97E739Fd05Ddc5C7cD11951aEF566b7e0';
process.env.MONAD_SELF_CONTRACT = '0x7BC66eD8285b51F84D170F158aD162cA144F32c1';
process.env.CELO_SELF_CONTRACT = '0x10079Fa97E739Fd05Ddc5C7cD11951aEF566b7e0';
process.env.SELF_ATTESTER_ADDRESS = '0x38be03139523EE998952D21110115f23AE54b1f7';
process.env.SELF_APP_ID = 'test-app-id';
process.env.SELF_APP_SECRET = 'test-app-secret';
process.env.WALLET_PRIVATE_KEY = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

// Mock services before importing
jest.mock('../../src/services/selfVerification.service', () => ({
  selfVerificationService: {
    getFrontendConfig: jest.fn(),
    verifyIdentity: jest.fn(),
    verifyProof: jest.fn(),
    getStatus: jest.fn()
  }
}));

jest.mock('../../src/services/selfContract.service', () => ({
  selfContractService: {
    initializeContracts: jest.fn(),
    initialize: jest.fn()
  }
}));

import request from 'supertest';
import app from '../../src/index';
import { selfVerificationService } from '../../src/services/selfVerification.service';
import { selfContractService } from '../../src/services/selfContract.service';

const mockVerificationService = selfVerificationService as jest.Mocked<typeof selfVerificationService>;
const mockContractService = selfContractService as jest.Mocked<typeof selfContractService>;

describe('Self Protocol Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

   describe('Frontend Configuration', () => {
     it('should return frontend configuration', async () => {
       const mockConfig = {
         version: 2,
         userId: 'test-user-id',
         disclosures: {
           minimumAge: 18,
           name: undefined,
           date_of_birth: undefined
         },
         requireVerification: false
       };
       
       mockVerificationService.getFrontendConfig.mockReturnValue(mockConfig);
       
       const response = await request(app).get('/api/self/config');
       
       expect(response.status).toBe(200);
       expect(response.body).toEqual(mockConfig);
     });
   });

  describe('Verification Flow', () => {
    it('should verify identity for high value transaction', async () => {
      const mockResult = {
        success: true,
        requireVerification: true,
        verificationToken: 'test-token',
        proof: 'test-proof',
        pubSignals: ['signal1', 'signal2']
      };
      
      mockVerificationService.verifyIdentity.mockResolvedValue(mockResult);
      
      const response = await request(app)
        .post('/api/verification')
        .send({
          recipient: 'test@example.com',
          amount: 150,
          currency: 'USD'
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
    });
  });

  describe('Contract Integration', () => {
    it('should initialize contracts', async () => {
      mockContractService.initialize.mockResolvedValue(true);
      
      const response = await request(app)
        .post('/api/self/initialize')
        .send({ chain: 'base' });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('System Status', () => {
    it('should return system status', async () => {
      const mockStatus = {
        selfProtocol: {
          configured: true,
          verificationEnabled: true,
          highValueThreshold: 100,
          monitoringEnabled: true
        }
      };
      
      mockVerificationService.getStatus.mockReturnValue(mockStatus);
      
      const response = await request(app).get('/api/self/status');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockStatus);
    });
  });
});
