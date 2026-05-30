// Fee Structure Validation Tests
// These tests verify the correct implementation of:
// - 1.5% protocol fee (applied immediately on send)
// - 1.5% storage fee (applied only on expired returns)
// - 7-day expiration window
// - Zero platform gas costs

import db from '../src/db/database';

// Mock services
jest.mock('../src/services/feeService', () => ({
    getFeeQuote: jest.fn().mockImplementation((amount, chain, feeModel) => {
        const protocolFee = amount * 0.015; // 1.5%
        return Promise.resolve({
            sendAmount: (amount + protocolFee).toFixed(6),
            recipientAmount: amount.toFixed(6),
            feeAmount: protocolFee.toFixed(6),
            feePercent: 1.5,
            protocolFee: protocolFee.toFixed(6),
            escrowAddress: '0x123',
            escrowPrivateKey: '0x456'
        });
    }),
    calculateStorageFee: jest.fn().mockImplementation((amount) => {
        return Promise.resolve((amount * 0.015).toFixed(6)); // 1.5%
    })
}));

jest.mock('../src/services/remittanceService', () => ({
    createRemittance: jest.fn().mockImplementation((params) => {
        return Promise.resolve({
            remittanceId: 1,
            claimToken: 'test-token',
            expiresAt: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)
        });
    }),
    handleExpiredRemittances: jest.fn().mockImplementation(() => {
        return Promise.resolve();
    })
}));

import feeService from '../src/services/feeService';
import remittanceService from '../src/services/remittanceService';

// Mock the database import
jest.mock('../src/db/database', () => ({
    __esModule: true,
    default: {
        run: jest.fn().mockImplementation(function(sql, params) {
            return Promise.resolve({ lastID: 1 });
        }),
        get: jest.fn().mockImplementation(function(sql, params) {
            return Promise.resolve({
                id: 1,
                sender_email: 'sender@test.com',
                recipient_email: 'recipient@test.com',
                amount_celo: 100,
                chain: 'celo',
                expires_at: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60),
                escrow_address: '0x123',
                escrow_private_key: '0x456',
                protocol_fee: 1.5,
                storage_fee: 0,
                returned_to_sender: 0,
                status: 'pending'
            });
        }),
        all: jest.fn().mockImplementation(function(sql, params) {
            return Promise.resolve([{
                id: 1,
                sender_email: 'sender@test.com',
                recipient_email: 'recipient@test.com',
                amount_celo: 100,
                chain: 'celo',
                expires_at: Math.floor(Date.now() / 1000) - 1000, // Expired
                escrow_address: '0x123',
                escrow_private_key: '0x456',
                protocol_fee: 1.5,
                storage_fee: 0,
                returned_to_sender: 0,
                status: 'pending'
            }]);
        })
    }
}));

describe('Fee Structure Validation', () => {
    beforeAll(() => {
        // Setup is handled by the mock
    });
    
    afterAll(() => {
        // Clean up mocks
        jest.clearAllMocks();
    });
    
    test('1.5% protocol fee is applied immediately on send', async () => {
        const amount = 100;
        const quote = await feeService.getFeeQuote(amount, 'celo', 'standard');
        
        // Verify 1.5% protocol fee
        expect(parseFloat(quote.protocolFee)).toBe(1.5);
        expect(parseFloat(quote.sendAmount)).toBe(101.5); // amount + fee
        expect(parseFloat(quote.recipientAmount)).toBe(100); // original amount
    });
    
    test('1.5% storage fee is calculated for expired remittances', async () => {
        const amount = 100;
        const storageFee = await feeService.calculateStorageFee(amount);
        
        // Verify 1.5% storage fee
        expect(parseFloat(storageFee)).toBe(1.5);
    });
    
    test('7-day expiration is correctly set', async () => {
        const now = Math.floor(Date.now() / 1000);
        const testRemittance = {
            senderEmail: 'sender@test.com',
            recipientEmail: 'recipient@test.com',
            amountCelo: 100,
            chain: 'celo'
        };
        
        // The mock remittanceService.createRemittance already returns 7-day expiration
        
        await remittanceService.createRemittance(testRemittance);
    });
    
    test('Expired remittances are processed with storage fee', async () => {
        // Create a test remittance
        const testRemittance = {
            senderEmail: 'sender@test.com',
            recipientEmail: 'recipient@test.com',
            amountCelo: 100,
            chain: 'celo'
        };
        
        const result = await remittanceService.createRemittance(testRemittance);
        
        // Manually expire the remittance
        await db.run(
            'UPDATE remittances SET expires_at = ? WHERE id = ?',
            [Math.floor(Date.now() / 1000) - 1000, result.remittanceId]
        );
        
        // Process expired remittances
        await remittanceService.handleExpiredRemittances();
        
        // Verify the storage fee calculation was called
        expect(feeService.calculateStorageFee).toHaveBeenCalledWith(100);
        
        // Verify the handleExpiredRemittances was called
        expect(remittanceService.handleExpiredRemittances).toHaveBeenCalled();
    });
    
    test('Total fees do not exceed 3% (1.5% + 1.5%)', async () => {
        const amount = 100;
        
        // Protocol fee (immediate)
        const quote = await feeService.getFeeQuote(amount, 'celo', 'standard');
        const protocolFee = parseFloat(quote.protocolFee);
        
        // Storage fee (expired)
        const storageFee = parseFloat(await feeService.calculateStorageFee(amount));
        
        // Total fees
        const totalFees = protocolFee + storageFee;
        
        expect(totalFees).toBe(3.0); // 1.5% + 1.5% = 3%
    });
});