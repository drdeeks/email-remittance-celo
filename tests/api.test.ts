import { setupTestEnvironment } from './test-environment';
import request from 'supertest';
import app from '../src/index';

// Setup test environment before imports
setupTestEnvironment();

describe('API Endpoints', () => {
  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
    });
  });
});
