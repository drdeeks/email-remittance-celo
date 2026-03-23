/**
 * Swap Service — Execute Uniswap Swaps On-Chain
 * 
 * Uses Uniswap SwapRouter02 contracts directly via ethers.js.
 * Handles:
 *  1. Native ETH → Token swaps
 *  2. Token → Token swaps
 *  3. Token → Native ETH swaps
 * 
 * SwapRouter02 addresses:
 *  - Base: 0x2626664c2603336E57B271c5C0b26F421741e481
 */

import { ethers } from 'ethers';
import { logger } from '../utils/logger';
import { uniswapQuoteService, type SwapQuote } from './uniswapQuoteService';
import { 
  NATIVE_TOKEN, 
  getTokenByAddress, 
  resolveTokenAddress,
  isNativeToken,
  getTokensByChain,
  getChainNameFromId,
} from '../config/tokens';

// SwapRouter02 ABI (functions we need)
const SWAP_ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params) external payable returns (uint256 amountOut)',
  'function multicall(uint256 deadline, bytes[] data) external payable returns (bytes[] memory)',
  'function unwrapWETH9(uint256 amountMinimum, address recipient) external payable',
];

// ERC20 ABI for approvals
const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
];

// SwapRouter02 contract addresses
const SWAP_ROUTER_ADDRESSES: Record<number, string> = {
  8453:  '0x2626664c2603336E57B271c5C0b26F421741e481', // Base
  42220: '0x5615CDAb10dc425a742d643d949a7F474C01abc4', // Celo SwapRouter02 (may vary)
};

// WETH addresses
const WRAPPED_NATIVE: Record<number, string> = {
  8453:  '0x4200000000000000000000000000000000000006', // WETH on Base
  42220: '0x471ece3750da237f93b8e339c536989b8978a438', // CELO
};

// RPC URLs
const RPC_URLS: Record<number, string> = {
  8453:  process.env.BASE_RPC_URL || 'https://mainnet.base.org',
  42220: process.env.CELO_RPC_URL || 'https://forno.celo.org',
};

// Default slippage: 0.5%
const DEFAULT_SLIPPAGE_BPS = 50; // 0.5% = 50 basis points

export interface SwapParams {
  chainId: number;
  tokenIn: string;         // Symbol or address
  tokenOut: string;        // Symbol or address
  amountIn: string;        // Human readable
  slippageBps?: number;    // Basis points (50 = 0.5%)
  recipient: string;       // Recipient address
  privateKey: string;      // Signer private key
}

export interface SwapResult {
  txHash: string;
  chainId: number;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOut: string;       // Actual output amount
  fee: number;
  explorerUrl: string;
}

