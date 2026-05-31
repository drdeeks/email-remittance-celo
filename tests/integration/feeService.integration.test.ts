import { feeService } from '../../src/services/feeService';

describe('FeeService Integration Tests', () => {
    describe('getFeeQuote', () => {
        it('should calculate correct 1.5% protocol fee for standard remittance', async () => {
            const quote = await feeService.getFeeQuote(100, 'celo', 'standard');
            
            expect(parseFloat(quote.feeAmount)).toBeCloseTo(1.5);
            expect(parseFloat(quote.sendAmount)).toBeCloseTo(101.5);
            expect(parseFloat(quote.recipientAmount)).toBeCloseTo(100);
            expect(quote.feeModel).toBe('protocol');
            expect(quote.escrowAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
        });
        
        it('should calculate correct 1.5% protocol fee for business remittance', async () => {
            const quote = await feeService.getFeeQuote(100, 'celo', 'business');
            
            expect(parseFloat(quote.feeAmount)).toBeCloseTo(1.5);
            expect(parseFloat(quote.sendAmount)).toBeCloseTo(101.5);
            expect(parseFloat(quote.recipientAmount)).toBeCloseTo(100);
        });
        
        it('should calculate correct 1.5% protocol fee for gift card remittance', async () => {
            const quote = await feeService.getFeeQuote(100, 'celo', 'gift_card');
            
            expect(parseFloat(quote.feeAmount)).toBeCloseTo(1.5);
            expect(parseFloat(quote.sendAmount)).toBeCloseTo(101.5);
            expect(parseFloat(quote.recipientAmount)).toBeCloseTo(100);
        });
        
        it('should calculate correct storage fee for expired remittances', async () => {
            const storageFee = await feeService.calculateStorageFee(100);
            expect(parseFloat(storageFee)).toBeCloseTo(1.5);
        });
    });
    
    describe('getFeeModelDescription', () => {
        it('should return correct fee model description', () => {
            const description = feeService.getFeeModelDescription('protocol', 'celo');
            
            expect(description.title).toContain('1.5% Protocol Fee');
            expect(description.description).toContain('1.5% fee on all transfers');
            expect(description.cost).toContain('sender pays deposit gas');
        });
    });
});