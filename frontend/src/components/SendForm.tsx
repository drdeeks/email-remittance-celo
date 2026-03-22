'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { ChainSelector } from './ChainSelector';
import { AuthToggle } from './AuthToggle';
import { chainConfig, SupportedChainId } from '@/config/chains';
import { PaperAirplaneIcon, ClipboardIcon, CheckIcon } from '@heroicons/react/24/solid';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface SendResult {
  success: boolean;
  claimUrl?: string;
  token?: string;
  error?: string;
}

export function SendForm() {
  const { address, isConnected } = useAccount();
  const [selectedChain, setSelectedChain] = useState<SupportedChainId>(42220);
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [requireAuth, setRequireAuth] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);
  const [copied, setCopied] = useState(false);

  const chain = chainConfig[selectedChain];

  const handleSend = async () => {
    if (!address || !email || !amount) return;
    
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(`${API_URL}/api/remittance/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderAddress: address,
          recipientEmail: email,
          amount: parseFloat(amount),
          chainId: selectedChain,
          requireAuth,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setResult({
          success: true,
          claimUrl: data.claimUrl,
          token: data.token,
        });
      } else {
        setResult({ success: false, error: data.error || 'Failed to send' });
      }
    } catch (error) {
      setResult({ success: false, error: 'Network error' });
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
          <h2 className="text-xl font-bold text-white mb-2">Sent Successfully!</h2>
          <p className="text-gray-400">Email sent to {email}</p>
        </div>

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
            setEmail('');
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
        <ConnectButton showBalance={false} />
      </div>

      <ChainSelector selectedChain={selectedChain} onChainSelect={setSelectedChain} />

      <div className="space-y-2">
        <label className="text-sm text-gray-400">Recipient Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="recipient@example.com"
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-sky-500 focus:outline-none transition-colors"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm text-gray-400">Amount</label>
        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            step="0.01"
            min="0"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 pr-20 text-white placeholder-gray-500 focus:border-sky-500 focus:outline-none transition-colors"
          />
          <span
            className="absolute right-4 top-1/2 -translate-y-1/2 font-medium px-2 py-1 rounded text-sm"
            style={{ backgroundColor: `${chain.color}20`, color: chain.color }}
          >
            {chain.symbol}
          </span>
        </div>
      </div>

      <AuthToggle requireAuth={requireAuth} onToggle={setRequireAuth} />

      {result?.error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {result.error}
        </div>
      )}

      <button
        onClick={handleSend}
        disabled={!isConnected || !email || !amount || loading}
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
