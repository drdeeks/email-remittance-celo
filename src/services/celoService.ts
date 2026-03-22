import { createWalletClient, createPublicClient, http, parseEther, formatEther } from 'viem';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import { celo, base } from 'viem/chains';
import { logger } from '../utils/logger';

// Supported chains
export type SupportedChain = 'celo' | 'base';

const CHAIN_CONFIG: Record<SupportedChain, {
  chain: typeof celo | typeof base;
  rpcEnvKey: string;
  defaultRpc: string;
  nativeCurrency: string;
  explorerBase: string;
}> = {
  celo: {
    chain: celo,
    rpcEnvKey: 'CELO_RPC_URL',
    defaultRpc: 'https://forno.celo.org',
    nativeCurrency: 'CELO',
    explorerBase: 'https://explorer.celo.org/mainnet/tx',
  },
  base: {
    chain: base,
    rpcEnvKey: 'BASE_RPC_URL',
    defaultRpc: 'https://mainnet.base.org',
    nativeCurrency: 'ETH',
    explorerBase: 'https://basescan.org/tx',
  },
};

/**
 * Detect chain from currency string or explicit chain param.
 * Defaults to celo.
 *
 * Examples:
 *   "CELO" → celo
 *   "ETH" on base → base
 *   "BASE" → base
 *   "base" → base
 */
export function detectChain(currency?: string, chain?: string): SupportedChain {
  const raw = (chain || currency || '').toLowerCase().trim();
  if (raw === 'base' || raw === 'eth' || raw === 'ethereum') return 'base';
  return 'celo';
}

export function getExplorerUrl(txHash: string, chain: SupportedChain): string {
  return `${CHAIN_CONFIG[chain].explorerBase}/${txHash}`;
}

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
   * Send native currency (CELO or ETH on Base) to an address.
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
   * Legacy alias — always uses Celo (backwards compat)
   */
  async sendCelo(toAddress: string, amountCelo: number): Promise<string> {
    const result = await this.sendNative(toAddress, amountCelo, 'celo');
    return result.txHash;
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

  async getTransactionReceipt(hash: string, chainName: SupportedChain = 'celo') {
    return this.getClients(chainName).publicClient.getTransactionReceipt({
      hash: hash as `0x${string}`,
    });
  }

  getSupportedChains(): SupportedChain[] {
    return Object.keys(CHAIN_CONFIG) as SupportedChain[];
  }

  getNativeCurrency(chainName: SupportedChain): string {
    return CHAIN_CONFIG[chainName].nativeCurrency;
  }
}

// Export singleton + legacy named export for backwards compat
export const chainService = new ChainService();
export const celoService = chainService;
