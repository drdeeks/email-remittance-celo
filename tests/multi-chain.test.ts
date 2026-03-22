/**
 * Multi-Chain Detection Tests
 * Tests for detectChain() function and chain routing
 */

import { detectChain, getNativeCurrency, getChainId, getExplorerUrl, CHAIN_CONFIG } from '../src/services/celoService';

describe('Chain Detection', () => {
  describe('detectChain from currency', () => {
    test('detectChain("CELO") returns "celo"', () => {
      expect(detectChain('CELO')).toBe('celo');
    });

    test('detectChain("celo") returns "celo" (case insensitive)', () => {
      expect(detectChain('celo')).toBe('celo');
    });

    test('detectChain("ETH") returns "base"', () => {
      expect(detectChain('ETH')).toBe('base');
    });

    test('detectChain("eth") returns "base" (case insensitive)', () => {
      expect(detectChain('eth')).toBe('base');
    });

    test('detectChain("ethereum") returns "base"', () => {
      expect(detectChain('ethereum')).toBe('base');
    });

    test('detectChain("MON") returns "monad"', () => {
      expect(detectChain('MON')).toBe('monad');
    });

    test('detectChain("mon") returns "monad" (case insensitive)', () => {
      expect(detectChain('mon')).toBe('monad');
    });

    test('detectChain("monad") returns "monad"', () => {
      expect(detectChain('monad')).toBe('monad');
    });
  });

  describe('detectChain from chainId', () => {
    test('detectChain(undefined, 42220) returns "celo"', () => {
      expect(detectChain(undefined, 42220)).toBe('celo');
    });

    test('detectChain(undefined, "42220") returns "celo" (string)', () => {
      expect(detectChain(undefined, '42220')).toBe('celo');
    });

    test('detectChain(undefined, 8453) returns "base"', () => {
      expect(detectChain(undefined, 8453)).toBe('base');
    });

    test('detectChain(undefined, "8453") returns "base" (string)', () => {
      expect(detectChain(undefined, '8453')).toBe('base');
    });

    test('detectChain(undefined, 143) returns "monad"', () => {
      expect(detectChain(undefined, 143)).toBe('monad');
    });

    test('detectChain(undefined, "143") returns "monad" (string)', () => {
      expect(detectChain(undefined, '143')).toBe('monad');
    });
  });

  describe('detectChain defaults', () => {
    test('detectChain() returns "celo" (default)', () => {
      expect(detectChain()).toBe('celo');
    });

    test('detectChain(undefined, undefined) returns "celo"', () => {
      expect(detectChain(undefined, undefined)).toBe('celo');
    });

    test('detectChain("", "") returns "celo"', () => {
      expect(detectChain('', '')).toBe('celo');
    });

    test('detectChain("unknown") returns "celo"', () => {
      expect(detectChain('unknown')).toBe('celo');
    });
  });

  describe('detectChain with chain name', () => {
    test('detectChain(undefined, "celo") returns "celo"', () => {
      expect(detectChain(undefined, 'celo')).toBe('celo');
    });

    test('detectChain(undefined, "base") returns "base"', () => {
      expect(detectChain(undefined, 'base')).toBe('base');
    });

    test('detectChain(undefined, "monad") returns "monad"', () => {
      expect(detectChain(undefined, 'monad')).toBe('monad');
    });
  });
});

describe('Chain Config', () => {
  describe('getNativeCurrency', () => {
    test('getNativeCurrency("celo") returns "CELO"', () => {
      expect(getNativeCurrency('celo')).toBe('CELO');
    });

    test('getNativeCurrency("base") returns "ETH"', () => {
      expect(getNativeCurrency('base')).toBe('ETH');
    });

    test('getNativeCurrency("monad") returns "MON"', () => {
      expect(getNativeCurrency('monad')).toBe('MON');
    });
  });

  describe('getChainId', () => {
    test('getChainId("celo") returns 42220', () => {
      expect(getChainId('celo')).toBe(42220);
    });

    test('getChainId("base") returns 8453', () => {
      expect(getChainId('base')).toBe(8453);
    });

    test('getChainId("monad") returns 143', () => {
      expect(getChainId('monad')).toBe(143);
    });
  });

  describe('getExplorerUrl', () => {
    test('getExplorerUrl on celo includes celoscan.io', () => {
      const url = getExplorerUrl('0xabc123', 'celo');
      expect(url).toContain('celoscan.io');
      expect(url).toContain('0xabc123');
    });

    test('getExplorerUrl on base includes basescan.org', () => {
      const url = getExplorerUrl('0xdef456', 'base');
      expect(url).toContain('basescan.org');
      expect(url).toContain('0xdef456');
    });

    test('getExplorerUrl on monad includes monadscan.com', () => {
      const url = getExplorerUrl('0xghi789', 'monad');
      expect(url).toContain('monadscan.com');
      expect(url).toContain('0xghi789');
    });
  });

  describe('CHAIN_CONFIG structure', () => {
    test('all chains have required fields', () => {
      for (const chain of ['celo', 'base', 'monad'] as const) {
        const config = CHAIN_CONFIG[chain];
        expect(config.chain).toBeDefined();
        expect(config.rpcEnvKey).toBeDefined();
        expect(config.defaultRpc).toBeDefined();
        expect(config.backupRpc).toBeDefined();
        expect(config.nativeCurrency).toBeDefined();
        expect(config.explorerBase).toBeDefined();
        expect(config.chainId).toBeGreaterThan(0);
      }
    });

    test('all chains have Uniswap Universal Router', () => {
      for (const chain of ['celo', 'base', 'monad'] as const) {
        const config = CHAIN_CONFIG[chain];
        expect(config.uniswapUniversalRouter).toMatch(/^0x[a-fA-F0-9]{40}$/);
      }
    });
  });
});
