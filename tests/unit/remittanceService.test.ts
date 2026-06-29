// Set test environment variables
process.env.BASE_SELF_CONTRACT = '0x10079Fa97E739Fd05Ddc5C7cD11951aEF566b7e0';
process.env.MONAD_SELF_CONTRACT = '0x7BC66eD8285b5b51F84D170F158aD162cA144F32c1';
process.env.CELO_SELF_CONTRACT = '0x10079Fa97E739Fd05Ddc5C7cD11951aEF566b7e0';
process.env.SELF_ATTESTER_ADDRESS = '0x38be03139523EE998952D21110115f23AE54b1f7';
process.env.SELF_APP_ID = 'test-app-id';
process.env.SELF_APP_SECRET = 'test-app-secret';
process.env.DB_PATH = ':memory:';

// Mock all dependencies - must be before imports
jest.mock('../../src/services/selfEnterpriseEnhancedService', () => ({
  selfEnterpriseEnhancedService: {
    processVerificationRequest: jest.fn().mockResolvedValue({ success: true, verified: false }),
    getStatus: jest.fn().mockReturnValue({ enterpriseEnhanced: { configured: false } }),
    getFrontendConfig: jest.fn().mockReturnValue({ version: 4, userId: '', supportedVerificationMethods: ['NONE', 'SELF', 'WORLDID'] })
  }
}));

jest.mock('../../src/services/feeEngine');
jest.mock('../../src/services/celoService');
jest.mock('../../src/services/uniswapService');
jest.mock('../../src/services/selfContract.service');

jest.mock('../../src/db/database', () => {
  const mockPrepare = jest.fn().mockReturnValue({
    get: jest.fn().mockReturnValue(undefined),
    run: jest.fn().mockReturnValue({ changes: 1 }),
    all: jest.fn().mockReturnValue([])
  });
  
  return {
    db: {
      prepare: mockPrepare,
      remittances: {
        where: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValue(null),
          update: jest.fn().mockResolvedValue(1),
          all: jest.fn().mockResolvedValue([])
        })
      }
    }
  };
});

import { 
  createRemittance, 
  claimRemittance, 
  getRemittanceByClaimToken,
  getRemittancesBySender,
  getRemittancesByRecipient,
  cancelRemittance
} from '../../src/services/remittanceService';
import { previewFee, calculateFee, getFeeConfig, FeeConfig, FeeCalculationResult, FeePreviewResult } from '../../src/services/feeEngine';
import { chainService } from '../../src/services/celoService';
import { db } from '../../src/db/database';
import { uniswapService } from '../../src/services/uniswapService';
import { selfContractService } from '../../src/services/selfContract.service';

// Create proper mock types
const mockPreviewFee = previewFee as jest.MockedFunction<typeof previewFee>;
const mockCalculateFee = calculateFee as jest.MockedFunction<typeof calculateFee>;
const mockGetFeeConfig = getFeeConfig as jest.MockedFunction<typeof getFeeConfig>;
const mockChainService = chainService as any;
const mockDb = db as any;
const mockUniswapService = uniswapService as any;
const mockSelfContractService = selfContractService as jest.Mocked<typeof selfContractService>;

const mockFeeConfig: FeeConfig = {
  id: 'test-config',
  chain_id: 42220,
  token_address: '0x1234567890123456789012345678901234567890',
  base_fee_usd: 0.50,
  percentage_fee_bps: 150,
  min_fee_usd: 0,
  max_fee_usd: 100,
  gas_sponsor_limit_usd: 5,
  created_at: new Date(),
  updated_at: new Date()
};

const mockFeeCalc: FeeCalculationResult = {
  feeUsd: 1.5,
  feeTokens: '1.5',
  baseFeeUsd: 0.50,
  percentageFeeUsd: 1.0,
  feeConfig: mockFeeConfig,
  amountUsd: 100,
  tokenAddress: '0x1234567890123456789012345678901234567890',
  chainId: 42220
};

const mockPreviewResult: FeePreviewResult = {
  amountUsd: 100,
  feeUsd: 1.5,
  netUsd: 98.5,
  feeBreakdown: {
    baseFeeUsd: 0.50,
    percentageFeeUsd: 1.0,
    percentageBps: 150
  },
  tokenAddress: '0x1234567890123456789012345678901234567890',
  chainId: 42220,
  minFeeUsd: 0,
  maxFeeUsd: 100
};

