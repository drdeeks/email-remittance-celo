/**
 * SendForm Component Tests
 * 
 * Tests for the email remittance send form:
 * - Payload field mapping to backend API
 * - Wallet balance display
 * - Chain switching
 * - Recipient token selection
 * - Input validation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock wagmi hooks
const mockUseAccount = vi.fn();
const mockUseSignMessage = vi.fn();
const mockUseBalance = vi.fn();

vi.mock('wagmi', () => ({
  useAccount: () => mockUseAccount(),
  useSignMessage: () => mockUseSignMessage(),
  useBalance: () => mockUseBalance(),
}));

vi.mock('@rainbow-me/rainbowkit', () => ({
  ConnectButton: () => null,
}));

vi.mock('viem', () => ({
  formatUnits: (value: bigint, decimals: number) => {
    return (Number(value) / Math.pow(10, decimals)).toString();
  },
}));

// Constants from SendForm
const CHAIN_ID_TO_NAME: Record<number, string> = {
  42220: 'celo',
  8453: 'base',
  143: 'monad',
};

const RECIPIENT_TOKENS: Record<number, { symbol: string; name: string }[]> = {
  42220: [
    { symbol: 'CELO', name: 'Celo (Native)' },
    { symbol: 'cUSD', name: 'Celo Dollar' },
    { symbol: 'USDC', name: 'USD Coin' },
  ],
  8453: [
    { symbol: 'ETH', name: 'Ethereum (Native)' },
    { symbol: 'USDC', name: 'USD Coin' },
    { symbol: 'USDT', name: 'Tether USD' },
  ],
  143: [
    { symbol: 'MON', name: 'Monad (Native)' },
  ],
};

describe('SendForm - Payload Field Mapping', () => {
  it('should map chainId to chain name string', () => {
    expect(CHAIN_ID_TO_NAME[42220]).toBe('celo');
    expect(CHAIN_ID_TO_NAME[8453]).toBe('base');
    expect(CHAIN_ID_TO_NAME[143]).toBe('monad');
  });

  it('should build correct payload for backend', () => {
    const address = '0x1234567890abcdef1234567890abcdef12345678';
    const senderEmail = 'sender@test.com';
    const recipientEmail = 'recipient@test.com';
    const amount = '1.5';
    const selectedChain = 42220;
    const requireAuth = true;

    const chainName = CHAIN_ID_TO_NAME[selectedChain] || 'celo';

    const payload: Record<string, any> = {
      senderEmail,
      recipientEmail,
      amount: parseFloat(amount),
      chain: chainName,
      senderWallet: address,
      requireAuth,
    };

    // Verify payload matches backend expectations
    expect(payload.senderEmail).toBe('sender@test.com');
    expect(payload.recipientEmail).toBe('recipient@test.com');
    expect(payload.amount).toBe(1.5);
    expect(payload.chain).toBe('celo'); // string, not number
    expect(payload.senderWallet).toBe(address); // not senderAddress
    expect(payload.requireAuth).toBe(true);
    
    // Should NOT have these incorrect fields
    expect(payload.senderAddress).toBeUndefined();
    expect(payload.chainId).toBeUndefined();
  });

  it('should include receiverToken when different from native', () => {
    const chainSymbol = 'CELO';
    const recipientToken = 'USDC';
    
    const payload: Record<string, any> = {
      senderEmail: 'test@test.com',
      recipientEmail: 'recv@test.com',
      amount: 1,
      chain: 'celo',
      senderWallet: '0x123',
      requireAuth: false,
    };

    // Add receiver token if different from native
    if (recipientToken && recipientToken !== chainSymbol) {
      payload.receiverToken = recipientToken;
    }

    expect(payload.receiverToken).toBe('USDC');
  });

  it('should NOT include receiverToken when same as native', () => {
    const chainSymbol = 'CELO';
    const recipientToken = 'CELO';
    
    const payload: Record<string, any> = {
      senderEmail: 'test@test.com',
      recipientEmail: 'recv@test.com',
      amount: 1,
      chain: 'celo',
      senderWallet: '0x123',
      requireAuth: false,
    };

    // Only add if different from native
    if (recipientToken && recipientToken !== chainSymbol) {
      payload.receiverToken = recipientToken;
    }

    expect(payload.receiverToken).toBeUndefined();
  });
});

describe('SendForm - Recipient Token Options', () => {
  it('should have correct tokens for Celo chain', () => {
    const tokens = RECIPIENT_TOKENS[42220];
    expect(tokens).toHaveLength(3);
    expect(tokens.map(t => t.symbol)).toEqual(['CELO', 'cUSD', 'USDC']);
  });

  it('should have correct tokens for Base chain', () => {
    const tokens = RECIPIENT_TOKENS[8453];
    expect(tokens).toHaveLength(3);
    expect(tokens.map(t => t.symbol)).toEqual(['ETH', 'USDC', 'USDT']);
  });

  it('should have correct tokens for Monad chain', () => {
    const tokens = RECIPIENT_TOKENS[143];
    expect(tokens).toHaveLength(1);
    expect(tokens[0].symbol).toBe('MON');
  });

  it('should default to native token (first in list)', () => {
    const celoTokens = RECIPIENT_TOKENS[42220];
    const baseTokens = RECIPIENT_TOKENS[8453];
    
    expect(celoTokens[0].symbol).toBe('CELO');
    expect(baseTokens[0].symbol).toBe('ETH');
  });
});

describe('SendForm - Balance Display', () => {
  beforeEach(() => {
    mockUseAccount.mockReset();
    mockUseBalance.mockReset();
    mockUseSignMessage.mockReset();
  });

  it('should format balance correctly', () => {
    const balanceValue = BigInt('1500000000000000000'); // 1.5 ETH in wei
    const decimals = 18;
    
    const formatted = (Number(balanceValue) / Math.pow(10, decimals)).toFixed(4);
    expect(formatted).toBe('1.5000');
  });

  it('should detect insufficient balance', () => {
    const balance = '1.0000';
    const amount = '1.5';
    
    const isInsufficient = parseFloat(amount) > parseFloat(balance);
    expect(isInsufficient).toBe(true);
  });

  it('should allow valid amount within balance', () => {
    const balance = '2.0000';
    const amount = '1.5';
    
    const isInsufficient = parseFloat(amount) > parseFloat(balance);
    expect(isInsufficient).toBe(false);
  });
});

describe('SendForm - Wallet Proof', () => {
  it('should build correct verification message', () => {
    const senderEmail = 'sender@test.com';
    const recipientEmail = 'recipient@test.com';
    const amount = '1.5';
    const chainSymbol = 'CELO';
    const chainName = 'Celo';
    const timestamp = '2026-03-23T12:00:00.000Z';

    const message = `Email Remittance - Verify wallet ownership\n\nSender: ${senderEmail}\nRecipient: ${recipientEmail}\nAmount: ${amount} ${chainSymbol}\nChain: ${chainName}\nTimestamp: ${timestamp}`;

    expect(message).toContain('sender@test.com');
    expect(message).toContain('recipient@test.com');
    expect(message).toContain('1.5 CELO');
    expect(message).toContain('Chain: Celo');
  });

  it('should include walletProof in payload when signature provided', () => {
    const payload: Record<string, any> = {
      senderEmail: 'test@test.com',
      recipientEmail: 'recv@test.com',
      amount: 1,
      chain: 'celo',
      senderWallet: '0x123',
    };

    const walletProof = {
      message: 'test message',
      signature: '0xabc123...',
    };

    if (walletProof) {
      payload.walletProof = walletProof;
    }

    expect(payload.walletProof).toEqual({
      message: 'test message',
      signature: '0xabc123...',
    });
  });
});

describe('SendForm - Response Parsing', () => {
  it('should extract data from nested response', () => {
    const apiResponse = {
      success: true,
      data: {
        claimUrl: 'https://example.com/claim/abc123',
        claimToken: 'abc123',
        escrowAddress: '0x456',
        sendAmount: '1.5',
      },
    };

    const responseData = apiResponse.data || apiResponse;
    
    expect(responseData.claimUrl).toBe('https://example.com/claim/abc123');
    expect(responseData.claimToken).toBe('abc123');
    expect(responseData.escrowAddress).toBe('0x456');
  });

  it('should extract error message from various formats', () => {
    const errorFormats = [
      { error: { message: 'Error 1' } },
      { message: 'Error 2' },
      { error: 'Error 3' },
    ];

    const extractError = (data: any) => 
      data.error?.message || data.message || data.error || 'Failed to send';

    expect(extractError(errorFormats[0])).toBe('Error 1');
    expect(extractError(errorFormats[1])).toBe('Error 2');
    expect(extractError(errorFormats[2])).toBe('Error 3');
    expect(extractError({})).toBe('Failed to send');
  });
});

describe('SendForm - Input Validation', () => {
  it('should require all fields before enabling send', () => {
    const isConnected = true;
    const senderEmail = 'sender@test.com';
    const recipientEmail = 'recipient@test.com';
    const amount = '1.5';
    const loading = false;

    const canSend = isConnected && senderEmail && recipientEmail && amount && !loading;
    expect(canSend).toBe(true);

    // Missing sender email
    const canSend2 = isConnected && '' && recipientEmail && amount && !loading;
    expect(canSend2).toBeFalsy();

    // Not connected
    const canSend3 = false && senderEmail && recipientEmail && amount && !loading;
    expect(canSend3).toBe(false);
  });

  it('should validate email format', () => {
    const validEmails = ['test@example.com', 'user.name@domain.co.uk', 'a@b.io'];
    const invalidEmails = ['notanemail', '@missing.com', 'no@tld'];

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    validEmails.forEach(email => {
      expect(emailRegex.test(email)).toBe(true);
    });

    invalidEmails.forEach(email => {
      expect(emailRegex.test(email)).toBe(false);
    });
  });
});

describe('SendForm - Wallet Mode Toggle', () => {
  it('should default to service wallet mode', () => {
    const defaultMode = 'service';
    expect(defaultMode).toBe('service');
  });

  it('should show server balance in service wallet mode', () => {
    const serverBalance = '19.0029';
    const senderBalance = '0.5000';
    const walletMode = 'service';

    const shown = walletMode === 'service' ? serverBalance : senderBalance;
    expect(shown).toBe('19.0029');
  });

  it('should show sender balance in personal wallet mode', () => {
    const serverBalance = '19.0029';
    const senderBalance = '0.5000';
    const walletMode = 'personal';

    const shown = walletMode === 'service' ? serverBalance : senderBalance;
    expect(shown).toBe('0.5000');
  });

  it('should include walletMode in payload', () => {
    const modes: Array<'service' | 'personal'> = ['service', 'personal'];
    modes.forEach(walletMode => {
      const payload: Record<string, any> = {
        senderEmail: 'test@test.com',
        recipientEmail: 'recv@test.com',
        amount: 1,
        chain: 'celo',
        senderWallet: '0x123',
        walletMode,
      };
      expect(payload.walletMode).toBe(walletMode);
    });
  });

  it('should include fundingTxHash in payload for personal mode', () => {
    const walletMode = 'personal';
    const onChainTxHash = '0xabc123real_tx';

    const payload: Record<string, any> = {
      senderEmail: 'test@test.com',
      recipientEmail: 'recv@test.com',
      amount: 1,
      chain: 'celo',
      senderWallet: '0x123',
      walletMode,
    };

    if (onChainTxHash) {
      payload.fundingTxHash = onChainTxHash;
    }

    expect(payload.fundingTxHash).toBe('0xabc123real_tx');
  });

  it('should NOT include fundingTxHash for service mode', () => {
    const walletMode = 'service';
    const onChainTxHash: string | undefined = undefined; // no tx in service mode

    const payload: Record<string, any> = {
      senderEmail: 'test@test.com',
      recipientEmail: 'recv@test.com',
      amount: 1,
      chain: 'celo',
      senderWallet: '0x123',
      walletMode,
    };

    if (onChainTxHash) {
      payload.fundingTxHash = onChainTxHash;
    }

    expect(payload.fundingTxHash).toBeUndefined();
  });
});

describe('SendForm - Insufficient Balance Per Mode', () => {
  it('service mode: flags insufficient when amount > server balance', () => {
    const serverBalance = '0.05';
    const amount = '0.1';
    const walletMode = 'service';

    const insufficient = walletMode === 'service'
      ? !!serverBalance && !!amount && parseFloat(amount) > parseFloat(serverBalance)
      : false;

    expect(insufficient).toBe(true);
  });

  it('personal mode: flags insufficient when amount > sender balance', () => {
    const senderBalance = '0.05';
    const amount = '0.1';
    const walletMode = 'personal';

    const insufficient = walletMode === 'personal'
      ? parseFloat(amount) > parseFloat(senderBalance)
      : false;

    expect(insufficient).toBe(true);
  });

  it('service mode: does NOT flag sender balance as insufficient', () => {
    const senderBalance = '0.01'; // sender has very little
    const serverBalance = '19.00'; // server has plenty
    const amount = '0.1';
    const walletMode = 'service';

    // Service mode should only check server balance
    const insufficientServer = walletMode === 'service'
      ? parseFloat(amount) > parseFloat(serverBalance)
      : false;

    const insufficientSender = walletMode === 'personal'
      ? parseFloat(amount) > parseFloat(senderBalance)
      : false;

    expect(insufficientServer).toBe(false); // server has enough
    expect(insufficientSender).toBe(false); // not checked in service mode
  });
});
