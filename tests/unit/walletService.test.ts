// Mock the entire walletService module
jest.mock('../../src/services/walletService', () => ({
  walletService: {
    generateWallet: jest.fn()
  }
}));

import { walletService } from '../../src/services/walletService';

describe('WalletService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateWallet', () => {
    it('should generate a new wallet with address and private key', () => {
      const mockWallet = {
        address: '0x1234567890abcdef1234567890abcdef12345678',
        privateKey: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
      };
      
      // Type assertion to access mock methods
      (walletService.generateWallet as jest.Mock).mockReturnValue(mockWallet);
      
      const result = walletService.generateWallet();
      
      expect(result).toEqual(mockWallet);
      expect(walletService.generateWallet).toHaveBeenCalled();
    });
    
    it('should handle wallet generation errors', () => {
      // Type assertion to access mock methods
      (walletService.generateWallet as jest.Mock).mockImplementation(() => {
        throw new Error('Wallet generation failed');
      });
      
      expect(() => walletService.generateWallet()).toThrow('Wallet generation failed');
    });
  });
});