describe('RemittanceService', () => {
  let mockPrepare: jest.Mock;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Get the mock prepare function
    mockPrepare = (db.prepare as jest.Mock);
    
    // Mock prepare to return different get functions based on the SQL query
    mockPrepare.mockImplementation((query: string) => {
      console.log('DEBUG prepare:', query);
      if (query.includes('SELECT response FROM idempotency_keys')) {
        return {
          get: jest.fn().mockReturnValue(undefined), // No cached idempotency response
          run: jest.fn().mockReturnValue({ changes: 1 }),
          all: jest.fn().mockReturnValue([])
        };
      }
      if (query.includes('SELECT id, email FROM users WHERE id = ?')) {
        return {
          get: jest.fn().mockReturnValue({ id: 'test-sender-id', email: 'sender@example.com' }),
          run: jest.fn().mockReturnValue({ changes: 1 }),
          all: jest.fn().mockReturnValue([])
        };
      }
      if (query.includes('SELECT id FROM users WHERE email = ?')) {
        return {
          get: jest.fn().mockReturnValue({ id: 'test-recipient-id' }),
          run: jest.fn().mockReturnValue({ changes: 1 }),
          all: jest.fn().mockReturnValue([])
        };
      }
      if (query.includes('SELECT * FROM remittances WHERE claim_token')) {
        return {
          get: jest.fn().mockReturnValue({
            id: 'test-id',
            sender_email: 'sender@example.com',
            recipient_email: 'recipient@example.com',
            amount_usd: 100,
            token_address: '0x123',
            chain_id: 42220,
            fee_usd: 1.5,
            fee_tokens: '1.5',
            claim_token: 'sha256$test-token',
            status: 'pending',
            wallet_mode: 'personal',
            expires_at: new Date(Date.now() + 86400000).toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }),
          run: jest.fn().mockReturnValue({ changes: 1 }),
          all: jest.fn().mockReturnValue([])
        };
      }
      if (query.includes('SELECT id FROM users WHERE wallet_address')) {
        return {
          get: jest.fn().mockReturnValue(undefined),
          run: jest.fn().mockReturnValue({ changes: 1 }),
          all: jest.fn().mockReturnValue([])
        };
      }
      if (query.includes('INSERT INTO idempotency_keys')) {
        return {
          get: jest.fn().mockReturnValue(undefined),
          run: jest.fn().mockReturnValue({ changes: 1 }),
          all: jest.fn().mockReturnValue([])
        };
      }
      if (query.includes('INSERT INTO remittances')) {
        return {
          get: jest.fn().mockReturnValue(undefined),
          run: jest.fn().mockReturnValue({ changes: 1 }),
          all: jest.fn().mockReturnValue([])
        };
      }
      if (query.includes('UPDATE remittances SET status')) {
        return {
          get: jest.fn().mockReturnValue(undefined),
          run: jest.fn().mockReturnValue({ changes: 1 }),
          all: jest.fn().mockReturnValue([])
        };
      }
      if (query.includes('INSERT INTO identity_verifications')) {
        return {
          get: jest.fn().mockReturnValue(undefined),
          run: jest.fn().mockReturnValue({ changes: 1 }),
          all: jest.fn().mockReturnValue([])
        };
      }
      
      // Default
      return {
        get: jest.fn().mockReturnValue(undefined),
        run: jest.fn().mockReturnValue({ changes: 1 }),
        all: jest.fn().mockReturnValue([])
      };
    });
    
    // Mock fee engine functions
    mockPreviewFee.mockResolvedValue(mockPreviewResult);
    mockCalculateFee.mockReturnValue(mockFeeCalc);
    mockGetFeeConfig.mockResolvedValue(mockFeeConfig);
    
    // Mock self contract service
    mockSelfContractService.isMinimumAgeValid.mockResolvedValue(true);
    mockSelfContractService.isOfacValid.mockResolvedValue(true);
  });

  describe('createRemittance', () => {
    it('should create a remittance with valid inputs', async () => {
      const result = await createRemittance({
        senderId: 'test-sender-id',
        senderEmail: 'sender@example.com',
        recipientEmail: 'recipient@example.com',
        amountUsd: 100,
        chainId: 42220,
        tokenAddress: '0x1234567890123456789012345678901234567890',
        requireAuth: false,
        idempotencyKey: '12345678-1234-4abc-8abc-1234567890ab'
      });
      
      expect(result.success).toBe(true);
      expect(result.remittance).toBeDefined();
    });
    
    it('should proceed even if age verification fails (fallback)', async () => {
      mockSelfContractService.isMinimumAgeValid.mockResolvedValue(false);
      
      const result = await createRemittance({
        senderId: 'test-sender-id',
        senderEmail: 'sender@example.com',
        recipientEmail: 'recipient@example.com',
        amountUsd: 100,
        chainId: 42220,
        tokenAddress: '0x1234567890123456789012345678901234567890',
        requireAuth: false,
        idempotencyKey: '12345678-1234-4abc-8abc-1234567890ab'
      });
      
      expect(result.success).toBe(true);
      expect(result.remittance).toBeDefined();
    });
  });

  describe('claimRemittance', () => {
    beforeEach(() => {
      // Mock the claim token hash - it's just 'sha256$' + token in the service
      const mockClaimTokenHash = 'sha256$test-token';
      const mockClaimSecret = 'test-token'; // Must match the token used to generate the hash
      
      // Mock db.prepare().get() for finding remittance by claim_token
      mockDb.prepare.mockImplementation((query: string) => {
        console.log('CLAIM DEBUG Query:', query);
        if (query.includes('SELECT * FROM remittances WHERE claim_token')) {
          return {
            get: jest.fn().mockReturnValue({
              id: 'test-id',
              sender_email: 'sender@example.com',
              recipient_email: 'recipient@example.com',
              amount_usd: 100,
              token_address: '0x123',
              chain_id: 42220,
              fee_usd: 1.5,
              fee_tokens: '1.5',
              claim_token: mockClaimTokenHash,
              status: 'pending',
              wallet_mode: 'personal',
              expires_at: new Date(Date.now() + 86400000).toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
          };
        }
        if (query.includes('SELECT id FROM users WHERE wallet_address')) {
          return { get: jest.fn().mockReturnValue(undefined) };
        }
        if (query.includes('UPDATE remittances SET status')) {
          return { run: jest.fn().mockReturnValue({ changes: 1 }) };
        }
        if (query.includes('INSERT INTO identity_verifications')) {
          return { run: jest.fn().mockReturnValue({ changes: 1 }) };
        }
        if (query.includes('INSERT INTO idempotency_keys')) {
          return { 
            get: jest.fn().mockReturnValue(undefined),
            run: jest.fn().mockReturnValue({ changes: 1 }),
            all: jest.fn().mockReturnValue([])
          };
        }
        return {
          get: jest.fn().mockReturnValue(undefined),
          run: jest.fn().mockReturnValue({ changes: 1 }),
          all: jest.fn().mockReturnValue([])
        };
      });
    });
    
    it('should claim a remittance and return transaction hash', async () => {
      // Mock chain service
      mockChainService.sendNative = jest.fn().mockResolvedValue({
        txHash: '0x123',
        chain: 'celo',
        explorerUrl: 'https://explorer.celo.org/tx/0x123'
      });
      
      const result = await claimRemittance({
        claimToken: 'test-token',
        claimSecret: 'test-token', // Must match the claim_token hash
        recipientWallet: '0xRecipient',
        recipientEmail: 'recipient@example.com',
        idempotencyKey: '12345678-1234-4abc-8abc-1234567890ab'
      });
      
      expect(result.success).toBe(true);
      expect(result.txHash).toBeDefined();
    });
    
    it('should handle claim remittance with token swap', async () => {
      // Mock chain service
      mockUniswapService.executeSwap = jest.fn().mockResolvedValue({
        txHash: '0x456',
        chain: 'celo',
        explorerUrl: 'https://explorer.celo.org/tx/0x456'
      });
      
      const result = await claimRemittance({
        claimToken: 'test-token',
        claimSecret: 'test-token', // Must match the claim_token hash
        recipientWallet: '0xRecipient',
        recipientEmail: 'recipient@example.com',
        idempotencyKey: '12345678-1234-4abc-8abc-1234567890ab'
      });
      
      expect(result.success).toBe(true);
      expect(result.txHash).toBeDefined();
    });
  });

  describe('getRemittanceByClaimToken', () => {
    beforeEach(() => {
      const mockClaimTokenHash = 'sha256$test-token';
      
      mockDb.prepare.mockImplementation((query: string) => {
        if (query.includes('SELECT * FROM remittances WHERE claim_token')) {
          return {
            get: jest.fn().mockReturnValue({
              id: 'test-id',
              status: 'completed',
              claim_token: mockClaimTokenHash
            })
          };
        }
        return {
          get: jest.fn().mockReturnValue(undefined),
          run: jest.fn().mockReturnValue({ changes: 1 }),
          all: jest.fn().mockReturnValue([])
        };
      });
    });
    
    it('should return remittance status', async () => {
      const status = await getRemittanceByClaimToken('test-token');
      
      expect(status).toBeDefined();
      expect(status?.status).toBe('completed');
    });
  });
});
