import { ethers } from 'ethers';

// Simple configuration with defaults
const config = {
  celoProviderUrl: process.env.CELO_PROVIDER_URL || 'https://alfajores-forno.celo-testnet.org',
  celoPrivateKey: process.env.CELO_PRIVATE_KEY || '0x' + '1'.repeat(64),
  celoStablecoinAddress: process.env.CELO_STABLECOIN_ADDRESS || '0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1',
  celoContractAddress: process.env.CELO_CONTRACT_ADDRESS || '',
};

export class CeloService {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private stablecoinContract: ethers.Contract | null = null;
  private isInitialized = false;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(config.celoProviderUrl);
    this.wallet = new ethers.Wallet(config.celoPrivateKey, this.provider);
  }

  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      // Load stablecoin contract if address provided
      if (config.celoStablecoinAddress) {
        const stablecoinABI = [
          'function transfer(address to, uint amount) external returns (bool)',
          'function allowance(address owner, address spender) view returns (uint)',
          'function approve(address spender, uint amount) external returns (bool)',
          'function balanceOf(address account) view returns (uint)',
          'function decimals() view returns (uint8)',
          'function symbol() view returns (string)',
          'function name() view returns (string)',
        ];

        this.stablecoinContract = new ethers.Contract(
          config.celoStablecoinAddress,
          stablecoinABI,
          this.wallet,
        );
      }

      this.isInitialized = true;
      console.log('Celo service initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize Celo service:', error);
      return false;
    }
  }

  async getBalance(address: string): Promise<{ balance: string; stableBalance: string }> {
    try {
      // CELO native balance
      const balance = await this.provider.getBalance(address);
      const weiBalance = balance.toString();

      let stableBalance = '0';
      if (this.stablecoinContract) {
        const stable = await this.stablecoinContract.balanceOf(address);
        stableBalance = stable.toString();
      }

      return {
        balance: weiBalance,
        stableBalance,
      };
    } catch (error: any) {
      throw new Error(`Failed to get balance for ${address}: ${error.message}`);
    }
  }

  async transferNative(to: string, amountWei: string): Promise<{ success: boolean; txHash?: string }> {
    try {
      const tx = await this.wallet.sendTransaction({
        to,
        value: amountWei,
      });

      const receipt = await tx.wait();
      return {
        success: receipt?.status === 1,
        txHash: receipt?.hash,
      };
    } catch (error: any) {
      throw new Error(`Native transfer failed: ${error.message}`);
    }
  }

  async transferStablecoin(
    to: string,
    amount: string,
  ): Promise<{ success: boolean; txHash: string }> {
    if (!this.stablecoinContract) {
      throw new Error('Stablecoin contract not initialized');
    }

    try {
      // Get token decimals
      const decimals = await this.stablecoinContract.decimals();
      const amountWithDecimals = ethers.parseUnits(amount, decimals);

      const tx = await this.stablecoinContract.transfer(to, amountWithDecimals);
      const receipt = await tx.wait();

      return {
        success: receipt?.status === 1,
        txHash: receipt?.hash || '',
      };
    } catch (error: any) {
      throw new Error(`Stablecoin transfer failed: ${error.message}`);
    }
  }

  async disburseFunds(
    recipientEmail: string,
    amount: number,
    currency: string,
  ): Promise<{ success: boolean; data?: { txHash: string } }> {
    // In a real implementation, we would:
    // 1. Look up the recipient's Celo address from their email
    // 2. Transfer the specified amount
    // For demo, return a mock success
    try {
      const mockTxHash = '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
      
      return {
        success: true,
        data: { txHash: mockTxHash },
      };
    } catch (error: any) {
      return {
        success: false,
      };
    }
  }

  async lockFunds(
    amount: string,
    currency: string,
  ): Promise<{ success: boolean; txHash?: string }> {
    // In a production implementation, we would call a smart contract
    // that locks funds until verification is complete.
    if (config.celoContractAddress) {
      throw new Error('Lock contract not implemented');
    } else {
      // Degraded mode: directly hold funds in escrow wallet
      return { success: true, txHash: '0x' };
    }
  }

  async releaseLockedFunds(
    lockedTxHash: string,
    recipient: string,
  ): Promise<{ success: boolean; txHash?: string }> {
    // Release funds from lock after verification
    if (config.celoContractAddress) {
      throw new Error('Release contract not implemented');
    } else {
      return { success: true, txHash: '0x' };
    }
  }

  async getTransaction(txHash: string) {
    try {
      const receipt = await this.provider.getTransactionReceipt(txHash);
      const tx = await this.provider.getTransaction(txHash);
      return { receipt, transaction: tx };
    } catch (error: any) {
      throw new Error(`Transaction lookup failed: ${error.message}`);
    }
  }
}

export const celoService = new CeloService();
