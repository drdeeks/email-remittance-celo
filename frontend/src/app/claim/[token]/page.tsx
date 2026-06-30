'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { SelfQRcodeWrapper, SelfAppBuilder } from '@selfxyz/qrcode';
import { useAccount } from 'wagmi';
import { chainConfig, SupportedChainId } from '@/config/chains';
import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  ClipboardIcon,
  CheckIcon,
  WalletIcon,
  KeyIcon,
  QrCodeIcon,
  GiftIcon,
} from '@heroicons/react/24/solid';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const CHAIN_NAME_TO_ID: Record<string, SupportedChainId> = {
  celo: 42220,
  base: 8453,
  monad: 143,
};

// Tokens available per chain for recipient to choose
const RECIPIENT_TOKENS: Record<number, { symbol: string; name: string; crossChain?: string }[]> = {
  42220: [
    { symbol: 'CELO', name: 'CELO (Native)' },
    { symbol: 'cUSD', name: 'cUSD (Celo Dollar)' },
    { symbol: 'USDC', name: 'USDC on Celo' },
    { symbol: 'base→ETH', name: 'ETH on Base ↗', crossChain: 'base' },
    { symbol: 'base→USDC', name: 'USDC on Base ↗', crossChain: 'base' },
  ],
  8453: [
    { symbol: 'ETH', name: 'ETH (Native)' },
    { symbol: 'USDC', name: 'USDC on Base' },
    { symbol: 'USDT', name: 'USDT on Base' },
    { symbol: 'celo→CELO', name: 'CELO on Celo ↗', crossChain: 'celo' },
    { symbol: 'celo→cUSD', name: 'cUSD on Celo ↗', crossChain: 'celo' },
  ],
  143: [
    { symbol: 'MON', name: 'MON (Native)' },
    { symbol: 'celo→CELO', name: 'CELO on Celo ↗', crossChain: 'celo' },
  ],
};

type ReceiveMode = 'wallet' | 'generate' | 'giftcard';

interface RemittanceInfo {
  id: string;
  senderAddress: string;
  recipientEmail: string;
  amount: number;
  chainId: SupportedChainId;
  chain?: string;
  returned?: boolean;
  storageFee?: string;
  status: 'pending' | 'claimed' | 'expired';
  requireAuth: boolean;
  expiresAt: string;
  claimedAt?: string;
  txHash?: string;
  senderMessage?: string;
  bridgeTxHash?: string;
  swapTxHash?: string;
}

interface ClaimResult {
  success: boolean;
  txHash?: string;
  wallet?: string;
  privateKey?: string;
  error?: string;
}

