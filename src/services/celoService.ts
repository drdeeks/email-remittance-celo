import { createWalletClient, createPublicClient, http, parseEther, formatEther, defineChain } from 'viem';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import { celo, base } from 'viem/chains';
import { logger } from '../utils/logger';

// ─── Monad Mainnet (Chain ID 143) ─────────────────────────────────────────────
const monad = defineChain({
  id: 143,
  name: 'Monad',
  nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.monad.xyz'] },
    public:  { http: ['https://rpc.monad.xyz', 'https://rpc1.monad.xyz', 'https://rpc2.monad.xyz'] },
  },
  blockExplorers: {
    default: { name: 'Monadscan', url: 'https://monadscan.com' },
    monadvision: { name: 'Monad Vision', url: 'https://monadvision.com' },
  },
  testnet: false,
});

// ─── Supported Chains ─────────────────────────────────────────────────────────
export type SupportedChain = 'celo' | 'base' | 'monad';

export const CHAIN_CONFIG: Record<SupportedChain, {
  chain: typeof celo | typeof base | typeof monad;
  rpcEnvKey: string;
  defaultRpc: string;
  backupRpc: string;  // Fallback RPC for retries
  nativeCurrency: string;
  explorerBase: string;
  chainId: number;
  // Uniswap Universal Router address on this chain
  uniswapUniversalRouter: `0x${string}` | null;
}> = {
  celo: {
    chain: celo,
    rpcEnvKey: 'CELO_RPC_URL',
    defaultRpc: 'https://forno.celo.org',
    backupRpc: 'https://celo-mainnet.infura.io/v3/public',
    nativeCurrency: 'CELO',
    explorerBase: 'https://celoscan.io/tx',
    chainId: 42220,
    uniswapUniversalRouter: '0x5302086A3a25d473aAbBc0eC8586573516cF2099',
  },
  base: {
    chain: base,
    rpcEnvKey: 'BASE_RPC_URL',
    defaultRpc: 'https://mainnet.base.org',
    backupRpc: 'https://base.llamarpc.com',
    nativeCurrency: 'ETH',
    explorerBase: 'https://basescan.org/tx',
    chainId: 8453,
    uniswapUniversalRouter: '0x2626664c2603336E57B271c5C0b26F421741e481',
  },
  monad: {
    chain: monad,
    rpcEnvKey: 'MONAD_RPC_URL',
    defaultRpc: 'https://rpc.monad.xyz',
    backupRpc: 'https://rpc1.monad.xyz',
    nativeCurrency: 'MON',
    explorerBase: 'https://monadscan.com/tx',
    chainId: 143,
    uniswapUniversalRouter: '0x182a927119d56008d921126764bf884221b10f59',
  },
};

// ─── Auto-Detection ───────────────────────────────────────────────────────────
export function detectChain(currency?: string, chain?: string | number): SupportedChain {
  if (typeof chain === 'number' || (typeof chain === 'string' && /^\d+$/.test(chain))) {
    const id = Number(chain);
    if (id === 8453)  return 'base';
    if (id === 143)   return 'monad';
    if (id === 42220) return 'celo';
  }
  const raw = (chain || currency || '').toString().toLowerCase().trim();
  if (raw === 'base' || raw === 'eth' || raw === 'ethereum') return 'base';
  if (raw === 'monad' || raw === 'mon') return 'monad';
  return 'celo';
}

export function getExplorerUrl(txHash: string, chain: SupportedChain): string {
  return `${CHAIN_CONFIG[chain].explorerBase}/${txHash}`;
}

export function getChainId(chain: SupportedChain): number {
  return CHAIN_CONFIG[chain].chainId;
}

export function getNativeCurrency(chain: SupportedChain): string {
  return CHAIN_CONFIG[chain].nativeCurrency;
}