class SwapService {
  /**
   * Execute a swap using Uniswap SwapRouter02.
   * Handles native token wrapping/unwrapping automatically.
   */
  async executeSwap(params: SwapParams): Promise<SwapResult> {
    const {
      chainId,
      tokenIn,
      tokenOut,
      amountIn,
      slippageBps = DEFAULT_SLIPPAGE_BPS,
      recipient,
      privateKey,
    } = params;

    const routerAddress = SWAP_ROUTER_ADDRESSES[chainId];
    if (!routerAddress) {
      throw new Error(`SwapRouter02 not available on chain ${chainId}. Supported: Base (8453).`);
    }

    // Get quote first
    const quote = await uniswapQuoteService.getSwapQuote(chainId, tokenIn, tokenOut, amountIn);

    // Resolve addresses
    const tokenInAddress = resolveTokenAddress(chainId, tokenIn);
    const tokenOutAddress = resolveTokenAddress(chainId, tokenOut);
    
    const tokenInInfo = getTokenByAddress(chainId, tokenInAddress)!;
    const tokenOutInfo = getTokenByAddress(chainId, tokenOutAddress)!;

    const isNativeIn = isNativeToken(tokenInAddress);
    const isNativeOut = isNativeToken(tokenOutAddress);

    // Calculate minimum output with slippage
    const amountOutWei = BigInt(quote.amountOutWei);
    const slippageMultiplier = BigInt(10000 - slippageBps);
    const amountOutMinimum = (amountOutWei * slippageMultiplier) / 10000n;

    logger.info(`Executing swap: ${amountIn} ${tokenInInfo.symbol} → ${tokenOutInfo.symbol}`);
    logger.info(`Min output: ${ethers.formatUnits(amountOutMinimum, tokenOutInfo.decimals)} ${tokenOutInfo.symbol} (${slippageBps / 100}% slippage)`);

    // Setup provider and signer
    const rpcUrl = RPC_URLS[chainId];
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    const router = new ethers.Contract(routerAddress, SWAP_ROUTER_ABI, wallet);

    // Actual token addresses for the swap (native → wrapped)
    const actualTokenIn = isNativeIn ? WRAPPED_NATIVE[chainId] : tokenInAddress;
    const actualTokenOut = isNativeOut ? WRAPPED_NATIVE[chainId] : tokenOutAddress;

    const amountInWei = ethers.parseUnits(amountIn, tokenInInfo.decimals);
    const deadline = Math.floor(Date.now() / 1000) + 1800; // 30 minutes

    let txHash: string;

    if (isNativeIn) {
      // Native → Token: Send ETH value with the call
      logger.info(`Swapping native ${tokenInInfo.symbol} for ${tokenOutInfo.symbol}`);

      const swapParams = {
        tokenIn: actualTokenIn,
        tokenOut: actualTokenOut,
        fee: quote.fee,
        recipient: isNativeOut ? routerAddress : recipient, // If unwrapping, route through router
        amountIn: amountInWei,
        amountOutMinimum,
        sqrtPriceLimitX96: 0n,
      };

      const tx = await router.exactInputSingle(swapParams, { value: amountInWei });
      const receipt = await tx.wait();
      txHash = receipt.hash;

    } else {
      // Token → Token or Token → Native
      // Need to approve router first
      const tokenContract = new ethers.Contract(tokenInAddress, ERC20_ABI, wallet);
      
      // Check allowance
      const currentAllowance = await tokenContract.allowance(wallet.address, routerAddress);
      if (currentAllowance < amountInWei) {
        logger.info(`Approving ${tokenInInfo.symbol} for SwapRouter02...`);
        const approveTx = await tokenContract.approve(routerAddress, ethers.MaxUint256);
        await approveTx.wait();
        logger.info('Approval confirmed');
      }

      const swapParams = {
        tokenIn: actualTokenIn,
        tokenOut: actualTokenOut,
        fee: quote.fee,
        recipient: isNativeOut ? routerAddress : recipient,
        amountIn: amountInWei,
        amountOutMinimum,
        sqrtPriceLimitX96: 0n,
      };

      if (isNativeOut) {
        // Token → Native: Use multicall to swap then unwrap
        logger.info(`Swapping ${tokenInInfo.symbol} for native ${tokenOutInfo.symbol}`);

        const swapCalldata = router.interface.encodeFunctionData('exactInputSingle', [swapParams]);
        const unwrapCalldata = router.interface.encodeFunctionData('unwrapWETH9', [amountOutMinimum, recipient]);

        const tx = await router.multicall(deadline, [swapCalldata, unwrapCalldata]);
        const receipt = await tx.wait();
        txHash = receipt.hash;
      } else {
        // Token → Token
        logger.info(`Swapping ${tokenInInfo.symbol} for ${tokenOutInfo.symbol}`);
        
        const tx = await router.exactInputSingle(swapParams);
        const receipt = await tx.wait();
        txHash = receipt.hash;
      }
    }

    const explorerBase = chainId === 8453 
      ? 'https://basescan.org/tx' 
      : 'https://celoscan.io/tx';

    const result: SwapResult = {
      txHash,
      chainId,
      tokenIn: tokenInInfo.symbol,
      tokenOut: tokenOutInfo.symbol,
      amountIn,
      amountOut: quote.amountOut,
      fee: quote.fee,
      explorerUrl: `${explorerBase}/${txHash}`,
    };

    logger.info(`Swap completed: ${txHash}`);
    return result;
  }

  /**
   * Execute swap and deposit to escrow contract.
   * Used when sender pays in token A but wants to escrow token B.
   */
  async swapAndDeposit(params: {
    chainId: number;
    fromToken: string;
    toToken: string;
    amountIn: string;
    escrowAddress: string;
    privateKey: string;
  }): Promise<{ swapResult: SwapResult; finalAmount: string }> {
    const { chainId, fromToken, toToken, amountIn, escrowAddress, privateKey } = params;

    // If same token, no swap needed
    if (fromToken.toLowerCase() === toToken.toLowerCase()) {
      logger.info('Same token — no swap needed');
      return {
        swapResult: {
          txHash: '',
          chainId,
          tokenIn: fromToken,
          tokenOut: toToken,
          amountIn,
          amountOut: amountIn,
          fee: 0,
          explorerUrl: '',
        },
        finalAmount: amountIn,
      };
    }

    // Execute swap to escrow address directly
    const swapResult = await this.executeSwap({
      chainId,
      tokenIn: fromToken,
      tokenOut: toToken,
      amountIn,
      recipient: escrowAddress,
      privateKey,
    });

    return {
      swapResult,
      finalAmount: swapResult.amountOut,
    };
  }

  /**
   * Check if swaps are supported on chain
   */
  isSwapSupported(chainId: number): boolean {
    return chainId in SWAP_ROUTER_ADDRESSES && uniswapQuoteService.isSwapSupported(chainId);
  }

  /**
   * Get available tokens for swaps on a chain
   */
  getSwapTokens(chainId: number) {
    if (!this.isSwapSupported(chainId)) {
      return [];
    }
    return getTokensByChain(chainId);
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      provider: 'uniswap-swap-router-02',
      method: 'on-chain',
      supportedChains: Object.keys(SWAP_ROUTER_ADDRESSES).map(Number).map(id => ({
        chainId: id,
        chainName: getChainNameFromId(id),
        routerAddress: SWAP_ROUTER_ADDRESSES[id],
      })),
      defaultSlippage: `${DEFAULT_SLIPPAGE_BPS / 100}%`,
      note: 'Direct on-chain swaps via SwapRouter02 — no API dependency',
    };
  }
}

export const swapService = new SwapService();
