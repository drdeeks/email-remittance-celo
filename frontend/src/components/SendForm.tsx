'use client';

import { useState, useEffect, useRef } from 'react';
import { useAccount, useBalance, useSwitchChain, useSendTransaction, useDisconnect } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { parseEther, formatUnits } from 'viem';
import { SelfQRcodeWrapper, SelfAppBuilder } from '@selfxyz/qrcode';
import { ChainSelector } from './ChainSelector';
import { AuthToggle } from './AuthToggle';
import { chainConfig, SupportedChainId } from '@/config/chains';
import { PaperAirplaneIcon, ClipboardIcon, CheckIcon, ShieldCheckIcon, XMarkIcon } from '@heroicons/react/24/solid';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Chain ID to backend chain name mapping
const CHAIN_ID_TO_NAME: Record<number, string> = {
  42220: 'celo',
  8453: 'base',
  143: 'monad',
};

// Sender token options per chain (what they can send)
const SENDER_TOKENS: Record<number, { symbol: string; name: string; isNative: boolean }[]> = {
  42220: [
    { symbol: 'CELO', name: 'CELO (Native)', isNative: true },
    { symbol: 'USDC', name: 'USDC (Stablecoin)', isNative: false },
    { symbol: 'cUSD', name: 'cUSD (Celo Dollar)', isNative: false },
  ],
  8453: [
    { symbol: 'ETH', name: 'ETH (Native)', isNative: true },
    { symbol: 'USDC', name: 'USDC (Stablecoin)', isNative: false },
  ],
  143: [
    { symbol: 'MON', name: 'MON (Native)', isNative: true },
  ],
};

// Recipient token options — same chain + cross-chain
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

interface SendResult {
  success: boolean;
  claimUrl?: string;
  token?: string;
  escrowAddress?: string;
  sendAmount?: string;
  error?: string;
}

