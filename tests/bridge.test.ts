/**
 * Bridge Tests
 * Verifies all 6 cross-chain bridge routes are registered and quote correctly
 */
import { chainService, detectChain } from '../src/services/celoService';

describe('Bridge Routes', () => {
  test('all 6 routes are registered', () => {
    const routes = chainService.getSupportedBridgeRoutes();
    const routeNames = routes.map(r => r.route);
    expect(routeNames).toContain('celo→base');
    expect(routeNames).toContain('base→celo');
    expect(routeNames).toContain('celo→monad');
    expect(routeNames).toContain('monad→celo');
    expect(routeNames).toContain('base→monad');
    expect(routeNames).toContain('monad→base');
  });

  test('celo↔base route uses LI.FI provider', () => {
    const routes = chainService.getSupportedBridgeRoutes();
    const celoBase = routes.find(r => r.route === 'celo→base');
    expect(celoBase?.provider).toContain('lifi');
  });

  test('monad routes exist', () => {
    const routes = chainService.getSupportedBridgeRoutes();
    const monadRoutes = routes.filter(r => r.route.includes('monad'));
    expect(monadRoutes.length).toBeGreaterThanOrEqual(4);
  });

  test('all routes are marked supported', () => {
    const routes = chainService.getSupportedBridgeRoutes();
    routes.forEach(r => expect(r.supported).toBe(true));
  });
});

describe('Bridge Quote — LI.FI Fallback', () => {
  test('getBridgeQuote returns valid quote for celo→base', async () => {
    const walletAddr = chainService.getWalletAddress('celo');
    const quote = await chainService.getBridgeQuote('celo', 'base', 0.01, walletAddr);
    expect(quote.fromChain).toBe('celo');
    expect(quote.toChain).toBe('base');
    expect(quote.fromAmount).toBe('0.01');
    expect(parseFloat(quote.estimatedToAmount)).toBeGreaterThan(0);
    expect(quote.bridgeUrl).toContain('jumper.exchange');
  }, 15000);

  test('getBridgeQuote returns valid quote for base→celo', async () => {
    const walletAddr = chainService.getWalletAddress('base');
    const quote = await chainService.getBridgeQuote('base', 'celo', 0.001, walletAddr);
    expect(quote.fromChain).toBe('base');
    expect(quote.toChain).toBe('celo');
    expect(parseFloat(quote.estimatedToAmount)).toBeGreaterThan(0);
  }, 15000);

  test('getBridgeQuote returns quote for celo→monad', async () => {
    const walletAddr = chainService.getWalletAddress('celo');
    const quote = await chainService.getBridgeQuote('celo', 'monad', 0.1, walletAddr);
    expect(quote.fromChain).toBe('celo');
    expect(quote.toChain).toBe('monad');
    expect(quote.estimatedTime).toBeTruthy();
  }, 15000);

  test('unsupported route throws error', async () => {
    // Same chain is unsupported
    await expect(
      chainService.getBridgeQuote('celo', 'celo', 1.0, '0x1234567890123456789012345678901234567890')
    ).rejects.toThrow();
  }, 10000);
});

describe('Chain Config', () => {
  test('Monad chain ID is 143 (mainnet)', () => {
    const chains = chainService.getSupportedChains();
    expect(chains).toContain('monad');
    // Verify chain ID via detectChain
    expect(detectChain(undefined, 143)).toBe('monad');
    expect(detectChain(undefined, '143')).toBe('monad');
  });

  test('Base chain ID is 8453', () => {
    expect(detectChain(undefined, 8453)).toBe('base');
  });

  test('Celo chain ID is 42220', () => {
    expect(detectChain(undefined, 42220)).toBe('celo');
  });
});
