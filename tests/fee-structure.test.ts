// Fee Structure Validation Tests
// These tests verify the correct implementation of:
// - 1.5% protocol fee (applied immediately on send)
// - 1.5% storage fee (applied only on expired returns)
// - 7-day expiration window
// - Zero platform gas costs

import feeService from '../src/services/feeService';
import remittanceService from '../src/services/remittanceService';
import db from '../src/db/database';

describe('Fee Structure Validation', () => {
    beforeAll(async () => {
        // Set up test database
        await db.run('CREATE TABLE IF NOT EXISTS remittances (' +
            'id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
            'sender_email TEXT, ' +
            'recipient_email TEXT, ' +
            'amount_celo REAL, ' +
            'chain TEXT, ' +
            'expires_at INTEGER, ' +
            'escrow_address TEXT, ' +
            'escrow_private_key TEXT, ' +
            'protocol_fee REAL, ' +
            'storage_fee REAL DEFAULT 0, ' +
            'returned_to_sender INTEGER DEFAULT 0, ' +
            'status TEXT' +
        ');');
    });
    
    afterAll(async () => {
        // Clean up
        await db.run('DROP TABLE IF EXISTS remittances');
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
        
        // Mock the database insert to capture expires_at
        const originalRun = db.run;
        db.run = jest.fn().mockImplementation((sql, params) => {
            if (sql.includes('INSERT INTO remittances')) {
                const expiresAt = params[4]; // expires_at position
                const sevenDaysInSeconds = 7 * 24 * 60 * 60;
                expect(expiresAt).toBeGreaterThan(now + sevenDaysInSeconds - 10);
                expect(expiresAt).toBeLessThan(now + sevenDaysInSeconds + 10);
            }
            return { lastID: 1 };
        });
        
        await remittanceService.createRemittance(testRemittance);
        db.run = originalRun;
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
        
        // Verify storage fee was applied
        const remittance = await db.get('SELECT * FROM remittances WHERE id = ?', [result.remittanceId]);
        expect(parseFloat(remittance.storage_fee)).toBe(1.5);
        expect(remittance.returned_to_sender).toBe(1);
        expect(remittance.status).toBe('returned');
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