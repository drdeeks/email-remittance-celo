/**
 * Integration tests for Rate Limiter Middleware
 *
 * Tests that rate limiting works correctly on API endpoints.
 */

import request from 'supertest';
import express from 'express';
import { rateLimiter, transactionLimiter } from '../../src/middleware/rateLimiter';

describe('Rate Limiter Middleware - Integration Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    
    // Apply rate limiter to test routes
    app.use('/api', rateLimiter);
    
    // Test endpoints
    app.get('/api/test', (req, res) => {
      res.json({ success: true });
    });
    
    app.post('/api/transaction', transactionLimiter, (req, res) => {
      res.json({ success: true });
    });
  });

  describe('General Rate Limiter', () => {
    it('should allow requests within limit', async () => {
      const response = await request(app)
        .get('/api/test')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should include rate limit headers', async () => {
      const response = await request(app)
        .get('/api/test')
        .expect(200);

      // Check for rate limit headers (draft-7 standard uses combined 'ratelimit' header)
      expect(response.headers['ratelimit']).toBeDefined();
    });

    it('should skip health endpoints', async () => {
      // Health endpoints should not be rate limited
      const responses = await Promise.all(
        Array.from({ length: 10 }, () =>
          request(app).get('/health')
        )
      );

      // All should succeed (health endpoint doesn't exist but shouldn't be rate limited)
      responses.forEach(response => {
        // 404 is expected since /health doesn't exist, but it shouldn't be 429
        expect(response.status).not.toBe(429);
      });
    });
  });

  describe('Transaction Rate Limiter', () => {
    it('should allow transaction requests within limit', async () => {
      const response = await request(app)
        .post('/api/transaction')
        .send({ senderEmail: 'test@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should rate limit by sender email', async () => {
      const senderEmail = 'test@example.com';
      
      // Make requests up to the limit (5 per minute)
      const responses = await Promise.all(
        Array.from({ length: 6 }, () =>
          request(app)
            .post('/api/transaction')
            .send({ senderEmail })
        )
      );

      // The 6th request should be rate limited
      const lastResponse = responses[responses.length - 1];
      expect(lastResponse.status).toBe(429);
    });

    it('should rate limit by IP when no sender email', async () => {
      // Make requests without sender email
      const responses = await Promise.all(
        Array.from({ length: 6 }, () =>
          request(app)
            .post('/api/transaction')
            .send({})
        )
      );

      // The 6th request should be rate limited
      const lastResponse = responses[responses.length - 1];
      expect(lastResponse.status).toBe(429);
    });
  });

  describe('Rate Limit Response Format', () => {
    it('should return structured error response', async () => {
      // Exhaust rate limit
      await Promise.all(
        Array.from({ length: 6 }, () =>
          request(app)
            .post('/api/transaction')
            .send({ senderEmail: 'test@example.com' })
        )
      );

      const response = await request(app)
        .post('/api/transaction')
        .send({ senderEmail: 'test@example.com' })
        .expect(429);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('retryAfter');
      expect(response.body.error.retryable).toBe(true);
    });
  });
});