export function SendForm() {
  const { address, isConnected, chainId: walletChainId } = useAccount();
  const { disconnect } = useDisconnect();
  const { sendTransactionAsync } = useSendTransaction();
  const { switchChain } = useSwitchChain();
  
  const [selectedChain, setSelectedChain] = useState<SupportedChainId>(42220);
  const [senderEmail, setSenderEmail] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [recipientToken, setRecipientToken] = useState('');
  const [senderToken, setSenderToken] = useState('');
  const [requireAuth, setRequireAuth] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [tokenPriceUSD, setTokenPriceUSD] = useState<number | null>(null);
  const [walletMode, setWalletMode] = useState<'service' | 'personal'>('service');
  const [serviceWalletBalance, setServiceWalletBalance] = useState<string | null>(null);
  const [serviceWalletAddress, setServiceWalletAddress] = useState<string | null>(null);

  // Self Protocol sender verification — cached per session
  const [selfVerified, setSelfVerified] = useState(false);
  const [showSelfQR, setShowSelfQR] = useState(false);
  const [selfVerifiedData, setSelfVerifiedData] = useState<{ name?: string; nationality?: string } | null>(null);
  const [senderSessionToken, setSenderSessionToken] = useState<string | null>(null);
  // Unique userId per session for Self QR
  const selfUserIdRef = useRef<string>(
    typeof crypto !== 'undefined'
      ? crypto.randomUUID().replace(/-/g, '')
      : Math.random().toString(16).slice(2).padStart(32, '0')
  );

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

  // Set default tokens when chain changes
  useEffect(() => {
    const recvTokens = RECIPIENT_TOKENS[selectedChain];
    if (recvTokens && recvTokens.length > 0) setRecipientToken(recvTokens[0].symbol);
    const sendTokens = SENDER_TOKENS[selectedChain];
    if (sendTokens && sendTokens.length > 0) setSenderToken(sendTokens[0].symbol);
  }, [selectedChain]);

  // Sync wallet chain → selector (when user switches chain in wallet)
  useEffect(() => {
    if (walletChainId && walletChainId in CHAIN_ID_TO_NAME) {
      setSelectedChain(walletChainId as SupportedChainId);
    }
  }, [walletChainId]);

  // Reset verification when wallet disconnects or changes address
  useEffect(() => {
    // Self-verification state is independent of wallet connection
    // No reset needed — service wallet mode uses Self, personal wallet uses wallet auth
  }, [isConnected, address]);

  // Disconnect wallet when page closes/navigates away
  useEffect(() => {
    const handleUnload = () => {
      if (isConnected) disconnect();
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [isConnected, disconnect]);

  // Fetch token price in USD when chain changes
  useEffect(() => {
    const COINGECKO_IDS: Record<number, string> = {
      42220: 'celo',
      8453: 'ethereum',
      10143: 'monad-network',
    };
    const id = COINGECKO_IDS[selectedChain];
    if (!id) return;
    fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`)
      .then(r => r.json())
      .then(d => setTokenPriceUSD(d[id]?.usd || null))
      .catch(() => setTokenPriceUSD(null));
  }, [selectedChain]);

  // Fetch service wallet info — returns address fresh from backend
  const fetchServiceWallet = async (chain?: string) => {
    const chainName = chain || CHAIN_ID_TO_NAME[selectedChain] || 'celo';
    try {
      const r = await fetch(`${API_URL}/api/remittance/service-wallet?chain=${chainName}`);
      const d = await r.json();
      if (d.success) {
        setServiceWalletBalance(parseFloat(d.data.balance).toFixed(4));
        setServiceWalletAddress(d.data.address);
        return d.data.address as string;
      }
    } catch {}
    return null;
  };

  useEffect(() => {
    fetchServiceWallet();
  }, [selectedChain]);

  const handleSend = async () => {
    // Service wallet: must be Self-verified first
    if (walletMode === 'service' && !selfVerified) {
      setShowSelfQR(true);
      return;
    }
    // Personal wallet: must be connected
    if (walletMode === 'personal' && !isConnected) return;

    if (!senderEmail || !recipientEmail || !amount) return;

    setLoading(true);
    setResult(null);

    try {
      const chainName = CHAIN_ID_TO_NAME[selectedChain] || 'celo';

      // Personal wallet mode: send on-chain TX to escrow
      let onChainTxHash: string | undefined;
      if (walletMode === 'personal') {
        const freshEscrowAddress = await fetchServiceWallet();
        if (!freshEscrowAddress) {
          setLoading(false);
          setResult({ success: false, error: 'Could not load escrow address. Please refresh and try again.' });
          return;
        }
        try {
          const txHash = await sendTransactionAsync({
            to: freshEscrowAddress as `0x${string}`,
            value: parseEther(amount),
          });
          onChainTxHash = txHash;
        } catch (txError: any) {
          setLoading(false);
          if (txError?.code === 4001 || txError?.message?.includes('rejected') || txError?.message?.includes('User rejected')) {
            return;
          }
          setResult({ success: false, error: `Transaction failed: ${txError.message || 'Please try again'}` });
          return;
        }
      }

      const payload: Record<string, any> = {
        senderEmail,
        recipientEmail,
        amount: parseFloat(amount),
        chain: chainName,
        walletMode,
        requireAuth,
        // Service wallet: send server-issued Self session token for backend validation
        ...(walletMode === 'service' && senderSessionToken ? {
          senderSessionToken,
          senderName: selfVerifiedData?.name,
          senderNationality: selfVerifiedData?.nationality,
        } : {}),
        // Personal wallet: attach wallet address + tx hash
        ...(walletMode === 'personal' && address ? { senderWallet: address.toLowerCase() } : {}),
        ...(onChainTxHash ? { fundingTxHash: onChainTxHash } : {}),
      };

      if (recipientToken) payload.receiverToken = recipientToken;
      if (senderToken && senderToken !== chain.symbol) payload.senderToken = senderToken;

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

        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
          <p className="text-emerald-300 text-sm text-center">
            ✓ Funds reserved · Transfer executes automatically when recipient claims
          </p>
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
          {walletMode === 'personal' ? (
            // Personal wallet mode: show MetaMask connect button
            <ConnectButton showBalance={false} />
          ) : selfVerified ? (
            // Service wallet mode: verified via Self
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="w-4 h-4 text-emerald-400" />
              <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                ✓ Identity Verified
                {selfVerifiedData?.name && ` · ${Array.isArray(selfVerifiedData.name) ? selfVerifiedData.name.join(' ') : selfVerifiedData.name}`}
              </span>
            </div>
          ) : (
            // Service wallet mode: not yet verified
            <button
              onClick={() => setShowSelfQR(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-500/20 text-sky-400 border border-sky-500/30 hover:bg-sky-500/30 transition-colors"
            >
              <ShieldCheckIcon className="w-4 h-4" />
              Verify Identity to Send
            </button>
          )}
        </div>
      </div>

      {/* Self Protocol Verification Modal — service wallet mode only */}
      {showSelfQR && walletMode === 'service' && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full space-y-4 relative">
            <button
              onClick={() => setShowSelfQR(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
            <div className="text-center">
              <ShieldCheckIcon className="w-10 h-10 text-sky-400 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white mb-1">Verify Your Identity</h3>
              <p className="text-sm text-gray-400">
                Since the service wallet fronts the funds, we require a one-time identity check. Scan with the Self app.
              </p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3 text-xs text-gray-500 space-y-1">
              <p>✓ Name &amp; date of birth</p>
              <p>✓ Nationality</p>
              <p>✓ Zero data stored · ZK proof only</p>
              <p>✓ One-time per session</p>
            </div>
            <div className="flex justify-center">
              {(() => {
                const selfApp = new SelfAppBuilder({
                  appName: 'Email Remittance Pro',
                  scope: 'email-remittance-sender',
                  endpoint: `${process.env.NEXT_PUBLIC_API_URL || 'https://email-remittance-pro.up.railway.app'}/api/verifications/sender-callback`,
                  endpointType: 'https',
                  version: 2,
                  userId: selfUserIdRef.current,
                  userIdType: 'hex',
                  disclosures: {
                    name: true,
                    date_of_birth: true,
                    nationality: true,
                    ofac: true,
                  },
                }).build();
                return (
                  <SelfQRcodeWrapper
                    selfApp={selfApp}
                    onSuccess={(data: any) => {
                      setSelfVerified(true);
                      // V2: discloseOutput. Fallback to credentialSubject for compat.
                      setSelfVerifiedData({
                        name: data?.discloseOutput?.name || data?.credentialSubject?.name,
                        nationality: data?.discloseOutput?.nationality || data?.credentialSubject?.nationality,
                      });
                      // Store server-issued session token for gating /send
                      if (data?.senderSessionToken) {
                        setSenderSessionToken(data.senderSessionToken);
                      }
                      setShowSelfQR(false);
                    }}
                    type="websocket"
                    darkMode={true}
                  />
                );
              })()}
            </div>
            <p className="text-xs text-center text-gray-600">
              Open the <strong className="text-gray-400">Self app</strong> → tap passport icon 5× for demo mode
            </p>
          </div>
        </div>
      )}

      <ChainSelector
        selectedChain={selectedChain}
        onChainSelect={(chainId) => {
          setSelectedChain(chainId);
          if (isConnected && switchChain) {
            switchChain({ chainId });
          }
        }}
      />

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

      {/* Wallet Mode Toggle */}
      <div className="space-y-2">
        <label className="text-sm text-gray-400">Funded By</label>
        <div className="flex gap-2">
          <button
            onClick={() => setWalletMode('service')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              walletMode === 'service'
                ? 'bg-sky-500/20 border border-sky-500 text-sky-300'
                : 'bg-slate-800 border border-slate-600 text-gray-400 hover:border-slate-500'
            }`}
          >
            🤖 Service Wallet
            {serviceWalletBalance && (
              <span className="block text-xs mt-0.5 opacity-70">{serviceWalletBalance} {chain.symbol}</span>
            )}
          </button>
          <button
            onClick={() => setWalletMode('personal')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              walletMode === 'personal'
                ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-300'
                : 'bg-slate-800 border border-slate-600 text-gray-400 hover:border-slate-500'
            }`}
          >
            👤 My Wallet
            {isConnected && (
              <span className="block text-xs mt-0.5 opacity-70">{balanceLoading ? '...' : `${formattedBalance} ${chain.symbol}`}</span>
            )}
          </button>
        </div>
        {walletMode === 'service' && serviceWalletAddress && (
          <p className="text-xs text-gray-600">Agent escrow: {serviceWalletAddress.slice(0,8)}...{serviceWalletAddress.slice(-6)}</p>
        )}
        {walletMode === 'personal' && isConnected && (
          <p className="text-xs text-gray-600">Sends from your connected wallet → held in escrow until claimed</p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-sm text-gray-400">
            Amount to Send <span className="text-amber-400 font-medium">({chain.symbol} native — not USDC)</span>
          </label>
          {walletMode === 'service' && serviceWalletBalance && (
            <span className="text-xs text-gray-500">
              Available: {serviceWalletBalance} {chain.symbol}
              {tokenPriceUSD && <span className="text-gray-600 ml-1">(≈ ${(parseFloat(serviceWalletBalance) * tokenPriceUSD).toFixed(2)} USD)</span>}
            </span>
          )}
          {walletMode === 'personal' && isConnected && (
            <span className="text-xs text-gray-500">
              Your balance: {balanceLoading ? '...' : `${formattedBalance} ${chain.symbol}`}
              {tokenPriceUSD && parseFloat(formattedBalance) > 0 && <span className="text-gray-600 ml-1">(≈ ${(parseFloat(formattedBalance) * tokenPriceUSD).toFixed(2)} USD)</span>}
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
            max={undefined}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 pr-20 text-white placeholder-gray-500 focus:border-sky-500 focus:outline-none transition-colors"
          />
          <span
            className="absolute right-4 top-1/2 -translate-y-1/2 font-medium px-2 py-1 rounded text-sm"
            style={{ backgroundColor: `${chain.color}20`, color: chain.color }}
          >
            {chain.symbol}
          </span>
        </div>
        {walletMode === 'personal' && isConnected && !!amount && parseFloat(amount) > parseFloat(formattedBalance) && (
          <p className="text-xs text-red-400">Insufficient balance in your wallet</p>
        )}
        {walletMode === 'service' && !!serviceWalletBalance && !!amount && parseFloat(amount) > parseFloat(serviceWalletBalance) && (
          <p className="text-xs text-red-400">Insufficient balance in service wallet</p>
        )}
      </div>

      {/* Sender Token Selector */}
      {(SENDER_TOKENS[selectedChain] || []).length > 1 && (
        <div className="space-y-2">
          <label className="text-sm text-gray-400">You Send</label>
          <select
            value={senderToken}
            onChange={(e) => setSenderToken(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-sky-500 focus:outline-none transition-colors"
          >
            {(SENDER_TOKENS[selectedChain] || []).map((token) => (
              <option key={token.symbol} value={token.symbol}>
                {token.name}
              </option>
            ))}
          </select>
          {senderToken && senderToken !== chain.symbol && (
            <p className="text-xs text-amber-400">⚠️ ERC-20 send — your wallet will prompt for token approval + transfer</p>
          )}
        </div>
      )}

      {/* Recipient Token Selector */}
      {(RECIPIENT_TOKENS[selectedChain] || []).length > 1 && (
        <div className="space-y-2">
          <label className="text-sm text-gray-400">Recipient Receives</label>
          <select
            value={recipientToken}
            onChange={(e) => setRecipientToken(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-sky-500 focus:outline-none transition-colors"
          >
            {(RECIPIENT_TOKENS[selectedChain] || []).map((token) => (
              <option key={token.symbol} value={token.symbol}>
                {token.name}
              </option>
            ))}
          </select>
          {recipientToken && recipientToken.includes('→') && (
            <p className="text-xs text-sky-400">↗ Cross-chain bridge — recipient gets funds on a different network</p>
          )}
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
        disabled={
          !senderEmail || !recipientEmail || !amount || loading ||
          (walletMode === 'personal' && !isConnected)
        }
        className="w-full py-4 bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-600 hover:to-teal-600 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed rounded-lg font-bold text-lg transition-all flex items-center justify-center gap-2"
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <>
            <PaperAirplaneIcon className="w-5 h-5" />
            {walletMode === 'service' && !selfVerified
              ? 'Verify Identity to Send'
              : walletMode === 'personal' && !isConnected
              ? 'Connect Wallet to Send'
              : 'Send'}
          </>
        )}
      </button>
    </div>
  );
}
