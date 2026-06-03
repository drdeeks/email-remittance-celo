// Set test environment variables
process.env.BASE_SELF_CONTRACT = '0x10079Fa97E739Fd05Ddc5C7cD11951aEF566b7e0';
process.env.MONAD_SELF_CONTRACT = '0x7BC66eD8285b51F84D170F158aD162cA144F32c1';
process.env.CELO_SELF_CONTRACT = '0x10079Fa97E739Fd05Ddc5C7cD11951aEF566b7e0';
process.env.SELF_ATTESTER_ADDRESS = '0x38be03139523EE998952D21110115f23AE54b1f7';
process.env.SELF_APP_ID = 'test-app-id';
process.env.SELF_APP_SECRET = 'test-app-secret';

// Mock all dependencies
jest.mock('../../src/services/feeService');
jest.mock('../../src/services/celoService');
jest.mock('../../src/database/database');
jest.mock('../../src/services/uniswapService');
jest.mock('../../src/services/selfContract.service');

import { remittanceService } from '../../src/services/remittanceService';
import { feeService } from '../../src/services/feeService';
import { chainService } from '../../src/services/celoService';
import { db } from '../../src/database/database';
import { uniswapService } from '../../src/services/uniswapService';
import { selfContractService } from '../../src/services/selfContract.service';

// Create proper mock types
const mockFeeService = feeService as jest.Mocked<typeof feeService>;
const mockChainService = chainService as any;
const mockDb = db as any;
const mockUniswapService = uniswapService as any;
const mockSelfContractService = selfContractService as jest.Mocked<typeof selfContractService>;

describe('RemittanceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup basic mocks
    mockDb.remittances = {
      where: jest.fn().mockReturnValue({
        first: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue(1)
      })
    };
    
    // Mock fee service with complete FeeQuote
    mockFeeService.getFeeQuote.mockResolvedValue({
      feeModel: 'protocol',
      amount: 100,
      currency: 'CELO',
      platformFee: '1.5',
      protocolFee: '1.5',
      totalFee: '1.5',
      sendAmount: '101.5',
      recipientAmount: '100',
      feeAmount: '1.5',
      gasEstimate: '0.01',
      gasLabel: 'Low',
      premiumFeeNative: '0.001',
      escrowAddress: '0xEscrowAddress',
      escrowPrivateKey: '0xEscrowPrivateKey',
      serverProfit: '1.5',
      feeBreakdown: [
        {
          name: 'Protocol Fee',
          amount: '1.5',
          percentage: 1.5,
        }
      ],
    });
    
    // Mock self contract service
    mockSelfContractService.isMinimumAgeValid.mockResolvedValue(true);
    mockSelfContractService.isOfacValid.mockResolvedValue(true);
  });

  describe('createRemittance', () => {
    it('should create a remittance with token and wallet mode', async () => {
      const result = await remittanceService.createRemittance({
        senderEmail: 'sender@example.com',
        recipientEmail: 'recipient@example.com',
        amount: 100,
        currency: 'USD',
        chain: 'celo'
      });
      
      expect(result.token).toBeDefined();
      expect(result.walletMode).toBe('personal');
    });
    
    it('should proceed even if age verification fails (fallback)', async () => {
      mockSelfContractService.isMinimumAgeValid.mockResolvedValue(false);
      
      const result = await remittanceService.createRemittance({
        senderEmail: 'sender@example.com',
        recipientEmail: 'recipient@example.com',
        amount: 100,
        currency: 'USD',
        chain: 'celo'
      });
      
      expect(result.token).toBeDefined();
    });
  });

  describe('claimRemittance', () => {
    it('should claim a remittance and return transaction hash', async () => {
      // Mock database response
      mockDb.remittances.where.mockReturnValue({
        first: jest.fn().mockResolvedValue({
          id: 'test-id',
          sender_email: 'sender@example.com',
          recipient_email: 'recipient@example.com',
          amount: 100,
          currency: 'USD',
          status: 'pending',
          token: 'test-token',
          wallet_mode: 'personal'
        })
      });
      
      // Mock chain service
      mockChainService.sendNative = jest.fn().mockResolvedValue({
        txHash: '0x123',
        chain: 'celo',
        explorerUrl: 'https://explorer.celo.org/tx/0x123'
      });
      
      const result = await remittanceService.claimRemittance('test-token', '0xRecipient');
      
      expect(result.success).toBe(true);
      expect(result.txHash).toBe('0x123');
    });
    
    it('should handle claim remittance with token swap', async () => {
      // Mock database response
      mockDb.remittances.where.mockReturnValue({
        first: jest.fn().mockResolvedValue({
          id: 'test-id',
          sender_email: 'sender@example.com',
          recipient_email: 'recipient@example.com',
          amount: 100,
          currency: 'USDC',
          status: 'pending',
          token: 'test-token',
          wallet_mode: 'personal'
        })
      });
      
      // Mock uniswap service
      mockUniswapService.executeSwap = jest.fn().mockResolvedValue({
        txHash: '0x456',
        chain: 'celo',
        explorerUrl: 'https://explorer.celo.org/tx/0x456'
      });
      
      const result = await remittanceService.claimRemittance('test-token', '0xRecipient');
      
      expect(result.success).toBe(true);
      expect(result.txHash).toBe('0x456');
    });
  });

  describe('getRemittanceStatus', () => {
    it('should return remittance status', async () => {
      // Mock database response
      mockDb.remittances.where.mockReturnValue({
        first: jest.fn().mockResolvedValue({
          id: 'test-id',
          status: 'completed',
          token: 'test-token'
        })
      });
      
      const status = await remittanceService.getRemittanceStatus('test-token');
      
      expect(status.status).toBe('completed');
    });
  });
});
