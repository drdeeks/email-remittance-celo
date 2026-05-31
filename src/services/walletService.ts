import { ethers } from 'ethers';

export const generateWalletWithInstructions = () => {
    const wallet = ethers.Wallet.createRandom();
    
    const importInstructions = `
## Wallet Import Instructions

### MetaMask
1. Open MetaMask extension
2. Click the account icon in the top right
3. Select "Import Account"
4. Paste the private key: ${wallet.privateKey}
5. Click "Import"

### Valora
1. Open Valora app
2. Tap the menu icon
3. Select "Import Wallet"
4. Choose "Import using Private Key"
5. Paste the private key: ${wallet.privateKey}
6. Tap "Import Wallet"

### Other Wallets
Use the private key: ${wallet.privateKey}

**Important Security Note:**
- Never share this private key with anyone
- Store it securely
- If lost, you will lose access to your funds
`;
    
    return {
        walletAddress: wallet.address,
        privateKey: wallet.privateKey,
        importInstructions,
    };
};