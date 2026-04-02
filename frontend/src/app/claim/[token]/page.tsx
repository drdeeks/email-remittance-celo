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
  QrCodeIcon
} from '@heroicons/react/24/solid';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const CHAIN_NAME_TO_ID: Record<string, SupportedChainId> = {
  celo: 42220,
  base: 8453,
  monad: 10143,
};

interface RemittanceInfo {
  id: string;
  senderAddress: string;
  recipientEmail: string;
  amount: number;
  chainId: SupportedChainId;
  chain?: string;
  status: 'pending' | 'claimed' | 'expired';
  requireAuth: boolean;
  expiresAt: string;
  claimedAt?: string;
  txHash?: string;
  // PL_Genesis v2 fields
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
  const [claimed, setClaimed] = useState(false);
  
  const [info, setInfo] = useState<RemittanceInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [walletInput, setWalletInput] = useState('');
  const [useGenerated, setUseGenerated] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<ClaimResult | null>(null);
  const [selfVerified, setSelfVerified] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetchInfo();
  }, [token]);

  useEffect(() => {
    if (address) {
      setWalletInput(address);
      setUseGenerated(false);
    }
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
      } else {
        const errData = data.data || data;
        setError(errData.error?.message || errData.error || errData.message || 'Remittance not found');
      }
    } catch (e) {
      setError('Failed to load remittance info');
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async () => {
    if (!walletInput && !useGenerated) return;
    
    setClaiming(true);
    setClaimResult(null);

    try {
      const params = new URLSearchParams();
      // Use typed wallet address, or fall back to connected wallet — never silently generate
      const effectiveWallet = !useGenerated ? (walletInput || address) : undefined;
      if (effectiveWallet) {
        params.append('recipientWallet', effectiveWallet);
      }
      
      const response = await fetch(
        `${API_URL}/api/remittance/claim/${token}${params.toString() ? `?${params}` : ''}`,
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
    } catch (e) {
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

  // Success state
  if (claimResult?.success) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div className="max-w-lg mx-auto px-4 py-12">
          <div className="bg-slate-800/50 border border-emerald-500/30 rounded-xl p-6 space-y-6">
            <div className="text-center">
              <CheckCircleIcon className="w-20 h-20 text-emerald-400 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-white mb-2">Claimed Successfully!</h1>
              <p className="text-gray-400">
                {info.amount} {chain.symbol} sent to your wallet
              </p>
            </div>

            {/* TX Hash */}
            {claimResult.txHash && (
              <div className="bg-slate-900 rounded-lg p-4">
                <label className="text-xs text-gray-500 block mb-2">Transaction Hash</label>
                <div className="flex gap-2 items-center">
                  <code className="flex-1 text-sm text-gray-300 truncate">{claimResult.txHash}</code>
                  <button
                    onClick={() => copyToClipboard(claimResult.txHash!, 'txHash')}
                    className="p-2 hover:bg-slate-800 rounded transition-colors"
                  >
                    {copied === 'txHash' ? <CheckIcon className="w-4 h-4 text-emerald-400" /> : <ClipboardIcon className="w-4 h-4 text-gray-400" />}
                  </button>
                </div>
                <a
                  href={`${chain.explorer}/tx/${claimResult.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-sky-400 hover:text-sky-300 mt-2 inline-block"
                >
                  View on {chain.explorer.replace('https://', '')} →
                </a>
              </div>
            )}

            {/* Generated Wallet */}
            {claimResult.privateKey && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 space-y-4">
                <div className="flex items-center gap-2 text-amber-400">
                  <KeyIcon className="w-5 h-5" />
                  <span className="font-medium">Generated Wallet</span>
                </div>
                
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Wallet Address</label>
                  <div className="flex gap-2 items-center">
                    <code className="flex-1 text-sm text-gray-300 truncate">{claimResult.wallet}</code>
                    <button
                      onClick={() => copyToClipboard(claimResult.wallet!, 'wallet')}
                      className="p-2 hover:bg-slate-800 rounded transition-colors"
                    >
                      {copied === 'wallet' ? <CheckIcon className="w-4 h-4 text-emerald-400" /> : <ClipboardIcon className="w-4 h-4 text-gray-400" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500 block mb-1">Private Key (SAVE THIS!)</label>
                  <div className="flex gap-2 items-center">
                    <code className="flex-1 text-sm text-red-400 truncate">{claimResult.privateKey}</code>
                    <button
                      onClick={() => copyToClipboard(claimResult.privateKey!, 'privateKey')}
                      className="p-2 hover:bg-slate-800 rounded transition-colors"
                    >
                      {copied === 'privateKey' ? <CheckIcon className="w-4 h-4 text-emerald-400" /> : <ClipboardIcon className="w-4 h-4 text-gray-400" />}
                    </button>
                  </div>
                </div>

                <div className="text-sm text-gray-400 space-y-2">
                  <p className="font-medium text-white">Import to any wallet:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Open your wallet app (MetaMask, Coinbase Wallet, Brave Wallet, Rainbow, or any EVM wallet)</li>
                    <li>Find &quot;Import Account&quot; or &quot;Add Account&quot; → &quot;Import with Private Key&quot;</li>
                    <li>Paste your private key</li>
                    <li>Click Import</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

  // Already claimed
  if (isClaimed) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div className="max-w-lg mx-auto px-4 py-12">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center space-y-4">
            <div>
              <CheckCircleIcon className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
              <h1 className="text-xl font-bold text-white mb-2">Already Claimed</h1>
              <p className="text-gray-400">This remittance has already been claimed.</p>
            </div>

            {/* Sender message */}
            {info.senderMessage && (
              <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                <label className="text-xs text-gray-500 block mb-2">📝 Message from Sender</label>
                <p className="text-gray-300 text-sm italic">{info.senderMessage}</p>
              </div>
            )}

            {/* Claim transaction details */}
            <div className="bg-slate-900 rounded-lg p-4 space-y-3">
              {info.txHash && (
                <a
                  href={`${chain.explorer}/tx/${info.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-sky-400 hover:text-sky-300"
                >
                  <span>🔗 Claim TX</span>
                  <code className="text-xs truncate font-mono">{info.txHash}</code>
                </a>
              )}
              {info.bridgeTxHash && (
                <a
                  href={`${chain.explorer}/tx/${info.bridgeTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300"
                >
                  <span>↗️ Bridge TX</span>
                  <code className="text-xs truncate font-mono">{info.bridgeTxHash}</code>
                </a>
              )}
              {info.swapTxHash && (
                <a
                  href={`${chain.explorer}/tx/${info.swapTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300"
                >
                  <span>🔄 Swap TX</span>
                  <code className="text-xs truncate font-mono">{info.swapTxHash}</code>
                </a>
              )}
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Expired
  if (isExpired) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div className="max-w-lg mx-auto px-4 py-12">
          <div className="bg-slate-800/50 border border-amber-500/30 rounded-xl p-8 text-center">
            <ClockIcon className="w-16 h-16 text-amber-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-white mb-2">Expired</h1>
            <p className="text-gray-400">This remittance has expired and is no longer claimable.</p>
          </div>
        </div>
      </main>
    );
  }

  // Self Protocol verification required
  if (info.requireAuth && !selfVerified) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div className="max-w-lg mx-auto px-4 py-12">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-6">
            <div className="text-center">
              <QrCodeIcon className="w-16 h-16 text-sky-400 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-white mb-2">Verify Your Identity</h1>
              <p className="text-gray-400">
                The sender requires Self Protocol verification to claim this remittance.
              </p>
            </div>

            {/* Remittance Info */}
            <div className="bg-slate-900 rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Amount</span>
                <span className="font-bold" style={{ color: chain.color }}>
                  {info.amount} {chain.symbol}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">From</span>
                <span className="text-gray-300 font-mono text-sm">
                  {info.senderAddress.slice(0, 6)}...{info.senderAddress.slice(-4)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Chain</span>
                <span className="text-gray-300">{chain.name}</span>
              </div>
            </div>

            {/* Self Protocol QR Code */}
            <div className="flex justify-center">
              {(() => {
                const selfApp = new SelfAppBuilder({
                  appName: 'Email Remittance Pro',
                  scope: 'email-remittance-pro',
                  endpoint: `${process.env.NEXT_PUBLIC_API_URL || 'https://email-remittance-pro.up.railway.app'}/api/verifications/callback`,
                  endpointType: 'https',
                  version: 2,
                  userId: token as string,
                  userIdType: 'hex',
                  disclosures: {
                    minimumAge: 18,
                  },
                }).build();

                return (
                  <SelfQRcodeWrapper
                    selfApp={selfApp}
                    onSuccess={() => setSelfVerified(true)}
                    type="websocket"
                    darkMode={true}
                  />
                );
              })()}
            </div>
            <p className="text-xs text-center text-gray-500">
              Open the <strong className="text-white">Self app</strong> on your phone and scan to verify your identity
            </p>
          </div>
        </div>
      </main>
    );
  }

  // Claim form
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-lg mx-auto px-4 py-12">
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-2">Claim Your Crypto</h1>
            <p className="text-gray-400">
              You&apos;ve received {info.amount} {chain.symbol} from{' '}
              {info.senderAddress.slice(0, 6)}...{info.senderAddress.slice(-4)}
            </p>
          </div>

          {/* Remittance Info */}
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
              <span className="text-gray-300">
                {new Date(info.expiresAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Wallet Connect */}
          <div className="flex justify-center">
            <ConnectButton />
          </div>

          {/* Wallet Options */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Receive to Wallet</label>
              <input
                type="text"
                value={walletInput}
                onChange={(e) => {
                  setWalletInput(e.target.value);
                  setUseGenerated(false);
                }}
                placeholder="0x..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-sky-500 focus:outline-none transition-colors font-mono text-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-slate-700" />
              <span className="text-gray-500 text-sm">or</span>
              <div className="flex-1 h-px bg-slate-700" />
            </div>

            <button
              onClick={() => {
                setUseGenerated(true);
                setWalletInput('');
              }}
              className={`w-full p-4 rounded-lg border transition-all flex items-center gap-3 ${
                useGenerated
                  ? 'border-sky-500 bg-sky-500/10'
                  : 'border-slate-600 bg-slate-800/50 hover:border-slate-500'
              }`}
            >
              <WalletIcon className="w-6 h-6 text-sky-400" />
              <div className="text-left">
                <div className="font-medium">Generate wallet for me</div>
                <div className="text-xs text-gray-500">
                  We&apos;ll create a new wallet and give you the private key
                </div>
              </div>
            </button>
          </div>

          {claimResult?.error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {claimResult.error}
            </div>
          )}

          <button
            onClick={handleClaim}
            disabled={(!walletInput && !useGenerated) || claiming}
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
