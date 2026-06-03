import { uniswapService } from './uniswapService';
import { chainService } from './celoService';
import { swapService } from './swapService';

describe('Fee Deduction Logic', () => {
  const walletAddress = '0x000000000000000000000000000000000000dEaD';
  const testAmount = '100';
  const expectedBridgeFee = 1.5; // 1.5%
  const expectedSwapFee = 1.5; // 1.5%

  // Mock environment variables for consistent testing
  beforeAll(() => {
    process.env.BRIDGE_FEE_PERCENTAGE = expectedBridgeFee.toString();
    process.env.SWAP_FEE_PERCENTAGE = expectedSwapFee.toString();
  });

  it('should deduct 1.5% bridge fee from 100 CELO → Base', async () => {
    const bridgeQuote = await uniswapService.getBridgeQuote(
      'celo',
      'base',
      testAmount,
      true // deductFee
    );

    // Static fallback logic from uniswapService.ts:371
    const expectedAmountOut = (100 * 0.997 * (1 - expectedBridgeFee / 100)).toFixed(6);
    expect(bridgeQuote.estimatedAmountOut).toBe(expectedAmountOut);
  });

  it('should deduct 1.5% swap fee from ETH → USDC on Base', async () => {
    // Mock the LI.FI fallback response for swap quote
    const swapQuote = await uniswapService.getSwapQuote({
      chain: 'base',
      tokenIn: 'NATIVE',
      tokenOut: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
      amountIn: '49.25', // Output from bridge step
      swapper: walletAddress,
      deductFee: true
    });

    // Static fallback logic from uniswapService.ts:136
    const expectedAmountOut = (49.25 * 0.997 * (1 - expectedSwapFee / 100)).toFixed(6);
    expect(swapQuote.amountOut).toBe(expectedAmountOut);
  });

  it('should calculate correct end-to-end output (100 CELO → ~97,022.5 USDC)', async () => {
    // Step 1: Bridge CELO → ETH (1.5% fee)
    const bridgeQuote = await uniswapService.getBridgeQuote('celo', 'base', '100', true);
    const bridgeOutput = parseFloat(bridgeQuote.estimatedAmountOut);

    // Step 2: Swap ETH → USDC (1.5% fee)
    const swapQuote = await uniswapService.getSwapQuote({
      chain: 'base',
      tokenIn: 'NATIVE',
      tokenOut: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
      amountIn: bridgeOutput.toString(),
      swapper: walletAddress,
      deductFee: true
    });
    const swapOutput = parseFloat(swapQuote.amountOut);

    // Expected: 100 CELO → 49.25 ETH → 97,022.5 USDC
    const expectedUSDC = 97022.5;
    expect(swapOutput).toBeCloseTo(expectedUSDC, -2); // Allow ±100 USDC tolerance
  });
});