// ─── Bridge Routes (via LI.FI — aggregates Squid, Stargate, Axelar) ──────────
const BRIDGE_ROUTES: Record<string, { provider: string; supported: boolean }> = {
  'celo→base':  { provider: 'lifi/squid+axelar', supported: true },
  'base→celo':  { provider: 'lifi/squid+axelar', supported: true },
  'celo→monad': { provider: 'lifi/uniswap',      supported: true },
  'monad→celo': { provider: 'lifi/uniswap',      supported: true },
  'base→monad': { provider: 'lifi/uniswap',      supported: true },
  'monad→base': { provider: 'lifi/uniswap',      supported: true },
};

export interface BridgeQuote {
  fromChain: SupportedChain;
  toChain: SupportedChain;
  fromAmount: string;
  estimatedToAmount: string;
  estimatedFee: string;
  estimatedTime: string;
  provider: string;
  bridgeUrl: string;
}

// ─── Chain Service ─────────────────────────────────────────────────────────────
class ChainService {
  private clients: Partial<Record<SupportedChain, {
    walletClient: ReturnType<typeof createWalletClient>;
    publicClient: ReturnType<typeof createPublicClient>;
    account: ReturnType<typeof privateKeyToAccount>;
  }>> = {};

  private getClients(chainName: SupportedChain) {
    if (this.clients[chainName]) return this.clients[chainName]!;

    const privateKey = process.env.WALLET_PRIVATE_KEY;
    if (!privateKey) throw new Error('WALLET_PRIVATE_KEY not found in environment');

    const config = CHAIN_CONFIG[chainName];
    const rpcUrl = process.env[config.rpcEnvKey] || config.defaultRpc;
    const account = privateKeyToAccount(privateKey as `0x${string}`);

    const walletClient = createWalletClient({
      account,
      chain: config.chain,
      transport: http(rpcUrl),
    });

    const publicClient = createPublicClient({
      chain: config.chain,
      transport: http(rpcUrl),
    });

    this.clients[chainName] = { walletClient, publicClient, account };
    logger.info(`${chainName.toUpperCase()} (chainId: ${config.chainId}) initialized: ${account.address}`);
    return this.clients[chainName]!;
  }

  async sendNative(
    toAddress: string,
    amount: number,
    chainName: SupportedChain = 'celo'
  ): Promise<{ txHash: string; chain: SupportedChain; explorerUrl: string }> {
    const config = CHAIN_CONFIG[chainName];

    logger.info(`Sending ${amount} ${config.nativeCurrency} to ${toAddress} on ${chainName} (chainId: ${config.chainId})`);

    // Try with primary RPC, fallback to backup on failure
    let lastError: Error | null = null;
    const rpcsToTry = [
      process.env[config.rpcEnvKey] || config.defaultRpc,
      config.backupRpc,
    ];

    for (const rpcUrl of rpcsToTry) {
      try {
        const { walletClient, publicClient, account } = this.getClientsWithRpc(chainName, rpcUrl);

        const hash = await walletClient.sendTransaction({
          account,
          to: toAddress as `0x${string}`,
          value: parseEther(amount.toString()),
          chain: config.chain,
        });

        logger.info(`TX sent: ${hash} (via ${rpcUrl})`);
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status === 'reverted') throw new Error('Transaction reverted on chain');

        return { txHash: hash, chain: chainName, explorerUrl: getExplorerUrl(hash, chainName) };
      } catch (error: any) {
        lastError = error;
        logger.warn(`RPC failed (${rpcUrl}): ${error.message}. Trying fallback...`);
      }
    }

