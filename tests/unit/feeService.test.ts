import { feeService } from '../../src/services/feeService';

describe('FeeService', () => {
    describe('getFeeQuote', () => {
        it('should calculate 1.5% protocol fee for standard remittance', async () => {
            const quote = await feeService.getFeeQuote(100, 'celo', 'standard');
            
            expect(parseFloat(quote.feeAmount)).toBeCloseTo(1.5);
            expect(parseFloat(quote.sendAmount)).toBeCloseTo(101.5);
            expect(parseFloat(quote.recipientAmount)).toBeCloseTo(100);
        });
        
        it('should calculate 1.5% protocol fee for business remittance', async () => {
            const quote = await feeService.getFeeQuote(100, 'celo', 'business');
            
            expect(parseFloat(quote.feeAmount)).toBeCloseTo(1.5);
            expect(parseFloat(quote.sendAmount)).toBeCloseTo(101.5);
            expect(parseFloat(quote.recipientAmount)).toBeCloseTo(100);
        });
        
        it('should calculate 1.5% protocol fee for gift card remittance', async () => {
            const quote = await feeService.getFeeQuote(100, 'celo', 'gift_card');
            
            expect(parseFloat(quote.feeAmount)).toBeCloseTo(1.5);
            expect(parseFloat(quote.sendAmount)).toBeCloseTo(101.5);
        });
        
        it('should return negative values for negative amount', async () => {
            const quote = await feeService.getFeeQuote(-100, 'celo', 'standard');
            
            expect(parseFloat(quote.feeAmount)).toBeLessThan(0);
            expect(parseFloat(quote.sendAmount)).toBeLessThan(0);
        });
    });
    
    describe('calculateStorageFee', () => {
        it('should calculate 1.5% storage fee for expired remittance', async () => {
            const storageFee = await feeService.calculateStorageFee(100);
            
            expect(parseFloat(storageFee)).toBeCloseTo(1.5);
        });
        
        it('should return 0 for zero amount', async () => {
            const storageFee = await feeService.calculateStorageFee(0);
            
            expect(parseFloat(storageFee)).toBe(0);
        });
    });
    
    describe('getFeeModelDescription', () => {
        it('should return fee model description', () => {
            const description = feeService.getFeeModelDescription('protocol', 'celo');
            
            expect(description.title).toContain('1.5% Protocol Fee');
            expect(description.description).toContain('1.5% fee on all transfers');
        });
    });
});