export default function ClaimPage() {
  const params = useParams();
  const token = params.token as string;
  const { address } = useAccount();

  const [info, setInfo] = useState<RemittanceInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Recipient choices
  const [desiredToken, setDesiredToken] = useState('');
  const [receiveMode, setReceiveMode] = useState<ReceiveMode>('wallet');
  const [walletInput, setWalletInput] = useState('');
  const [giftCardEmail, setGiftCardEmail] = useState('');
  const [generatedWallet, setGeneratedWallet] = useState<{ address: string; privateKey: string } | null>(null);
  const [walletGenerating, setWalletGenerating] = useState(false);

  // Claim state
  const [claiming, setClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<ClaimResult | null>(null);

  // Self verification
  const [selfVerified, setSelfVerified] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => { fetchInfo(); }, [token]);
  useEffect(() => {
    if (address) { setWalletInput(address); setReceiveMode('wallet'); }
  }, [address]);

  const fetchInfo = async () => {
    try {
      const response = await fetch(`${API_URL}/api/remittance/status/${token}`);
      const data = await response.json();
      if (response.ok) {
        const raw = data.data || data;
        const chainName = raw.chain || 'celo';
        const chainId = CHAIN_NAME_TO_ID[chainName] ?? 42220;
        setInfo({
          ...raw,
          chainId,
          amount: parseFloat(raw.amount_celo || raw.amount || '0'),
          expiresAt: raw.expires_at || raw.expiresAt,
          senderAddress: raw.sender_email || raw.senderAddress || '',
          status: raw.status || 'pending',
          requireAuth: raw.requireAuth ?? false,
        });
        const tokens = RECIPIENT_TOKENS[chainId];
        if (tokens?.length) setDesiredToken(tokens[0].symbol);
      } else {
        const errData = data.data || data;
        setError(errData.error?.message || errData.error || errData.message || 'Remittance not found');
      }
    } catch {
      setError('Failed to load remittance info');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateWallet = async () => {
    setWalletGenerating(true);
    try {
      const response = await fetch(`${API_URL}/api/remittance/wallet/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (data.success) {
        setGeneratedWallet({ address: data.data.address, privateKey: data.data.privateKey });
      } else {
        setError('Failed to generate wallet');
      }
    } catch {
      setError('Failed to generate wallet');
    } finally {
      setWalletGenerating(false);
    }
  };

  const handleClaim = async () => {
    if (receiveMode === 'wallet' && !walletInput && !address) return;
    if (receiveMode === 'giftcard' && !giftCardEmail) return;

    setClaiming(true);
    setClaimResult(null);

    try {
      const params = new URLSearchParams();
      params.append('desiredToken', desiredToken);
      params.append('receiveMode', receiveMode);

      if (receiveMode === 'wallet') {
        const effectiveWallet = walletInput || address;
        if (effectiveWallet) params.append('recipientWallet', effectiveWallet);
      } else if (receiveMode === 'generate') {
        if (generatedWallet) {
          params.append('recipientWallet', generatedWallet.address);
        }
      } else if (receiveMode === 'giftcard') {
        params.append('giftCardEmail', giftCardEmail);
      }

      const response = await fetch(
        `${API_URL}/api/remittance/claim/${token}?${params.toString()}`,
        { method: 'GET' }
      );

      const data = await response.json();

      if (response.ok) {
        const d = data.data || data;
        setClaimResult({
          success: true,
          txHash: d.txHash || d.claimTxHash,
          wallet: d.wallet || d.recipientWallet,
          privateKey: d.privateKey,
        });
        fetchInfo();
      } else {
        const d = data.data || data;
        setClaimResult({ success: false, error: d.error?.message || d.error || d.message || 'Claim failed' });
      }
    } catch {
      setClaimResult({ success: false, error: 'Network error' });
    } finally {
      setClaiming(false);
    }
  };

  const copyToClipboard = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
      </main>
    );
  }

  if (error || !info) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div className="max-w-lg mx-auto px-4 py-12">
          <div className="bg-slate-800/50 border border-red-500/30 rounded-xl p-8 text-center">
            <ExclamationCircleIcon className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-white mb-2">Not Found</h1>
            <p className="text-gray-400">{error || 'This remittance does not exist'}</p>
          </div>
        </div>
      </main>
    );
  }

  const chain = chainConfig[info.chainId];
  const isExpired = new Date(info.expiresAt) < new Date();
  const isClaimed = info.status === 'claimed';
  const tokens = RECIPIENT_TOKENS[info.chainId] || [];

  // ─── Success State ───────────────────────────────────────────────────────────
  if (claimResult?.success) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div className="max-w-lg mx-auto px-4 py-12">
          <div className="bg-slate-800/50 border border-emerald-500/30 rounded-xl p-6 space-y-6">
            <div className="text-center">
              <CheckCircleIcon className="w-20 h-20 text-emerald-400 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-white mb-2">Claimed Successfully!</h1>
              <p className="text-gray-400">
                {info.amount} {chain.symbol} — {receiveMode === 'giftcard' ? 'Gift card sent to your email' : 'sent to your wallet'}
              </p>
            </div>

            {claimResult.txHash && (
              <div className="bg-slate-900 rounded-lg p-4">
                <label className="text-xs text-gray-500 block mb-2">Transaction Hash</label>
                <div className="flex gap-2 items-center">
                  <code className="flex-1 text-sm text-gray-300 truncate">{claimResult.txHash}</code>
                  <button onClick={() => copyToClipboard(claimResult.txHash!, 'txHash')} className="p-2 hover:bg-slate-800 rounded">
                    {copied === 'txHash' ? <CheckIcon className="w-4 h-4 text-emerald-400" /> : <ClipboardIcon className="w-4 h-4 text-gray-400" />}
                  </button>
                </div>
                <a href={`${chain.explorer}/tx/${claimResult.txHash}`} target="_blank" rel="noopener noreferrer"
                   className="text-sm text-sky-400 hover:text-sky-300 mt-2 inline-block">
                  View on {chain.explorer.replace('https://', '')} →
                </a>
              </div>
            )}

            {claimResult.privateKey && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 space-y-4">
                <div className="flex items-center gap-2 text-amber-400">
                  <KeyIcon className="w-5 h-5" />
                  <span className="font-medium">Generated Wallet — Save Your Private Key</span>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Wallet Address</label>
                  <div className="flex gap-2 items-center">
                    <code className="flex-1 text-sm text-gray-300 truncate">{claimResult.wallet}</code>
                    <button onClick={() => copyToClipboard(claimResult.wallet!, 'wallet')} className="p-2 hover:bg-slate-800 rounded">
                      {copied === 'wallet' ? <CheckIcon className="w-4 h-4 text-emerald-400" /> : <ClipboardIcon className="w-4 h-4 text-gray-400" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Private Key (SAVE THIS — NEVER SHOWN AGAIN)</label>
                  <div className="flex gap-2 items-center">
                    <code className="flex-1 text-sm text-red-400 break-all font-mono">{claimResult.privateKey}</code>
                    <button onClick={() => copyToClipboard(claimResult.privateKey!, 'pk')} className="p-2 hover:bg-slate-800 rounded">
                      {copied === 'pk' ? <CheckIcon className="w-4 h-4 text-emerald-400" /> : <ClipboardIcon className="w-4 h-4 text-gray-400" />}
                    </button>
                  </div>
                </div>
                <div className="text-sm text-gray-400 space-y-2">
                  <p className="font-medium text-white">Import to any wallet:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Open MetaMask, Coinbase Wallet, Brave Wallet, Rainbow, or any EVM wallet</li>
                    <li>Find &quot;Import Account&quot; → &quot;Import with Private Key&quot;</li>
                    <li>Paste your private key and click Import</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

  // ─── Already Claimed ─────────────────────────────────────────────────────────
  if (isClaimed) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div className="max-w-lg mx-auto px-4 py-12">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center space-y-4">
            <CheckCircleIcon className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-white mb-2">Already Claimed</h1>
            <p className="text-gray-400">This remittance has already been claimed.</p>
            {info.senderMessage && (
              <div className="bg-slate-900 rounded-lg p-4 border border-slate-700 text-left">
                <label className="text-xs text-gray-500 block mb-2">Message from Sender</label>
                <p className="text-gray-300 text-sm italic">{info.senderMessage}</p>
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

  // ─── Expired ─────────────────────────────────────────────────────────────────
  if (isExpired) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div className="max-w-lg mx-auto px-4 py-12">
          <div className="bg-slate-800/50 border border-amber-500/30 rounded-xl p-8 text-center">
            <ClockIcon className="w-16 h-16 text-amber-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-white mb-2">Expired</h1>
            <p className="text-gray-400">This remittance has expired and is no longer claimable.</p>
            {info.returned && (
              <p className="text-amber-400 text-sm mt-2">1.5% storage fee deducted. Remainder returned to sender.</p>
            )}
          </div>
        </div>
      </main>
    );
  }

  // ─── Self Verification Required ──────────────────────────────────────────────
  if (info.requireAuth && !selfVerified) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div className="max-w-lg mx-auto px-4 py-12">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-6">
            <div className="text-center">
              <QrCodeIcon className="w-16 h-16 text-sky-400 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-white mb-2">Verify Your Identity</h1>
              <p className="text-gray-400">The sender requires verification to claim this remittance.</p>
            </div>
            <div className="flex justify-center">
              <SelfQRcodeWrapper
                selfApp={new SelfAppBuilder({
                  appName: 'Email Remittance Pro',
                  scope: 'email-remittance-claim',
                  endpoint: `${API_URL}/api/verifications/claim-callback`,
                  endpointType: 'https',
                  version: 2,
                  userId: token,
                  userIdType: 'hex',
                  disclosures: { name: true, nationality: true, ofac: true },
                }).build()}
                onSuccess={() => setSelfVerified(true)}
                type="websocket"
                darkMode={true}
              />
            </div>
            <p className="text-xs text-center text-gray-600">
              Open the <strong className="text-gray-400">Self app</strong> → tap passport icon 5× for demo mode
            </p>
          </div>
        </div>
      </main>
    );
  }

  // ─── Claim Form ──────────────────────────────────────────────────────────────
  const canClaim =
    (receiveMode === 'wallet' && (walletInput || address)) ||
    (receiveMode === 'generate' && generatedWallet) ||
    (receiveMode === 'giftcard' && giftCardEmail);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-lg mx-auto px-4 py-12">
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-2">Claim Your Crypto</h1>
            <p className="text-gray-400">
              You&apos;ve received {info.amount} {chain.symbol}
            </p>
          </div>

          {/* Remittance Summary */}
          <div className="bg-slate-900 rounded-lg p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Amount</span>
              <span className="font-bold text-2xl" style={{ color: chain.color }}>
                {info.amount} {chain.symbol}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Chain</span>
              <span className="text-gray-300">{chain.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Expires</span>
              <span className="text-gray-300">{new Date(info.expiresAt).toLocaleDateString()}</span>
            </div>
            {info.senderMessage && (
              <div className="border-t border-slate-700 pt-3">
                <span className="text-gray-500 text-xs block mb-1">Message from sender</span>
                <p className="text-gray-300 text-sm italic">{info.senderMessage}</p>
              </div>
            )}
          </div>

          {/* Step 1: Token Selector */}
          {tokens.length > 1 && (
            <div className="space-y-2">
              <label className="text-sm text-gray-400 font-medium">What token do you want?</label>
              <select
                value={desiredToken}
                onChange={(e) => setDesiredToken(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-sky-500 focus:outline-none"
              >
                {tokens.map((t) => (
                  <option key={t.symbol} value={t.symbol}>{t.name}</option>
                ))}
              </select>
              {desiredToken.includes('→') && (
                <p className="text-xs text-sky-400">↗ Cross-chain — backend will bridge/swap for you</p>
              )}
            </div>
          )}

          {/* Step 2: Receive Mode */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400 font-medium">How do you want to receive?</label>

            {/* Option A: Enter wallet address */}
            <button
              onClick={() => { setReceiveMode('wallet'); setGeneratedWallet(null); }}
              className={`w-full p-4 rounded-lg border transition-all flex items-center gap-3 ${
                receiveMode === 'wallet'
                  ? 'border-sky-500 bg-sky-500/10'
                  : 'border-slate-600 bg-slate-800/50 hover:border-slate-500'
              }`}
            >
              <WalletIcon className="w-6 h-6 text-sky-400 flex-shrink-0" />
              <div className="text-left">
                <div className="font-medium">My wallet</div>
                <div className="text-xs text-gray-500">Enter your wallet address or connect</div>
              </div>
            </button>
            {receiveMode === 'wallet' && (
              <div className="space-y-2 pl-9">
                <ConnectButton />
                <input
                  type="text"
                  value={walletInput}
                  onChange={(e) => setWalletInput(e.target.value)}
                  placeholder="0x... or connect wallet above"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-sky-500 focus:outline-none font-mono text-sm"
                />
              </div>
            )}

            {/* Option B: Generate wallet */}
            <button
              onClick={() => { setReceiveMode('generate'); setWalletInput(''); }}
              className={`w-full p-4 rounded-lg border transition-all flex items-center gap-3 ${
                receiveMode === 'generate'
                  ? 'border-sky-500 bg-sky-500/10'
                  : 'border-slate-600 bg-slate-800/50 hover:border-slate-500'
              }`}
            >
              <KeyIcon className="w-6 h-6 text-amber-400 flex-shrink-0" />
              <div className="text-left">
                <div className="font-medium">Generate wallet for me</div>
                <div className="text-xs text-gray-500">We create a wallet and give you the private key</div>
              </div>
            </button>
            {receiveMode === 'generate' && (
              <div className="pl-9 space-y-3">
                {!generatedWallet ? (
                  <button
                    onClick={handleGenerateWallet}
                    disabled={walletGenerating}
                    className="w-full py-3 bg-amber-500/20 border border-amber-500/30 rounded-lg text-amber-400 font-medium hover:bg-amber-500/30 disabled:opacity-50"
                  >
                    {walletGenerating ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                        Generating...
                      </span>
                    ) : (
                      'Generate my wallet'
                    )}
                  </button>
                ) : (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-2">
                    <p className="text-amber-400 text-xs font-medium">SAVE THIS PRIVATE KEY — SHOWN ONLY ONCE:</p>
                    <div className="flex gap-2 items-center">
                      <code className="flex-1 p-2 bg-slate-900 rounded text-xs text-red-400 break-all font-mono">
                        {generatedWallet.privateKey}
                      </code>
                      <button onClick={() => copyToClipboard(generatedWallet.privateKey, 'genPk')} className="px-2 py-1 bg-slate-700 rounded text-xs flex-shrink-0">
                        {copied === 'genPk' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <p className="text-xs text-gray-400">Address: {generatedWallet.address}</p>
                    <p className="text-xs text-gray-500">Import into MetaMask / any EVM wallet with the private key above</p>
                  </div>
                )}
              </div>
            )}

            {/* Option C: Gift card */}
            <button
              onClick={() => { setReceiveMode('giftcard'); setWalletInput(''); setGeneratedWallet(null); }}
              className={`w-full p-4 rounded-lg border transition-all flex items-center gap-3 ${
                receiveMode === 'giftcard'
                  ? 'border-sky-500 bg-sky-500/10'
                  : 'border-slate-600 bg-slate-800/50 hover:border-slate-500'
              }`}
            >
              <GiftIcon className="w-6 h-6 text-pink-400 flex-shrink-0" />
              <div className="text-left">
                <div className="font-medium">Gift card</div>
                <div className="text-xs text-gray-500">Receive as a digital gift card sent to your email</div>
              </div>
            </button>
            {receiveMode === 'giftcard' && (
              <div className="pl-9 space-y-2">
                <input
                  type="email"
                  value={giftCardEmail}
                  onChange={(e) => setGiftCardEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-sky-500 focus:outline-none"
                />
                <p className="text-xs text-gray-500">Gift card with redemption instructions sent to this email</p>
              </div>
            )}
          </div>

          {claimResult?.error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {claimResult.error}
            </div>
          )}

          <button
            onClick={handleClaim}
            disabled={!canClaim || claiming}
            className="w-full py-4 bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-600 hover:to-teal-600 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed rounded-lg font-bold text-lg transition-all flex items-center justify-center gap-2"
          >
            {claiming ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Claim Funds'
            )}
          </button>
        </div>
      </div>
    </main>
  );
}
