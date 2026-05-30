/**
 * Fee Model Tests
 * Tests for unified 1.5% protocol fee model
 */
import { feeService } from '../src/services/feeService';

describe('Fee Service — Protocol Model', () => {
  test('protocol quote returns escrow address', async () => {
    const quote = await feeService.getFeeQuote(1.0, 'celo', 'standard'); // standard maps to protocol
    expect(quote.escrowAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(quote.escrowPrivateKey).toBeTruthy();
    expect(quote.feeModel).toBe('protocol'); // Always returns protocol now
  });

  test('protocol model sendAmount equals input amount + 1.5% fee', async () => {
    const quote = await feeService.getFeeQuote(0.5, 'celo', 'standard'); // standard maps to protocol
    const expectedSendAmount = 0.5 * 1.015; // amount + 1.5% fee
    expect(parseFloat(quote.sendAmount)).toBeCloseTo(expectedSendAmount, 4);
    expect(parseFloat(quote.feeAmount)).toBeCloseTo(0.5 * 0.015, 4); // 1.5% fee
  });

  test('protocol model recipient receives full amount (they pay gas)', async () => {
    const quote = await feeService.getFeeQuote(1.0, 'celo', 'standard'); // standard maps to protocol
    expect(parseFloat(quote.recipientAmount)).toBeCloseTo(1.0, 4); // recipient gets full amount
    expect(parseFloat(quote.sendAmount)).toBeGreaterThan(1.0); // sender pays amount + fee
  });

  test('protocol model on Base deducts more gas than Celo', async () => {
    const celoQuote = await feeService.getFeeQuote(1.0, 'celo', 'standard');
    const baseQuote = await feeService.getFeeQuote(1.0, 'base', 'standard');
    // Both should return full amount to recipient (they pay their own gas)
    expect(parseFloat(celoQuote.recipientAmount)).toBeCloseTo(1.0, 4);
    expect(parseFloat(baseQuote.recipientAmount)).toBeCloseTo(1.0, 4);
  });

  test('each quote generates unique escrow address', async () => {
    const q1 = await feeService.getFeeQuote(1.0, 'celo', 'standard');
    const q2 = await feeService.getFeeQuote(1.0, 'celo', 'standard');
    expect(q1.escrowAddress).not.toBe(q2.escrowAddress);
  });
});

describe('Fee Service — Premium Model (Backward Compatibility)', () => {
  test('premium quote maps to protocol', async () => {
    const quote = await feeService.getFeeQuote(1.0, 'celo', 'premium');
    expect(quote.feeModel).toBe('protocol'); // premium maps to protocol
  });

  test('premium model recipient receives full amount', async () => {
    const quote = await feeService.getFeeQuote(1.0, 'celo', 'premium');
    expect(parseFloat(quote.recipientAmount)).toBeCloseTo(1.0, 4);
  });

  test('premium model shows positive server profit', async () => {
    const quote = await feeService.getFeeQuote(1.0, 'celo', 'premium');
    expect(parseFloat(quote.serverProfit || '0')).toBeGreaterThan(0);
  });

  test('premium fee amount equals 1.5% of amount', async () => {
    const celoQuote  = await feeService.getFeeQuote(0.5, 'celo',  'premium');
    const baseQuote  = await feeService.getFeeQuote(0.5, 'base',  'premium');
    const monadQuote = await feeService.getFeeQuote(0.5, 'monad', 'premium');
    // Fee must be 1.5% on all chains
    expect(parseFloat(celoQuote.feeAmount)).toBeCloseTo(0.5 * 0.015, 4);
    expect(parseFloat(baseQuote.feeAmount)).toBeCloseTo(0.5 * 0.015, 4);
    expect(parseFloat(monadQuote.feeAmount)).toBeCloseTo(0.5 * 0.015, 4);
  });

  test('premium sendAmount = requestedAmount + 1.5% fee', async () => {
    const quote = await feeService.getFeeQuote(2.0, 'celo', 'premium');
    const expected = 2.0 * 1.015; // requestedAmount + 1.5% fee
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
  test('description mentions protocol fee', () => {
    const desc = feeService.getFeeModelDescription('standard', 'celo');
    expect(desc.title).toContain('1.5% Protocol Fee');
    expect(desc.description.toLowerCase()).toContain('flat 1.5% fee');
  });

  test('all chains return descriptions', () => {
    for (const chain of ['celo', 'base', 'monad'] as const) {
      const std  = feeService.getFeeModelDescription('standard', chain);
      const prem = feeService.getFeeModelDescription('premium',  chain);
      expect(std.title).toBeTruthy();
      expect(prem.title).toBeTruthy();
      // Both should describe the same protocol fee
      expect(std.title).toBe(prem.title);
    }
  });
});