import { feeService } from '../src/services/feeService';
import { db } from '../src/database/database';

// Mock database
jest.mock('../src/database/database');

const mockDb = db as any;

describe('Fee Structure', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock database
    mockDb.run = jest.fn().mockResolvedValue({});
  });

  describe('Protocol Fee Model', () => {
    it('should apply 1.5% platform fee', async () => {
      const quote = await feeService.getFeeQuote(100, 'celo', 'protocol');
      
      expect(parseFloat(quote.platformFee)).toBe(1.5);
      expect(parseFloat(quote.protocolFee)).toBe(1.5);
      expect(parseFloat(quote.totalFee)).toBe(1.5);
    });
    
    it('should calculate correct send and receive amounts', async () => {
      const quote = await feeService.getFeeQuote(100, 'celo', 'protocol');
      
      const sendAmount = parseFloat(quote.sendAmount);
      const recipientAmount = parseFloat(quote.recipientAmount);
      const protocolFee = parseFloat(quote.protocolFee);
      
      expect(sendAmount).toBe(101.5);
      expect(recipientAmount).toBe(100);
      expect(protocolFee).toBe(1.5);
    });
  });
});
