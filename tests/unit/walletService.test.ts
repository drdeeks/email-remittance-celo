import { generateWalletWithInstructions } from '../../src/services/walletService';
import { ethers } from 'ethers';

jest.mock('ethers');

describe('WalletService', () => {
    describe('generateWalletWithInstructions', () => {
        it('should generate a wallet with import instructions', () => {
            const mockWallet = {
                address: '0x1234567890123456789012345678901234567890',
                privateKey: '0xprivatekey123',
            };
            
            (ethers.Wallet as jest.Mock).createRandom.mockReturnValue(mockWallet);
            
            const result = generateWalletWithInstructions();
            
            expect(result).toEqual({
                walletAddress: '0x1234567890123456789012345678901234567890',
                privateKey: '0xprivatekey123',
                importInstructions: expect.stringContaining('MetaMask'),
            });
            expect(ethers.Wallet.createRandom).toHaveBeenCalled();
        });
        
        it('should generate different wallets on each call', () => {
            const mockWallet1 = {
                address: '0x123',
                privateKey: '0xprivate1',
            };
            const mockWallet2 = {
                address: '0x456',
                privateKey: '0xprivate2',
            };
            
            (ethers.Wallet as jest.Mock).createRandom
                .mockReturnValueOnce(mockWallet1)
                .mockReturnValueOnce(mockWallet2);
            
            const result1 = generateWalletWithInstructions();
            const result2 = generateWalletWithInstructions();
            
            expect(result1.walletAddress).not.toBe(result2.walletAddress);
            expect(result1.privateKey).not.toBe(result2.privateKey);
        });
        
        it('should include MetaMask import instructions', () => {
            const mockWallet = {
                address: '0x123',
                privateKey: '0xprivatekey123',
            };
            
            (ethers.Wallet as jest.Mock).createRandom.mockReturnValue(mockWallet);
            
            const result = generateWalletWithInstructions();
            
            expect(result.importInstructions).toContain('MetaMask');
            expect(result.importInstructions).toContain('0xprivatekey123');
        });
        
        it('should include Valora import instructions', () => {
            const mockWallet = {
                address: '0x123',
                privateKey: '0xprivatekey123',
            };
            
            (ethers.Wallet as jest.Mock).createRandom.mockReturnValue(mockWallet);
            
            const result = generateWalletWithInstructions();
            
            expect(result.importInstructions).toContain('Valora');
            expect(result.importInstructions).toContain('0xprivatekey123');
        });
    });
});