    logger.error(`All RPCs failed for ${chainName}`, lastError);
    throw lastError || new Error(`Failed to send on ${chainName}`);
  }

  private getClientsWithRpc(chainName: SupportedChain, rpcUrl: string) {
    const privateKey = process.env.WALLET_PRIVATE_KEY;
    if (!privateKey) throw new Error('WALLET_PRIVATE_KEY not found in environment');

    const config = CHAIN_CONFIG[chainName];
    const account = privateKeyToAccount(privateKey as `0x${string}`);

    const walletClient = createWalletClient({
      account,
      chain: config.chain,
      transport: http(rpcUrl),
    });

    const publicClient = createPublicClient({
      chain: config.chain,
      transport: http(rpcUrl),
    });

    return { walletClient, publicClient, account };
  }

  async getBridgeQuote(
    fromChain: SupportedChain,
    toChain: SupportedChain,
    amount: number,
    toAddress: string
  ): Promise<BridgeQuote> {
    const routeKey = `${fromChain}→${toChain}`;
    if (!BRIDGE_ROUTES[routeKey]?.supported) {
      throw new Error(`Bridge route not supported: ${fromChain} → ${toChain}`);
    }

    const fromConfig = CHAIN_CONFIG[fromChain];
    const toConfig   = CHAIN_CONFIG[toChain];

    try {
      const lifiUrl = new URL('https://li.quest/v1/quote');
      lifiUrl.searchParams.set('fromChain', fromConfig.chainId.toString());
      lifiUrl.searchParams.set('toChain',   toConfig.chainId.toString());
      lifiUrl.searchParams.set('fromToken', 'NATIVE');
      lifiUrl.searchParams.set('toToken',   'NATIVE');
      lifiUrl.searchParams.set('fromAmount', parseEther(amount.toString()).toString());
      lifiUrl.searchParams.set('fromAddress', this.getWalletAddress(fromChain));
      lifiUrl.searchParams.set('toAddress',   toAddress);

      const res = await fetch(lifiUrl.toString(), { headers: { Accept: 'application/json' } });

      if (res.ok) {
        const data = await res.json();
        const est  = data?.estimate || {};
        return {
          fromChain, toChain,
          fromAmount: amount.toString(),
          estimatedToAmount: formatEther(BigInt(est.toAmount || '0')),
          estimatedFee: est.feeCosts?.[0]?.amountUSD ? `$${est.feeCosts[0].amountUSD}` : '< $0.10',
          estimatedTime: est.executionDuration ? `${Math.ceil(est.executionDuration / 60)} min` : '2-5 min',
          provider: data?.tool || BRIDGE_ROUTES[routeKey].provider,
          bridgeUrl: `https://jumper.exchange/?fromChain=${fromConfig.chainId}&toChain=${toConfig.chainId}`,
        };
      }
    } catch (err) {
      logger.warn('LI.FI quote failed, using fallback estimate', err);
    }

    return {
      fromChain, toChain,
      fromAmount: amount.toString(),
      estimatedToAmount: (amount * 0.997).toFixed(6),
      estimatedFee: '< $0.10',
      estimatedTime: '2-5 min',
      provider: BRIDGE_ROUTES[routeKey].provider,
      bridgeUrl: `https://jumper.exchange/?fromChain=${fromConfig.chainId}&toChain=${toConfig.chainId}`,
    };
  }

  async executeBridge(
    fromChain: SupportedChain,
    toChain: SupportedChain,
    amount: number,
    toAddress: string
  ): Promise<{ txHash: string; fromChain: SupportedChain; toChain: SupportedChain; explorerUrl: string; bridgeTrackingUrl: string }> {
    const fromConfig = CHAIN_CONFIG[fromChain];
    const toConfig   = CHAIN_CONFIG[toChain];
    const { walletClient, account } = this.getClients(fromChain);

    logger.info(`Bridge: ${amount} ${fromConfig.nativeCurrency} → ${toChain} (chainId ${toConfig.chainId})`);

    const lifiUrl = new URL('https://li.quest/v1/quote');
    lifiUrl.searchParams.set('fromChain', fromConfig.chainId.toString());
    lifiUrl.searchParams.set('toChain',   toConfig.chainId.toString());
    lifiUrl.searchParams.set('fromToken', 'NATIVE');
    lifiUrl.searchParams.set('toToken',   'NATIVE');
    lifiUrl.searchParams.set('fromAmount', parseEther(amount.toString()).toString());
    lifiUrl.searchParams.set('fromAddress', account.address);
    lifiUrl.searchParams.set('toAddress',   toAddress);

    const res = await fetch(lifiUrl.toString(), { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`LI.FI quote failed: ${res.status}`);

    const quote = await res.json();
    const tx = quote?.transactionRequest;
    if (!tx?.to || !tx?.data) throw new Error('LI.FI returned no transaction data');

    const hash = await walletClient.sendTransaction({
      account,
      to:    tx.to   as `0x${string}`,
      data:  tx.data as `0x${string}`,
      value: tx.value ? BigInt(tx.value) : undefined,
      chain: fromConfig.chain,
    });

    return {
      txHash: hash,
      fromChain, toChain,
      explorerUrl: getExplorerUrl(hash, fromChain),
      bridgeTrackingUrl: `https://scan.li.fi/tx/${hash}`,
    };
  }

  async getBalance(address: string, chainName: SupportedChain = 'celo'): Promise<string> {
    const { publicClient } = this.getClients(chainName);
    const balance = await publicClient.getBalance({ address: address as `0x${string}` });
    return formatEther(balance);
  }

  generateClaimWallet(): { address: string; privateKey: string } {
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    logger.info(`Generated claim wallet: ${account.address}`);
    return { address: account.address, privateKey };
  }

  getWalletAddress(chainName: SupportedChain = 'celo'): string {
    return this.getClients(chainName).account.address;
  }

  async getGasPrice(chainName: SupportedChain = 'celo'): Promise<bigint> {
    return this.getClients(chainName).publicClient.getGasPrice();
  }

  async getTransaction(txHash: string, chainName: SupportedChain = 'celo') {
    const { publicClient } = this.getClients(chainName);
    const hash = txHash as `0x${string}`;

    // Wait for receipt first (confirms tx is mined), then fetch full tx
    // This prevents "not found" errors when tx is submitted but not yet indexed
    try {
      await publicClient.waitForTransactionReceipt({ hash, timeout: 60_000, confirmations: 1 });
    } catch {
      // If waitForTransactionReceipt times out, still try getTransaction below
    }
    return publicClient.getTransaction({ hash });
  }

  async getTransactionReceipt(hash: string, chainName: SupportedChain = 'celo') {
    return this.getClients(chainName).publicClient.getTransactionReceipt({ hash: hash as `0x${string}` });
  }

  getSupportedChains(): SupportedChain[] {
    return Object.keys(CHAIN_CONFIG) as SupportedChain[];
  }

  getSupportedBridgeRoutes() {
    return Object.entries(BRIDGE_ROUTES)
      .filter(([, v]) => v.supported)
      .map(([route, v]) => ({ route, ...v }));
  }

  /**
   * Send native token from a specific private key (used for escrow forwarding).
   * Different from sendNative which uses the server's configured wallet.
   */
  async sendNativeFromKey(
    fromPrivateKey: string,
    toAddress: string,
    amount: number,
    chainName: SupportedChain = 'celo'
  ): Promise<string> {
    const config = CHAIN_CONFIG[chainName];
    const rpcUrl = process.env[config.rpcEnvKey] || config.defaultRpc;
    const account = privateKeyToAccount(fromPrivateKey as `0x${string}`);

    const walletClient = createWalletClient({
      account,
      chain: config.chain,
      transport: http(rpcUrl),
    });

    const publicClient = createPublicClient({
      chain: config.chain,
      transport: http(rpcUrl),
    });

    logger.info(`Forwarding ${amount} ${config.nativeCurrency} from escrow ${account.address} to ${toAddress}`);

    const txParams: any = {
      account,
      to: toAddress as `0x${string}`,
      value: parseEther(amount.toString()),
      chain: config.chain,
    };
    const hash = await walletClient.sendTransaction(txParams);

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status === 'reverted') throw new Error('Escrow forward transaction reverted');

    logger.info(`Escrow forward confirmed: ${hash}`);
    return hash;
  }

  // Legacy alias
  async sendCelo(toAddress: string, amountCelo: number): Promise<string> {
    return (await this.sendNative(toAddress, amountCelo, 'celo')).txHash;
  }
}

export const chainService = new ChainService();
export const celoService = chainService;
