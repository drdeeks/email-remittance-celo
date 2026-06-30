import { hashClaimSecret, verifyClaimSecret, generateClaimToken, generateClaimSecret } from '../../src/services/remittanceService';

describe('Security Fixes - Unit Tests', () => {
  describe('Claim Secret Hashing (SHA-256)', () => {
    it('should hash claim secret using real SHA-256', () => {
      const secret = 'test-secret-1234567890123456';
      const hash = hashClaimSecret(secret);

      // SHA-256 produces 64 hex characters
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should produce consistent hashes for same input', () => {
      const secret = 'consistent-hash-test';
      const hash1 = hashClaimSecret(secret);
      const hash2 = hashClaimSecret(secret);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = hashClaimSecret('secret-one');
      const hash2 = hashClaimSecret('secret-two');

      expect(hash1).not.toBe(hash2);
    });

    it('should not return the original secret in the hash', () => {
      const secret = 'my-secret-value';
      const hash = hashClaimSecret(secret);

      expect(hash).not.toContain(secret);
    });

    it('should verify claim secret against stored hash', () => {
      const secret = 'verify-this-secret';
      const hash = hashClaimSecret(secret);

      expect(verifyClaimSecret(secret, hash)).toBe(true);
    });

    it('should reject incorrect claim secret', () => {
      const secret = 'correct-secret';
      const wrongSecret = 'wrong-secret';
      const hash = hashClaimSecret(secret);

      expect(verifyClaimSecret(wrongSecret, hash)).toBe(false);
    });

    it('should handle empty string input', () => {
      const hash = hashClaimSecret('');

      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should handle long string input', () => {
      const longSecret = 'a'.repeat(10000);
      const hash = hashClaimSecret(longSecret);

      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('Claim Token Generation', () => {
    it('should generate unique claim tokens', () => {
      const token1 = generateClaimToken();
      const token2 = generateClaimToken();

      expect(token1).not.toBe(token2);
    });

    it('should generate UUID v4 format', () => {
      const token = generateClaimToken();
      const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

      expect(token).toMatch(uuidV4Regex);
    });
  });

  describe('Claim Secret Generation', () => {
    it('should generate claim secrets of correct length', () => {
      const secret = generateClaimSecret();

      expect(secret).toHaveLength(32);
    });

    it('should generate unique claim secrets', () => {
      const secret1 = generateClaimSecret();
      const secret2 = generateClaimSecret();

      expect(secret1).not.toBe(secret2);
    });

    it('should only contain hexadecimal characters', () => {
      const secret = generateClaimSecret();

      expect(secret).toMatch(/^[a-f0-9]{32}$/);
    });
  });
});
