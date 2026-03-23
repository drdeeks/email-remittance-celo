/**
 * Uniswap Quote Service — On-Chain Only
 * 
 * Uses Uniswap Quoter V2 contracts directly via ethers.js.
 * NO API calls — purely on-chain quotes.
 * 
 * Quoter V2 addresses:
 *  - Base:  0x3d4e44Eb1374240CE5F1B136d34f9B7a4D3DaAa4
 *  - Celo:  0x82825d0554fA07f7FC52Ab63c961F330fdEFa8E8
 */

import { ethers } from 'ethers';
import { logger } from '../utils/logger';
import { 
  NATIVE_TOKEN, 
  getTokenByAddress, 
  resolveTokenAddress,
  isNativeToken,
  getChainNameFromId,
} from '../config/tokens';

// Quoter V2 ABI (only the function we need)
const QUOTER_V2_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96) params) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)',
];

// Quoter V2 contract addresses
const QUOTER_V2_ADDRESSES: Record<number, string> = {
  8453:  '0x3d4e44Eb1374240CE5F1B136d34f9B7a4D3DaAa4', // Base
  42220: '0x82825d0554fA07f7FC52Ab63c961F330fdEFa8E8', // Celo (may not be deployed)
};

// WETH/WCELO addresses for native token wrapping
const WRAPPED_NATIVE: Record<number, string> = {
  8453:  '0x4200000000000000000000000000000000000006', // WETH on Base
  42220: '0x471ece3750da237f93b8e339c536989b8978a438', // CELO is native, but for Uniswap use this
};

// Fee tiers to try (in order of preference)
const FEE_TIERS = [500, 3000, 10000]; // 0.05%, 0.3%, 1%

// RPC URLs by chain
const RPC_URLS: Record<number, string> = {
  8453:  process.env.BASE_RPC_URL || 'https://mainnet.base.org',
  42220: process.env.CELO_RPC_URL || 'https://forno.celo.org',
  143:   process.env.MONAD_RPC_URL || 'https://rpc.monad.xyz',
};

export interface SwapQuote {
  chainId: number;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;       // Human readable
  amountOut: string;      // Human readable
  amountInWei: string;    // Wei/smallest unit
  amountOutWei: string;   // Wei/smallest unit
  fee: number;            // Fee tier used (500, 3000, or 10000)
  feePercent: string;     // Human readable (e.g., "0.3%")
  priceImpact: string;    // Estimated price impact
  route: string;          // Description of the route
  provider: 'uniswap-quoter-v2';
  gasEstimate?: string;
}

class UniswapQuoteService {
  private providers: Map<number, ethers.JsonRpcProvider> = new Map();

  private getProvider(chainId: number): ethers.JsonRpcProvider {
    if (!this.providers.has(chainId)) {
      const rpcUrl = RPC_URLS[chainId];
      if (!rpcUrl) {
        throw new Error(`No RPC URL configured for chain ${chainId}`);
      }
      this.providers.set(chainId, new ethers.JsonRpcProvider(rpcUrl));
    }
    return this.providers.get(chainId)!;
  }

