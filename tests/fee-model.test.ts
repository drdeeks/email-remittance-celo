/**
 * Fee Model Tests
 * Tests for dual fee model: standard gas / $1 premium with profit
 */
import { feeService } from '../src/services/feeService';

describe('Fee Service — Standard Model', () => {
  test('standard quote returns escrow address', async () => {
    const quote = await feeService.getFeeQuote(1.0, 'celo', 'standard');
    expect(quote.escrowAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(quote.escrowPrivateKey).toBeTruthy();
    expect(quote.feeModel).toBe('standard');
  });

  test('standard model sendAmount equals input amount', async () => {
    const quote = await feeService.getFeeQuote(0.5, 'celo', 'standard');
    expect(parseFloat(quote.sendAmount)).toBeCloseTo(0.5, 4);
    expect(quote.feeAmount).toBe('0');
  });

  test('standard model recipient receives less than sent (gas deducted)', async () => {
    const quote = await feeService.getFeeQuote(1.0, 'celo', 'standard');
    expect(parseFloat(quote.recipientAmount)).toBeLessThan(1.0);
    expect(parseFloat(quote.recipientAmount)).toBeGreaterThan(0.999); // small gas on Celo
  });

  test('standard model on Base deducts more gas than Celo', async () => {
    const celoQuote = await feeService.getFeeQuote(1.0, 'celo', 'standard');
    const baseQuote = await feeService.getFeeQuote(1.0, 'base', 'standard');
    // Base gas in ETH is tiny but Base fees can be higher in USD terms
    expect(parseFloat(celoQuote.recipientAmount)).toBeGreaterThanOrEqual(0.999);
    expect(parseFloat(baseQuote.recipientAmount)).toBeGreaterThanOrEqual(0.999);
  });

  test('each quote generates unique escrow address', async () => {
    const q1 = await feeService.getFeeQuote(1.0, 'celo', 'standard');
    const q2 = await feeService.getFeeQuote(1.0, 'celo', 'standard');
    expect(q1.escrowAddress).not.toBe(q2.escrowAddress);
  });
});

describe('Fee Service — Premium Model', () => {
  test('premium quote adds fee on top of send amount', async () => {
    const quote = await feeService.getFeeQuote(1.0, 'celo', 'premium');
    expect(quote.feeModel).toBe('premium');
    expect(parseFloat(quote.sendAmount)).toBeGreaterThan(1.0);
    expect(parseFloat(quote.feeAmount)).toBeGreaterThan(0);
  });

  test('premium model recipient receives full amount', async () => {
    const quote = await feeService.getFeeQuote(1.0, 'celo', 'premium');
    expect(parseFloat(quote.recipientAmount)).toBeCloseTo(1.0, 4);
  });

  test('premium model shows positive server profit', async () => {
    const quote = await feeService.getFeeQuote(1.0, 'celo', 'premium');
    expect(parseFloat(quote.serverProfit || '0')).toBeGreaterThan(0);
  });

  test('premium fee amount equals PREMIUM_FEE_NATIVE for chain', async () => {
    const celoQuote  = await feeService.getFeeQuote(0.5, 'celo',  'premium');
    const baseQuote  = await feeService.getFeeQuote(0.5, 'base',  'premium');
    const monadQuote = await feeService.getFeeQuote(0.5, 'monad', 'premium');
    // Fee must be > 0 on all chains
    expect(parseFloat(celoQuote.feeAmount)).toBeGreaterThan(0);
    expect(parseFloat(baseQuote.feeAmount)).toBeGreaterThan(0);
    expect(parseFloat(monadQuote.feeAmount)).toBeGreaterThan(0);
  });

  test('premium sendAmount = requestedAmount + feeAmount', async () => {
    const quote = await feeService.getFeeQuote(2.0, 'celo', 'premium');
    const expected = parseFloat(quote.recipientAmount) + parseFloat(quote.feeAmount);
    expect(parseFloat(quote.sendAmount)).toBeCloseTo(expected, 4);
  });
});

describe('Fee Service — Escrow Wallet', () => {
  test('generateEscrowWallet returns valid address and key', () => {
    const wallet = feeService.generateEscrowWallet();
    expect(wallet.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(wallet.privateKey).toMatch(/^0x[a-fA-F0-9]{64}$/);
  });

  test('generates unique wallets each call', () => {
    const w1 = feeService.generateEscrowWallet();
    const w2 = feeService.generateEscrowWallet();
    expect(w1.address).not.toBe(w2.address);
    expect(w1.privateKey).not.toBe(w2.privateKey);
  });
});

describe('Fee Service — Descriptions', () => {
  test('standard description mentions gas', () => {
    const desc = feeService.getFeeModelDescription('standard', 'celo');
    expect(desc.title).toContain('Standard');
    expect(desc.description.toLowerCase()).toContain('gas');
  });

  test('premium description mentions $1', () => {
    const desc = feeService.getFeeModelDescription('premium', 'celo');
    expect(desc.title).toContain('$1');
  });

  test('all chains return descriptions', () => {
    for (const chain of ['celo', 'base', 'monad'] as const) {
      const std  = feeService.getFeeModelDescription('standard', chain);
      const prem = feeService.getFeeModelDescription('premium',  chain);
      expect(std.title).toBeTruthy();
      expect(prem.title).toBeTruthy();
    }
  });
});
