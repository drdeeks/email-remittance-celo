import { defineChain } from 'viem';
import { celo, base } from 'wagmi/chains';

export const monad = defineChain({
  id: 143,
  name: 'Monad',
  nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.monad.xyz'] } },
  blockExplorers: { default: { name: 'Monadscan', url: 'https://monadscan.com' } },
});

export const supportedChains = [celo, base, monad] as const;

export const chainConfig = {
  [celo.id]: {
    name: 'Celo',
    symbol: 'CELO',
    color: '#FCFF52',
    logo: '/chains/celo.svg',
    explorer: 'https://celoscan.io',
  },
  [base.id]: {
    name: 'Base',
    symbol: 'ETH',
    color: '#0052FF',
    logo: '/chains/base.svg',
    explorer: 'https://basescan.org',
  },
  [monad.id]: {
    name: 'Monad',
    symbol: 'MON',
    color: '#836EF9',
    logo: '/chains/monad.svg',
    explorer: 'https://monadscan.com',
  },
} as const;

export type SupportedChainId = keyof typeof chainConfig;
