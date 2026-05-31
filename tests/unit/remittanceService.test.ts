import { remittanceService } from '../../src/services/remittanceService';
import { feeService } from '../../src/services/feeService';
import { chainService } from '../../src/services/celoService';

describe('RemittanceService', () => {
    describe('Core Functionality', () => {
        it('should be defined', () => {
            expect(remittanceService).toBeDefined();
        });
        
        it('should have createRemittance method', () => {
            expect(typeof remittanceService.createRemittance).toBe('function');
        });
        
        it('should have getRemittanceByToken method', () => {
            expect(typeof remittanceService.getRemittanceByToken).toBe('function');
        });
        
        it('should have claimRemittance method', () => {
            expect(typeof remittanceService.claimRemittance).toBe('function');
        });
    });
    
    describe('Service Dependencies', () => {
        it('should use feeService for fee calculations', () => {
            expect(feeService).toBeDefined();
            expect(typeof feeService.getFeeQuote).toBe('function');
        });
        
        it('should use chainService for blockchain operations', () => {
            expect(chainService).toBeDefined();
            expect(typeof chainService.sendNative).toBe('function');
        });
    });
});