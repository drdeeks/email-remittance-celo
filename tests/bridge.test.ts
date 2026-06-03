import { setupTestEnvironment } from './test-environment';
import { uniswapService } from '../src/services/uniswapService';

// Setup test environment before imports
setupTestEnvironment();

describe('Bridge Quote — LI.FI Fallback', () => {
  it('should return valid quote for celo→base', async () => {
    const quote = await uniswapService.getBridgeQuote({
      fromChain: 'celo', 
      toChain: 'base', 
      amountIn: '1'
    });
    expect(quote).toBeDefined();
    expect(quote.estimatedAmountOut).toBeDefined();
  });
   
  it('should return valid quote for base→celo', async () => {
    const quote = await uniswapService.getBridgeQuote({
      fromChain: 'base', 
      toChain: 'celo', 
      amountIn: '1'
    });
    expect(quote).toBeDefined();
    expect(quote.estimatedAmountOut).toBeDefined();
  });
   
  it('should return quote for celo→monad', async () => {
    const quote = await uniswapService.getBridgeQuote({
      fromChain: 'celo', 
      toChain: 'monad', 
      amountIn: '1'
    });
    expect(quote).toBeDefined();
    expect(quote.estimatedAmountOut).toBeDefined();
  });
});
