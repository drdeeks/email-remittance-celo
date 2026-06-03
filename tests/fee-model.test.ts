import { feeService } from '../src/services/feeService';

describe('Fee Model', () => {
  describe('Protocol Fee Model', () => {
    it('should have consistent fee structure', async () => {
      const quote = await feeService.getFeeQuote(100, 'celo', 'protocol');
      
      expect(quote.feeModel).toBe('protocol');
      expect(parseFloat(quote.platformFee)).toBe(1.5);
      expect(parseFloat(quote.protocolFee)).toBe(1.5);
      expect(parseFloat(quote.totalFee)).toBe(1.5);
      expect(quote.feeBreakdown.length).toBe(1);
      expect(quote.feeBreakdown[0].name).toBe('Protocol Fee');
      expect(parseFloat(quote.feeBreakdown[0].amount)).toBe(1.5);
      expect(quote.feeBreakdown[0].percentage).toBe(1.5);
    });
  });
});
