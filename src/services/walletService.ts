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
    
    // Debug: Check if privateKey is valid
    console.log('Private key in NEW function:', privateKey);
    
    // Use simple string concatenation to ensure private key is included
    const importInstructions = `
To import this wallet:

1. MetaMask:
   - Open MetaMask extension
   - Click the account icon → Import Account
   - Select "Private Key" and paste this private key:
   ` + privateKey + `

2. Valora:
   - Open Valora app
   - Tap the menu → Import Wallet
   - Select "Recovery Phrase or Private Key"
   - Paste this private key:
   ` + privateKey + `

3. Other wallets:
   - Look for "Import Private Key" or "Add Account" option
   - Paste this private key when prompted:
   ` + privateKey;
    
    console.log('Generated instructions:', importInstructions);
    console.log('Instructions contain private key:', importInstructions.includes(privateKey));
    
    return {
      walletAddress: account.address,
      privateKey,
      importInstructions
    };
  } catch (error) {
    console.error('Wallet generation failed:', error);
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