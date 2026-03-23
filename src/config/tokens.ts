/**
 * Token Registry — Multi-Token Support
 * 
 * Defines supported tokens per chain for swap functionality.
 * Native tokens use address 0x0 or NATIVE constant.
 */

export const NATIVE_TOKEN = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  isNative: boolean;
  logoUri?: string;
}

export interface ChainTokens {
  chainId: number;
  chainName: string;
  nativeCurrency: string;
  tokens: TokenInfo[];
}

// Celo Mainnet (42220)
const CELO_TOKENS: TokenInfo[] = [
  {
    address: NATIVE_TOKEN,
    symbol: 'CELO',
    name: 'Celo',
    decimals: 18,
    isNative: true,
  },
  {
    address: '0x765de816845861e75a25fca122bb6898b8b1282a',
    symbol: 'cUSD',
    name: 'Celo Dollar',
    decimals: 18,
    isNative: false,
  },
  {
    address: '0xceba9300f2b948710d2653dd7b07f33a8b32118c',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    isNative: false,
  },
];

// Base Mainnet (8453)
const BASE_TOKENS: TokenInfo[] = [
  {
    address: NATIVE_TOKEN,
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    isNative: true,
  },
  {
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    isNative: false,
  },
  {
    address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    isNative: false,
  },
];

// Monad Mainnet (143) - Limited token support
const MONAD_TOKENS: TokenInfo[] = [
  {
    address: NATIVE_TOKEN,
    symbol: 'MON',
    name: 'Monad',
    decimals: 18,
    isNative: true,
  },
  // USDC address not yet available on Monad mainnet
];

export const TOKEN_REGISTRY: Record<number, ChainTokens> = {
  42220: {
    chainId: 42220,
    chainName: 'celo',
    nativeCurrency: 'CELO',
    tokens: CELO_TOKENS,
  },
  8453: {
    chainId: 8453,
    chainName: 'base',
    nativeCurrency: 'ETH',
    tokens: BASE_TOKENS,
  },
  143: {
    chainId: 143,
    chainName: 'monad',
    nativeCurrency: 'MON',
    tokens: MONAD_TOKENS,
  },
};

// Helper functions
export function getTokensByChain(chainId: number): TokenInfo[] {
  return TOKEN_REGISTRY[chainId]?.tokens || [];
}

export function getTokenBySymbol(chainId: number, symbol: string): TokenInfo | undefined {
  const tokens = getTokensByChain(chainId);
  return tokens.find(t => t.symbol.toLowerCase() === symbol.toLowerCase());
}

export function getTokenByAddress(chainId: number, address: string): TokenInfo | undefined {
  const tokens = getTokensByChain(chainId);
  const normalizedAddress = address.toLowerCase();
  return tokens.find(t => t.address.toLowerCase() === normalizedAddress);
}

export function isNativeToken(address: string): boolean {
  const normalized = address.toLowerCase();
  return normalized === NATIVE_TOKEN.toLowerCase() || 
         normalized === ZERO_ADDRESS ||
         normalized === 'native' ||
         normalized === 'eth' ||
         normalized === 'celo' ||
         normalized === 'mon';
}

export function getNativeTokenAddress(): string {
  return NATIVE_TOKEN;
}

export function resolveTokenAddress(chainId: number, symbolOrAddress: string): string {
  // If it looks like an address, return as-is
  if (symbolOrAddress.startsWith('0x') && symbolOrAddress.length === 42) {
    return symbolOrAddress;
  }
  
  // Check for native token keywords
  if (isNativeToken(symbolOrAddress)) {
    return NATIVE_TOKEN;
  }
  
  // Look up by symbol
  const token = getTokenBySymbol(chainId, symbolOrAddress);
  if (token) {
    return token.address;
  }
  
  throw new Error(`Unknown token: ${symbolOrAddress} on chain ${chainId}`);
}

export function getChainIdFromName(chainName: string): number {
  const name = chainName.toLowerCase();
  if (name === 'celo') return 42220;
  if (name === 'base') return 8453;
  if (name === 'monad') return 143;
  throw new Error(`Unknown chain: ${chainName}`);
}

export function getChainNameFromId(chainId: number): string {
  const chain = TOKEN_REGISTRY[chainId];
  if (!chain) throw new Error(`Unknown chainId: ${chainId}`);
  return chain.chainName;
}