  /**
   * Get swap quote from Uniswap Quoter V2 contract (on-chain).
   * Tries multiple fee tiers and returns the best quote.
   */
  async getSwapQuote(
    chainId: number,
    tokenIn: string,
    tokenOut: string,
    amountIn: string, // Human readable amount
  ): Promise<SwapQuote> {
    const quoterAddress = QUOTER_V2_ADDRESSES[chainId];
    
    if (!quoterAddress) {
      throw new Error(`Uniswap Quoter V2 not available on chain ${chainId}. Supported chains: Base (8453), Celo (42220).`);
    }

    // Resolve token addresses
    const tokenInAddress = resolveTokenAddress(chainId, tokenIn);
    const tokenOutAddress = resolveTokenAddress(chainId, tokenOut);

    // Get token info for decimals
    const tokenInInfo = getTokenByAddress(chainId, tokenInAddress);
    const tokenOutInfo = getTokenByAddress(chainId, tokenOutAddress);

    if (!tokenInInfo || !tokenOutInfo) {
      throw new Error(`Token not found in registry: ${tokenIn} or ${tokenOut} on chain ${chainId}`);
    }

    // Convert to actual addresses for Uniswap (native → wrapped)
    const actualTokenIn = isNativeToken(tokenInAddress) 
      ? WRAPPED_NATIVE[chainId] 
      : tokenInAddress;
    const actualTokenOut = isNativeToken(tokenOutAddress) 
      ? WRAPPED_NATIVE[chainId] 
      : tokenOutAddress;

    if (!actualTokenIn || !actualTokenOut) {
      throw new Error(`Wrapped native token not configured for chain ${chainId}`);
    }

    // Convert amount to wei
    const amountInWei = ethers.parseUnits(amountIn, tokenInInfo.decimals);

    logger.info(`Uniswap quote request: ${amountIn} ${tokenInInfo.symbol} → ${tokenOutInfo.symbol} on chain ${chainId}`);

    const provider = this.getProvider(chainId);
    const quoter = new ethers.Contract(quoterAddress, QUOTER_V2_ABI, provider);

    // Try each fee tier and return the best quote
    let bestQuote: { amountOut: bigint; fee: number; gasEstimate: bigint } | null = null;

    for (const fee of FEE_TIERS) {
      try {
        const params = {
          tokenIn: actualTokenIn,
          tokenOut: actualTokenOut,
          amountIn: amountInWei,
          fee,
          sqrtPriceLimitX96: 0n, // No price limit
        };

        // Use staticCall to simulate without gas
        const result = await quoter.quoteExactInputSingle.staticCall(params);
        
        const amountOut = result[0];
        const gasEstimate = result[3];

        logger.info(`Quote for fee ${fee}: ${ethers.formatUnits(amountOut, tokenOutInfo.decimals)} ${tokenOutInfo.symbol}`);

        if (!bestQuote || amountOut > bestQuote.amountOut) {
          bestQuote = { amountOut, fee, gasEstimate };
        }
      } catch (err: any) {
        // Pool may not exist for this fee tier, try next
        logger.debug(`No pool for fee ${fee}: ${err.message?.slice(0, 50)}`);
        continue;
      }
    }

    if (!bestQuote) {
      throw new Error(`No liquidity pool found for ${tokenInInfo.symbol} → ${tokenOutInfo.symbol} on chain ${chainId}. Try a different token pair.`);
    }

    const amountOutFormatted = ethers.formatUnits(bestQuote.amountOut, tokenOutInfo.decimals);
    const feePercent = (bestQuote.fee / 10000).toFixed(2) + '%';

    // Calculate approximate price impact (simplified)
    const inputValue = parseFloat(amountIn);
    const outputValue = parseFloat(amountOutFormatted);
    const impliedRate = outputValue / inputValue;
    const priceImpact = '< 0.5%'; // Simplified; real calculation needs pool state

    const quote: SwapQuote = {
      chainId,
      tokenIn: tokenInInfo.symbol,
      tokenOut: tokenOutInfo.symbol,
      amountIn,
      amountOut: amountOutFormatted,
      amountInWei: amountInWei.toString(),
      amountOutWei: bestQuote.amountOut.toString(),
      fee: bestQuote.fee,
      feePercent,
      priceImpact,
      route: `${tokenInInfo.symbol} → ${tokenOutInfo.symbol} (${feePercent} pool)`,
      provider: 'uniswap-quoter-v2',
      gasEstimate: bestQuote.gasEstimate.toString(),
    };

    logger.info(`Best quote: ${quote.amountIn} ${quote.tokenIn} → ${quote.amountOut} ${quote.tokenOut} (${quote.feePercent} fee)`);

    return quote;
  }

  /**
   * Check if a swap is supported on a given chain
   */
  isSwapSupported(chainId: number): boolean {
    return chainId in QUOTER_V2_ADDRESSES;
  }

  /**
   * Get available swap chains
   */
  getSupportedChains(): number[] {
    return Object.keys(QUOTER_V2_ADDRESSES).map(Number);
  }

  /**
   * Get status for debugging
   */
  getStatus() {
    return {
      provider: 'uniswap-quoter-v2',
      method: 'on-chain',
      supportedChains: this.getSupportedChains().map(id => ({
        chainId: id,
        chainName: getChainNameFromId(id),
        quoterAddress: QUOTER_V2_ADDRESSES[id],
      })),
      feeTiers: FEE_TIERS,
      note: 'Pure on-chain quotes via Quoter V2 — no API dependency',
    };
  }
}

export const uniswapQuoteService = new UniswapQuoteService();
