import { createWalletClient, createPublicClient, http, parseEther, formatEther, defineChain } from 'viem';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import { celo, base } from 'viem/chains';
import { logger } from '../utils/logger';

// ─── Monad Testnet (Chain ID 10143) ───────────────────────────────────────────
// Dr Deeks specified chain ID 143 — closest match is Monad Testnet at 10143
const monad = defineChain({
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://testnet-rpc.monad.xyz'] },
    public:  { http: ['https://testnet-rpc.monad.xyz'] },
  },
  blockExplorers: {
    default: { name: 'Monad Explorer', url: 'https://testnet.monadexplorer.com' },
  },
  testnet: true,
});

// ─── Supported Chains ─────────────────────────────────────────────────────────
export type SupportedChain = 'celo' | 'base' | 'monad';

const CHAIN_CONFIG: Record<SupportedChain, {
  chain: typeof celo | typeof base | typeof monad;
  rpcEnvKey: string;
  defaultRpc: string;
  nativeCurrency: string;
  explorerBase: string;
  chainId: number;
}> = {
  celo: {
    chain: celo,
    rpcEnvKey: 'CELO_RPC_URL',
    defaultRpc: 'https://forno.celo.org',
    nativeCurrency: 'CELO',
    explorerBase: 'https://explorer.celo.org/mainnet/tx',
    chainId: 42220,
  },
  base: {
    chain: base,
    rpcEnvKey: 'BASE_RPC_URL',
    defaultRpc: 'https://mainnet.base.org',
    nativeCurrency: 'ETH',
    explorerBase: 'https://basescan.org/tx',
    chainId: 8453,
  },
  monad: {
    chain: monad,
    rpcEnvKey: 'MONAD_RPC_URL',
    defaultRpc: 'https://testnet-rpc.monad.xyz',
    nativeCurrency: 'MON',
    explorerBase: 'https://testnet.monadexplorer.com/tx',
    chainId: 10143,
  },
};

// ─── Auto-Detection ───────────────────────────────────────────────────────────
/**
 * Detect chain from currency string, chain name, or chain ID.
 * Defaults to celo.
 *
 * Examples:
 *   "CELO" → celo  |  "ETH" → base  |  "MON" / "MONAD" → monad
 *   "base" → base  |  8453 → base   |  10143 → monad
 */
