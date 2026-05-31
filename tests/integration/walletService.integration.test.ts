import { generateWalletWithInstructions } from '../../src/services/walletService';

describe('WalletService Integration Tests', () => {
    describe('generateWalletWithInstructions', () => {
        it('should generate a wallet with import instructions', () => {
            const wallet = generateWalletWithInstructions();
            
            expect(wallet).toHaveProperty('walletAddress');
            expect(wallet).toHaveProperty('privateKey');
            expect(wallet).toHaveProperty('importInstructions');
            
            expect(wallet.walletAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
            expect(wallet.privateKey).toMatch(/^0x[a-fA-F0-9]{64}$/);
            expect(wallet.importInstructions).toContain('MetaMask');
            expect(wallet.importInstructions).toContain('Valora');
            expect(wallet.importInstructions).toContain(wallet.privateKey);
        });
        
        it('should generate different wallets on each call', () => {
            const wallet1 = generateWalletWithInstructions();
            const wallet2 = generateWalletWithInstructions();
            
            expect(wallet1.walletAddress).not.toBe(wallet2.walletAddress);
            expect(wallet1.privateKey).not.toBe(wallet2.privateKey);
        });
    });
});