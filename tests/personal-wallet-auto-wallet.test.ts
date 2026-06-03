import { remittanceService } from '../src/services/remittanceService';
import { db } from '../src/database/database';
import { generateToken } from '../src/utils/tokenGenerator';
import { walletService } from '../src/services/walletService';

// Mock dependencies
jest.mock('../src/database/database');
jest.mock('../src/utils/tokenGenerator');
jest.mock('../src/services/walletService');

const mockDb = db as any;
const mockGenerateToken = generateToken as jest.Mock;
const mockWalletService = walletService as jest.Mocked<typeof walletService>;

describe('Personal Wallet Auto-Wallet Flow', () => {
  const mockToken = 'test-token';
  const mockSenderEmail = 'sender@example.com';
  const mockRecipientEmail = 'recipient@example.com';
  const mockAmount = 100;
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerateToken.mockReturnValue(mockToken);
    
    // Setup database mock
    mockDb.remittances = {
      where: jest.fn().mockReturnValue({
        first: jest.fn(),
        update: jest.fn()
      })
    };
  });

  describe('claimRemittance auto-generates wallet if none provided', () => {
    it('should generate wallet and return instructions when no recipient wallet provided', async () => {
      // Mock database response
      mockDb.remittances.where.mockReturnValue({
        first: jest.fn().mockResolvedValue({
          id: 'test-id',
          sender_email: mockSenderEmail,
          recipient_email: mockRecipientEmail,
          amount: mockAmount,
          currency: 'USD',
          status: 'pending',
          token: mockToken,
          wallet_mode: 'personal'
        })
      });
      
       // Mock wallet generation
       const mockWallet = {
         walletAddress: '0xGeneratedWalletAddress' as `0x${string}`,
         privateKey: '0xGeneratedPrivateKey' as `0x${string}`,
         importInstructions: 'Test import instructions'
       };
       mockWalletService.generateWalletWithInstructions.mockReturnValue(mockWallet);
      
      const claimResult = await remittanceService.claimRemittance(mockToken);
      
      expect(claimResult.success).toBe(true);
      expect(claimResult.wallet).toBeDefined();
      expect(claimResult.privateKey).toBeDefined();
      expect(claimResult.instructions).toBeDefined();
    });
  });
});
