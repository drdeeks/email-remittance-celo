import { feeService } from '../../src/services/feeService';

describe('FeeService', () => {
  describe('getFeeQuote', () => {
    it('should calculate correct fees for standard model', async () => {
      const quote = await feeService.getFeeQuote(100, 'celo', 'standard');
      
      expect(quote.feeModel).toBe('protocol'); // Always protocol now
      expect(parseFloat(quote.platformFee)).toBe(1.5);
      expect(parseFloat(quote.protocolFee)).toBe(1.5);
      expect(parseFloat(quote.totalFee)).toBe(1.5);
    });
    
    it('should calculate correct fees for premium model', async () => {
      const quote = await feeService.getFeeQuote(100, 'celo', 'premium');
      
      expect(quote.feeModel).toBe('protocol'); // Always protocol now
      expect(parseFloat(quote.platformFee)).toBe(1.5);
      expect(parseFloat(quote.protocolFee)).toBe(1.5);
      expect(parseFloat(quote.totalFee)).toBe(1.5);
    });
    
    it('should calculate correct fees for protocol model', async () => {
      const quote = await feeService.getFeeQuote(100, 'celo', 'protocol');
      
      expect(quote.feeModel).toBe('protocol');
      expect(parseFloat(quote.platformFee)).toBe(1.5);
      expect(parseFloat(quote.protocolFee)).toBe(1.5);
      expect(parseFloat(quote.totalFee)).toBe(1.5);
    });
    
    it('should handle different amounts correctly', async () => {
      const quote = await feeService.getFeeQuote(200, 'celo', 'protocol');
      
      expect(parseFloat(quote.platformFee)).toBe(3); // 1.5% of 200
      expect(parseFloat(quote.protocolFee)).toBe(3);
      expect(parseFloat(quote.totalFee)).toBe(3);
    });
  });
});
