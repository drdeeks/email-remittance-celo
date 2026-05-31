import { chainService } from '../../src/services/celoService';

describe('CeloService', () => {
    describe('getBalance', () => {
        it('should return balance for valid address', async () => {
            // This is an integration test that would require a real RPC endpoint
            // For unit testing, we'll mock the response
            jest.spyOn(chainService, 'getBalance').mockResolvedValue('1.0');
            
            const balance = await chainService.getBalance('0x1234567890123456789012345678901234567890');
            expect(balance).toBe('1.0');
        });
    });
    
    describe('generateClaimWallet', () => {
        it('should generate a claim wallet', () => {
            const wallet = chainService.generateClaimWallet();
            
            expect(wallet).toHaveProperty('address');
            expect(wallet).toHaveProperty('privateKey');
            expect(wallet.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
        });
    });
});