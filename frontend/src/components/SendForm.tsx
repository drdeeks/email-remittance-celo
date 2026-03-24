'use client';

import { useState, useEffect } from 'react';
import { useAccount, useSignMessage, useBalance } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { formatUnits } from 'viem';
import { ChainSelector } from './ChainSelector';
import { AuthToggle } from './AuthToggle';
import { chainConfig, SupportedChainId } from '@/config/chains';
import { PaperAirplaneIcon, ClipboardIcon, CheckIcon } from '@heroicons/react/24/solid';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Chain ID to backend chain name mapping
const CHAIN_ID_TO_NAME: Record<number, string> = {
  42220: 'celo',
  8453: 'base',
  143: 'monad',
};

// Available tokens per chain for recipient to receive
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

interface SendResult {
  success: boolean;
  claimUrl?: string;
  token?: string;
  escrowAddress?: string;
  sendAmount?: string;
  error?: string;
}

export function SendForm() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  
  const [selectedChain, setSelectedChain] = useState<SupportedChainId>(42220);
  const [senderEmail, setSenderEmail] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [recipientToken, setRecipientToken] = useState('');
  const [requireAuth, setRequireAuth] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [walletVerified, setWalletVerified] = useState(false);
  const [walletProofCache, setWalletProofCache] = useState<{message: string; signature: string} | null>(null);

  const chain = chainConfig[selectedChain];
  const availableTokens = RECIPIENT_TOKENS[selectedChain] || [];

  // Fetch wallet balance for selected chain
  const { data: balanceData, isLoading: balanceLoading } = useBalance({
    address: address,
    chainId: selectedChain,
  });

  const formattedBalance = balanceData 
    ? parseFloat(formatUnits(balanceData.value, balanceData.decimals)).toFixed(4)
    : '0.0000';

  // Set default recipient token when chain changes
  useEffect(() => {
    const tokens = RECIPIENT_TOKENS[selectedChain];
    if (tokens && tokens.length > 0) {
      setRecipientToken(tokens[0].symbol);
    }
  }, [selectedChain]);

  // Reset verification when wallet disconnects or changes address
  useEffect(() => {
    if (!isConnected) { setWalletVerified(false); setWalletProofCache(null); }
  }, [isConnected, address]);

  const handleSend = async () => {
    if (!address || !senderEmail || !recipientEmail || !amount) return;
    
    setLoading(true);
    setResult(null);

    try {
      // Sign once, cache and reuse — never prompt again for same session
      let walletProof: { message: string; signature: string } | undefined;
      if (walletProofCache) {
        walletProof = walletProofCache;
      } else {
        try {
          const verificationMessage = `Email Remittance - Verify wallet ownership\n\nAddress: ${address}\nTimestamp: ${new Date().toISOString()}\n\nThis signature proves you own this wallet. No funds are moved.`;
          const signature = await signMessageAsync({ message: verificationMessage });
          walletProof = { message: verificationMessage, signature };
          setWalletProofCache(walletProof);
          setWalletVerified(true);
        } catch (signError: any) {
          if (signError?.code === 4001 || signError?.message?.includes('rejected')) {
            setLoading(false);
            return; // User rejected — stop silently
          }
          // Sign failed for other reason — proceed without proof
          console.warn('Wallet signature failed:', signError.message);
        }
      }

      // Step 2: Send to backend with correct field names
      const chainName = CHAIN_ID_TO_NAME[selectedChain] || 'celo';
      
      const payload: Record<string, any> = {
        senderEmail,
        recipientEmail,
        amount: parseFloat(amount),
        chain: chainName,
        senderWallet: address,
        requireAuth,
      };

      // Add wallet proof if user signed
      if (walletProof) {
        payload.walletProof = walletProof;
      }

      // Add recipient token if different from native (for swap/bridge)
      if (recipientToken && recipientToken !== chain.symbol) {
        payload.receiverToken = recipientToken;
      }

      const response = await fetch(`${API_URL}/api/remittance/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        // Backend wraps response in data.data
        const responseData = data.data || data;
        setResult({
          success: true,
          claimUrl: responseData.claimUrl,
          token: responseData.claimToken,
          escrowAddress: responseData.escrowAddress,
          sendAmount: responseData.sendAmount,
        });
      } else {
        // Handle error from backend
        const errorMsg = data.error?.message || data.message || data.error || 'Failed to send';
        setResult({ success: false, error: errorMsg });
      }
    } catch (error: any) {
      setResult({ success: false, error: error.message || 'Network error' });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (result?.claimUrl) {
      await navigator.clipboard.writeText(result.claimUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (result?.success) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-4">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <CheckIcon className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Remittance Created!</h2>
          <p className="text-gray-400">Claim link sent to {recipientEmail}</p>
        </div>

        {result.escrowAddress && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
            <p className="text-amber-300 text-sm font-medium mb-2">⚠️ Action Required</p>
            <p className="text-gray-300 text-sm mb-2">
              Send <strong>{result.sendAmount || amount} {chain.symbol}</strong> to:
            </p>
            <code className="block bg-slate-900 p-2 rounded text-xs text-gray-300 break-all">
              {result.escrowAddress}
            </code>
          </div>
        )}

        <div className="bg-slate-900 rounded-lg p-4">
          <label className="text-xs text-gray-500 block mb-2">Claim URL</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={result.claimUrl}
              readOnly
              className="flex-1 bg-transparent text-sm text-gray-300 outline-none truncate"
            />
            <button
              onClick={copyToClipboard}
              className="px-3 py-1 bg-sky-500 hover:bg-sky-600 rounded text-sm font-medium transition-colors"
            >
              {copied ? <CheckIcon className="w-4 h-4" /> : <ClipboardIcon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          onClick={() => {
            setResult(null);
            setSenderEmail('');
            setRecipientEmail('');
            setAmount('');
          }}
          className="w-full py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition-colors"
        >
          Send Another
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">Send Crypto via Email</h2>
        <div className="flex items-center gap-2">
          {!isConnected ? (
            // State 1: Not connected
            <ConnectButton showBalance={false} />
          ) : !walletVerified ? (
            // State 2: Connected but not verified — show ConnectButton (shows address) + verify badge
            <div className="flex items-center gap-2">
              <ConnectButton showBalance={false} />
              <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                ⚠️ Sign required on first send
              </span>
            </div>
          ) : (
            // State 3: Connected + verified
            <div className="flex items-center gap-2">
              <ConnectButton showBalance={false} />
              <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                ✓ Verified
              </span>
            </div>
          )}
        </div>
      </div>

      <ChainSelector selectedChain={selectedChain} onChainSelect={setSelectedChain} />

      <div className="space-y-2">
        <label className="text-sm text-gray-400">Your Email</label>
        <input
          type="email"
          value={senderEmail}
          onChange={(e) => setSenderEmail(e.target.value)}
          placeholder="your@email.com"
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-sky-500 focus:outline-none transition-colors"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm text-gray-400">Recipient Email</label>
        <input
          type="email"
          value={recipientEmail}
          onChange={(e) => setRecipientEmail(e.target.value)}
          placeholder="recipient@example.com"
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-sky-500 focus:outline-none transition-colors"
        />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-sm text-gray-400">Amount to Send</label>
          {isConnected && (
            <span className="text-xs text-gray-500">
              Balance: {balanceLoading ? '...' : `${formattedBalance} ${chain.symbol}`}
            </span>
          )}
        </div>
        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            step="0.01"
            min="0"
            max={isConnected && parseFloat(formattedBalance) > 0 ? formattedBalance : undefined}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 pr-20 text-white placeholder-gray-500 focus:border-sky-500 focus:outline-none transition-colors"
          />
          <span
            className="absolute right-4 top-1/2 -translate-y-1/2 font-medium px-2 py-1 rounded text-sm"
            style={{ backgroundColor: `${chain.color}20`, color: chain.color }}
          >
            {chain.symbol}
          </span>
        </div>
        {isConnected && parseFloat(amount) > parseFloat(formattedBalance) && (
          <p className="text-xs text-red-400">Insufficient balance</p>
        )}
      </div>

      {/* Recipient Token Selector */}
      {availableTokens.length > 1 && (
        <div className="space-y-2">
          <label className="text-sm text-gray-400">Recipient Receives</label>
          <select
            value={recipientToken}
            onChange={(e) => setRecipientToken(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-sky-500 focus:outline-none transition-colors"
          >
            {availableTokens.map((token) => (
              <option key={token.symbol} value={token.symbol}>
                {token.name} ({token.symbol})
              </option>
            ))}
          </select>
        </div>
      )}

      <AuthToggle requireAuth={requireAuth} onToggle={setRequireAuth} />

      {result?.error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {result.error}
        </div>
      )}

      <button
        onClick={handleSend}
        disabled={!isConnected || !senderEmail || !recipientEmail || !amount || loading}
        className="w-full py-4 bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-600 hover:to-teal-600 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed rounded-lg font-bold text-lg transition-all flex items-center justify-center gap-2"
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <>
            <PaperAirplaneIcon className="w-5 h-5" />
            {isConnected ? 'Send' : 'Connect Wallet to Send'}
          </>
        )}
      </button>
    </div>
  );
}
