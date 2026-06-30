import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

interface WalletWithInstructions {
  walletAddress: string;
  privateKey: string;
  importInstructions: string;
}

export const generateWalletWithInstructions = (): WalletWithInstructions => {
  try {
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    
    const importInstructions = `
To import this wallet:

1. MetaMask:
   - Open MetaMask extension
   - Click the account icon → Import Account
   - Select "Private Key" and paste your private key

2. Valora:
   - Open Valora app
   - Tap the menu → Import Wallet
   - Select "Recovery Phrase or Private Key"
   - Paste your private key

3. Other wallets:
   - Look for "Import Private Key" or "Add Account" option
   - Paste your private key when prompted

IMPORTANT: Save your private key now. It will not be shown again.`;
    
    return {
      walletAddress: account.address,
      privateKey,
      importInstructions
    };
  } catch (error) {
    throw new Error('Failed to generate wallet with instructions');
  }
};

export const walletService = {
  generateWalletWithInstructions,
  generateWallet: () => {
    try {
      const privateKey = generatePrivateKey();
      const account = privateKeyToAccount(privateKey);
      return {
        address: account.address,
        privateKey: privateKey
      };
    } catch (error) {
      console.error('Wallet generation failed:', error);
      throw new Error('Failed to generate wallet');
    }
  }
};