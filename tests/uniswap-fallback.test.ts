import { setupTestEnvironment } from './test-environment';
import { uniswapService } from '../src/services/uniswapService';

// Setup test environment before imports
setupTestEnvironment();

describe('Uniswap Service Fallback', () => {
  describe('Without UNISWAP_API_KEY', () => {
    beforeEach(() => {
      // Temporarily remove API key to test fallback
      delete process.env.UNISWAP_API_KEY;
    });
    
    afterEach(() => {
      // Restore API key
      process.env.UNISWAP_API_KEY = 'test-uniswap-key';
    });
    
    it('should return quote when UNISWAP_API_KEY not set', async () => {
      const quote = await uniswapService.getBridgeQuote({
        fromChain: 'celo', 
        toChain: 'base', 
        amountIn: '1'
      });
      expect(quote).toBeDefined();
      expect(quote.provider).toBe('lifi-public');
    });
  });
  
  describe('With UNISWAP_API_KEY', () => {
    it('should return configured status when API key present', () => {
      const status = uniswapService.getStatus();
      expect(status.configured).toBe(true);
    });
  });
});
