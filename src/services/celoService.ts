import { createWalletClient, createPublicClient, http, parseEther, formatEther, PublicClient, WalletClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celo } from 'viem/chains';
import { generatePrivateKey } from 'viem/accounts';
import { logger } from '../utils/logger';

class CeloService {
  private walletClient: WalletClient;
  private publicClient: PublicClient;
  private account: ReturnType<typeof privateKeyToAccount>;

  constructor() {
    const privateKey = process.env.WALLET_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('WALLET_PRIVATE_KEY not found in environment');
    }

    const rpcUrl = process.env.CELO_RPC_URL || 'https://forno.celo.org';

    this.account = privateKeyToAccount(privateKey as `0x${string}`);
    
    this.walletClient = createWalletClient({
      account: this.account,
      chain: celo,
      transport: http(rpcUrl)
    });

    this.publicClient = createPublicClient({
      chain: celo,
      transport: http(rpcUrl)
    });

    logger.info(`Celo service initialized with wallet: ${this.account.address}`);
  }

  /**
   * Send CELO to an address
   */
  async sendCelo(toAddress: string, amountCelo: number): Promise<string> {
    try {
      logger.info(`Sending ${amountCelo} CELO to ${toAddress}`);

      const hash = await this.walletClient.sendTransaction({
        to: toAddress as `0x${string}`,
        value: parseEther(amountCelo.toString()),
      });

      logger.info(`Transaction sent: ${hash}`);

      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
      
      if (receipt.status === 'reverted') {
        throw new Error('Transaction reverted');
      }

      logger.info(`Transaction confirmed: ${hash}`);
      return hash;
    } catch (error) {
      logger.error('Failed to send CELO', error);
      throw error;
    }
  }

  /**
   * Get CELO balance for an address
   */
  async getBalance(address: string): Promise<string> {
    try {
      const balance = await this.publicClient.getBalance({
        address: address as `0x${string}`
      });

      return formatEther(balance);
    } catch (error) {
      logger.error(`Failed to get balance for ${address}`, error);
      throw error;
    }
  }

  /**
   * Generate a new wallet for claim recipient
   */
  generateClaimWallet(): { address: string; privateKey: string } {
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);

    logger.info(`Generated new claim wallet: ${account.address}`);

    return {
      address: account.address,
      privateKey: privateKey
    };
  }

  /**
   * Estimate gas for a CELO transfer
   */
  async estimateGas(toAddress: string, amountCelo: number): Promise<bigint> {
    try {
      const gas = await this.publicClient.estimateGas({
        account: this.account,
        to: toAddress as `0x${string}`,
        value: parseEther(amountCelo.toString()),
      });

      return gas;
    } catch (error) {
      logger.error('Failed to estimate gas', error);
      throw error;
    }
  }

  /**
   * Get the service wallet address
   */
  getWalletAddress(): string {
    return this.account.address;
  }

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(hash: string) {
    return this.publicClient.getTransactionReceipt({
      hash: hash as `0x${string}`
    });
  }

  /**
   * Get current gas price
   */
  async getGasPrice(): Promise<bigint> {
    return this.publicClient.getGasPrice();
  }
}

export const celoService = new CeloService();
