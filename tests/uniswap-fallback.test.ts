/**
 * Uniswap Fallback Tests
 * Tests for LI.FI public fallback when UNISWAP_API_KEY is not set
 */

// Save original env
const originalEnv = process.env.UNISWAP_API_KEY;

describe('Uniswap Service Fallback', () => {
  describe('Without UNISWAP_API_KEY', () => {
    beforeAll(() => {
      // Clear the API key for these tests
      delete process.env.UNISWAP_API_KEY;
      // Clear module cache to re-instantiate with new env
      jest.resetModules();
    });

    afterAll(() => {
      // Restore original env
      if (originalEnv) {
        process.env.UNISWAP_API_KEY = originalEnv;
      }
      jest.resetModules();
    });

    test('getBridgeQuote returns quote when UNISWAP_API_KEY not set (LI.FI fallback)', async () => {
      // Dynamic import to get fresh module with cleared env
      const { uniswapService } = await import('../src/services/uniswapService');
      
      // Should not throw
      const quote = await uniswapService.getBridgeQuote('celo', 'base', '1.0');
      
      expect(quote).toBeDefined();
      expect(quote.fromChain).toBe('celo');
      expect(quote.toChain).toBe('base');
      expect(quote.amountIn).toBe('1.0');
      expect(quote.estimatedAmountOut).toBeDefined();
    });

    test('provider is "lifi-public" when no API key', async () => {
      const { uniswapService } = await import('../src/services/uniswapService');
      
      const quote = await uniswapService.getBridgeQuote('celo', 'monad', '0.5');
      
      expect(quote.provider).toBe('lifi-public');
    });

    test('getSwapQuote returns quote when UNISWAP_API_KEY not set', async () => {
      const { uniswapService } = await import('../src/services/uniswapService');
      
      const quote = await uniswapService.getSwapQuote({
        chain: 'celo',
        tokenIn: 'NATIVE',
        tokenOut: '0x765de816845861e75a25fca122bb6898b8b1282a', // cUSD
        amountIn: '1.0',
        swapper: '0x1234567890123456789012345678901234567890',
      });
      
      expect(quote).toBeDefined();
      expect(quote.provider).toBe('lifi-public');
    });

    test('executeSwap throws clear error when no API key', async () => {
      const { uniswapService } = await import('../src/services/uniswapService');
      
      await expect(
        uniswapService.executeSwap({
          chain: 'celo',
          tokenIn: 'NATIVE',
          tokenOut: '0x765de816845861e75a25fca122bb6898b8b1282a',
          amountIn: '1.0',
        })
      ).rejects.toThrow('UNISWAP_API_KEY required');
    });

    test('executeSwap error mentions LI.FI does not support execution', async () => {
      const { uniswapService } = await import('../src/services/uniswapService');
      
      try {
        await uniswapService.executeSwap({
          chain: 'base',
          tokenIn: 'NATIVE',
          tokenOut: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC
          amountIn: '0.01',
        });
        fail('Should have thrown');
      } catch (error: any) {
        expect(error.message).toContain('LI.FI public fallback only supports quotes');
      }
    });

    test('isConfigured returns false when no API key', async () => {
      const { uniswapService } = await import('../src/services/uniswapService');
      
      expect(uniswapService.isConfigured()).toBe(false);
    });
  });

  describe('With UNISWAP_API_KEY', () => {
    beforeAll(() => {
      process.env.UNISWAP_API_KEY = 'test-api-key-123';
      jest.resetModules();
    });

    afterAll(() => {
      if (originalEnv) {
        process.env.UNISWAP_API_KEY = originalEnv;
      } else {
        delete process.env.UNISWAP_API_KEY;
      }
      jest.resetModules();
    });

    test('isConfigured returns true when API key present', async () => {
      const { uniswapService } = await import('../src/services/uniswapService');
      
      expect(uniswapService.isConfigured()).toBe(true);
    });

    test('getStatus shows configured=true when API key present', async () => {
      const { uniswapService } = await import('../src/services/uniswapService');
      
      const status = uniswapService.getStatus();
      expect(status.configured).toBe(true);
      expect(status.apiKeySet).toBe(true);
    });
  });
});

describe('Uniswap Quote Interface', () => {
  beforeAll(() => {
    delete process.env.UNISWAP_API_KEY;
    jest.resetModules();
  });

  test('Bridge quote has required fields', async () => {
    const { uniswapService } = await import('../src/services/uniswapService');
    
    const quote = await uniswapService.getBridgeQuote('base', 'celo', '0.1');
    
    expect(quote).toHaveProperty('fromChain');
    expect(quote).toHaveProperty('toChain');
    expect(quote).toHaveProperty('amountIn');
    expect(quote).toHaveProperty('estimatedAmountOut');
    expect(quote).toHaveProperty('estimatedFee');
    expect(quote).toHaveProperty('estimatedTime');
    expect(quote).toHaveProperty('routerAddress');
    expect(quote).toHaveProperty('bridgeUrl');
    expect(quote).toHaveProperty('provider');
  });

  test('Swap quote has required fields', async () => {
    const { uniswapService } = await import('../src/services/uniswapService');
    
    const quote = await uniswapService.getSwapQuote({
      chain: 'monad',
      tokenIn: 'NATIVE',
      tokenOut: '0x0000000000000000000000000000000000000001',
      amountIn: '1.0',
      swapper: '0x1234567890123456789012345678901234567890',
    });
    
    expect(quote).toHaveProperty('chainId');
    expect(quote).toHaveProperty('chain');
    expect(quote).toHaveProperty('tokenIn');
    expect(quote).toHaveProperty('tokenOut');
    expect(quote).toHaveProperty('amountIn');
    expect(quote).toHaveProperty('amountOut');
    expect(quote).toHaveProperty('priceImpact');
    expect(quote).toHaveProperty('gasEstimate');
    expect(quote).toHaveProperty('routerAddress');
    expect(quote).toHaveProperty('provider');
  });
});