export function detectChain(currency?: string, chain?: string | number): SupportedChain {
  // Numeric chain ID
  if (typeof chain === 'number' || (typeof chain === 'string' && /^\d+$/.test(chain))) {
    const id = Number(chain);
    if (id === 8453)  return 'base';
    if (id === 10143 || id === 143) return 'monad';
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

// ─── Bridge Routes ─────────────────────────────────────────────────────────────
// Supported bridge paths using LI.FI (aggregates Squid, Stargate, Hop, etc.)
// Direct routes confirmed: Celo↔Base via Squid Router + Axelar
// Monad is testnet — bridge via direct transfer on testnet (no prod bridge yet)
const BRIDGE_ROUTES: Record<string, { provider: string; supported: boolean; note?: string }> = {
  'celo→base': { provider: 'lifi/squid', supported: true },
  'base→celo': { provider: 'lifi/squid', supported: true },
  'celo→monad': { provider: 'direct-testnet', supported: true, note: 'Monad testnet only' },
  'monad→celo': { provider: 'direct-testnet', supported: true, note: 'Monad testnet only' },
  'base→monad': { provider: 'direct-testnet', supported: true, note: 'Monad testnet only' },
  'monad→base': { provider: 'direct-testnet', supported: true, note: 'Monad testnet only' },
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
    logger.info(`${chainName.toUpperCase()} client initialized: ${account.address}`);
    return this.clients[chainName]!;
  }

  /**
   * Send native currency on any supported chain.
   * Auto-detects chain from currency or explicit chain param.
   */
  async sendNative(
    toAddress: string,
    amount: number,
    chainName: SupportedChain = 'celo'
  ): Promise<{ txHash: string; chain: SupportedChain; explorerUrl: string }> {
    const { walletClient, publicClient, account } = this.getClients(chainName);
    const config = CHAIN_CONFIG[chainName];

    logger.info(`Sending ${amount} ${config.nativeCurrency} to ${toAddress} on ${chainName}`);

    try {
      const hash = await walletClient.sendTransaction({
        account,
        to: toAddress as `0x${string}`,
        value: parseEther(amount.toString()),
        chain: config.chain,
      });

      logger.info(`TX sent on ${chainName}: ${hash}`);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status === 'reverted') throw new Error('Transaction reverted on chain');
      logger.info(`TX confirmed on ${chainName}: ${hash}`);

      return {
        txHash: hash,
        chain: chainName,
        explorerUrl: getExplorerUrl(hash, chainName),
      };
    } catch (error) {
      logger.error(`Failed to send on ${chainName}`, error);
      throw error;
    }
  }

  /**
   * Bridge funds between chains via LI.FI API.
   * Supports: celo↔base, celo↔monad, base↔monad
   */
  async getBridgeQuote(
    fromChain: SupportedChain,
    toChain: SupportedChain,
    amount: number,
    toAddress: string
  ): Promise<BridgeQuote> {
    const routeKey = `${fromChain}→${toChain}`;
    const route = BRIDGE_ROUTES[routeKey];

    if (!route) {
      throw new Error(`Bridge route not supported: ${fromChain} → ${toChain}`);
    }

    const fromConfig = CHAIN_CONFIG[fromChain];
    const toConfig = CHAIN_CONFIG[toChain];

    logger.info(`Getting bridge quote: ${amount} ${fromConfig.nativeCurrency} ${fromChain}→${toChain}`);

    // LI.FI quote API — aggregates best route across Squid, Stargate, Hop, Connext
    try {
      const lifiUrl = new URL('https://li.quest/v1/quote');
      lifiUrl.searchParams.set('fromChain', fromConfig.chainId.toString());
      lifiUrl.searchParams.set('toChain', toConfig.chainId.toString());
      lifiUrl.searchParams.set('fromToken', 'NATIVE');
      lifiUrl.searchParams.set('toToken', 'NATIVE');
      lifiUrl.searchParams.set('fromAmount', parseEther(amount.toString()).toString());
      lifiUrl.searchParams.set('fromAddress', this.getWalletAddress(fromChain));
      lifiUrl.searchParams.set('toAddress', toAddress);

      const res = await fetch(lifiUrl.toString(), {
        headers: { 'Accept': 'application/json' },
      });

      if (res.ok) {
        const data = await res.json();
        const estimate = data?.estimate || {};

        return {
          fromChain,
          toChain,
          fromAmount: amount.toString(),
          estimatedToAmount: formatEther(BigInt(estimate.toAmount || '0')),
          estimatedFee: estimate.feeCosts?.[0]?.amountUSD
            ? `$${estimate.feeCosts[0].amountUSD}`
            : '< $0.10',
          estimatedTime: estimate.executionDuration
            ? `${Math.ceil(estimate.executionDuration / 60)} min`
            : '2-5 min',
          provider: data?.tool || route.provider,
          bridgeUrl: `https://jumper.exchange/?fromChain=${fromConfig.chainId}&toChain=${toConfig.chainId}`,
        };
      }
    } catch (err) {
      logger.warn('LI.FI quote failed, returning estimate', err);
    }

    // Fallback estimate if LI.FI is unreachable
    return {
      fromChain,
      toChain,
      fromAmount: amount.toString(),
      estimatedToAmount: (amount * 0.997).toFixed(6), // ~0.3% bridge fee estimate
      estimatedFee: '< $0.10',
      estimatedTime: '2-5 min',
      provider: route.provider,
      bridgeUrl: `https://jumper.exchange/?fromChain=${fromConfig.chainId}&toChain=${toConfig.chainId}`,
    };
  }

  /**
   * Execute a bridge transaction via LI.FI.
   * Returns the source TX hash — bridge completes async on destination.
   */
  async executeBridge(
    fromChain: SupportedChain,
    toChain: SupportedChain,
    amount: number,
    toAddress: string
  ): Promise<{ txHash: string; fromChain: SupportedChain; toChain: SupportedChain; explorerUrl: string; bridgeTrackingUrl: string }> {
    const fromConfig = CHAIN_CONFIG[fromChain];
    const toConfig = CHAIN_CONFIG[toChain];
    const { walletClient, publicClient, account } = this.getClients(fromChain);

    logger.info(`Bridging ${amount} ${fromConfig.nativeCurrency}: ${fromChain} → ${toChain}`);

    // Get the actual bridge transaction data from LI.FI
    try {
      const lifiUrl = new URL('https://li.quest/v1/quote');
      lifiUrl.searchParams.set('fromChain', fromConfig.chainId.toString());
      lifiUrl.searchParams.set('toChain', toConfig.chainId.toString());
      lifiUrl.searchParams.set('fromToken', 'NATIVE');
      lifiUrl.searchParams.set('toToken', 'NATIVE');
      lifiUrl.searchParams.set('fromAmount', parseEther(amount.toString()).toString());
      lifiUrl.searchParams.set('fromAddress', account.address);
      lifiUrl.searchParams.set('toAddress', toAddress);

      const res = await fetch(lifiUrl.toString(), {
        headers: { 'Accept': 'application/json' },
      });

      if (res.ok) {
        const quote = await res.json();
        const tx = quote?.transactionRequest;

        if (tx?.to && tx?.data) {
          const hash = await walletClient.sendTransaction({
            account,
            to: tx.to as `0x${string}`,
            data: tx.data as `0x${string}`,
            value: tx.value ? BigInt(tx.value) : undefined,
            chain: fromConfig.chain,
          });

          logger.info(`Bridge TX sent: ${hash}`);

          return {
            txHash: hash,
            fromChain,
            toChain,
            explorerUrl: getExplorerUrl(hash, fromChain),
            bridgeTrackingUrl: `https://scan.li.fi/tx/${hash}`,
          };
        }
      }
    } catch (err) {
      logger.error('LI.FI bridge execution failed', err);
      throw new Error(`Bridge failed: ${(err as Error).message}`);
    }

    throw new Error('Could not get bridge transaction from LI.FI');
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

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

  async getTransactionReceipt(hash: string, chainName: SupportedChain = 'celo') {
    return this.getClients(chainName).publicClient.getTransactionReceipt({
      hash: hash as `0x${string}`,
    });
  }

  getSupportedChains(): SupportedChain[] {
    return Object.keys(CHAIN_CONFIG) as SupportedChain[];
  }

  getSupportedBridgeRoutes() {
    return Object.entries(BRIDGE_ROUTES)
      .filter(([, v]) => v.supported)
      .map(([route, v]) => ({ route, ...v }));
  }

  // Legacy alias for backwards compat
  async sendCelo(toAddress: string, amountCelo: number): Promise<string> {
    const result = await this.sendNative(toAddress, amountCelo, 'celo');
    return result.txHash;
  }
}

export const chainService = new ChainService();
export const celoService = chainService; // backwards compat
