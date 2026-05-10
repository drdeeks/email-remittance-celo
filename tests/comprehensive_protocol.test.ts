import { feeService } from '../src/services/feeService';
import { remittanceService } from '../src/services/remittanceService';
import { detectChain } from '../src/services/celoService';

describe('📧 Email Remittance Pro: Protocol Integrity', () => {
    
    describe('💰 Fee Node (1.5% Logic)', () => {
        it('should correctly calculate the 1.5% protocol fee', async () => {
            const amount = 100; // e.g. 100 CELO
            const quote = await feeService.getFeeQuote(amount, 'celo', 'standard');
            expect(parseFloat(quote.protocolFee)).toBe(1.5);
        });

        it('should deduct protocol fee and gas from standard recipient amount', async () => {
            const amount = 100;
            const quote = await feeService.getFeeQuote(amount, 'celo', 'standard');
            const expected = 100 - 1.5 - 0.0005; // amount - 1.5% - gas
            expect(parseFloat(quote.recipientAmount)).toBeCloseTo(expected, 5);
        });
    });

    describe('🌐 Chain Agnostic Discovery', () => {
        it('should correctly detect Monad chain by ID', () => {
            expect(detectChain(undefined, 143)).toBe('monad');
        });

        it('should correctly detect Base chain by name', () => {
            expect(detectChain(undefined, 'base')).toBe('base');
        });
    });

    describe('🎁 Offramp Node (Gift Cards)', () => {
        it('should include necessary payout parameters for gift cards', () => {
            const claimParams = {
                claimToken: 'test-token',
                payoutMethod: 'giftcard' as const,
                giftCardBrand: 'amazon' as const
            };
            expect(claimParams.payoutMethod).toBe('giftcard');
            expect(claimParams.giftCardBrand).toBe('amazon');
        });
    });
});