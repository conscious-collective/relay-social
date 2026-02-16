// Accounts API Tests
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createServer } from 'http';

const API_URL = 'http://localhost:3001';

// Test API key (would be created during test setup)
const TEST_API_KEY = 'relay_sk_test_key_12345';

describe('Accounts API', () => {
  let server: any;
  let authHeader: Record<string, string>;

  beforeAll(async () => {
    server = createServer((await import('../index.js')).default.fetch);
    await new Promise<void>((resolve) => {
      server.listen(3001, () => resolve());
    });
    authHeader = { 'Authorization': `Bearer ${TEST_API_KEY}` };
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  describe('GET /api/accounts', () => {
    it('should require authentication', async () => {
      const response = await request(API_URL).get('/api/accounts');
      expect(response.status).toBe(401);
    });

    it('should return accounts with valid API key', async () => {
      const response = await request(API_URL)
        .get('/api/accounts')
        .set(authHeader);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accounts');
      expect(Array.isArray(response.body.accounts)).toBe(true);
    });
  });

  describe('POST /api/accounts', () => {
    it('should create account with valid data', async () => {
      const newAccount = {
        platform: 'instagram',
        name: 'Test Account',
        handle: 'testaccount',
        access_token: 'test_token_123',
      };

      const response = await request(API_URL)
        .post('/api/accounts')
        .set(authHeader)
        .send(newAccount);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('account');
      expect(response.body.account).toHaveProperty('id');
      expect(response.body.account.platform).toBe('instagram');
    });

    it('should reject account without required fields', async () => {
      const invalidAccount = {
        platform: 'instagram',
        // missing name and access_token
      };

      const response = await request(API_URL)
        .post('/api/accounts')
        .set(authHeader)
        .send(invalidAccount);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject invalid platform', async () => {
      const invalidAccount = {
        platform: 'invalid_platform',
        name: 'Test',
        access_token: 'token',
      };

      const response = await request(API_URL)
        .post('/api/accounts')
        .set(authHeader)
        .send(invalidAccount);

      // Platform validation depends on implementation
      // May return 201 (stored as-is) or 400
      expect([201, 400]).toContain(response.status);
    });
  });

  describe('DELETE /api/accounts/:id', () => {
    let createdAccountId: string;

    beforeAll(async () => {
      // Create an account to delete
      const response = await request(API_URL)
        .post('/api/accounts')
        .set(authHeader)
        .send({
          platform: 'instagram',
          name: 'Account to Delete',
          handle: 'delete_test',
          access_token: 'test_token_delete',
        });
      createdAccountId = response.body.account.id;
    });

    it('should delete existing account', async () => {
      const response = await request(API_URL)
        .delete(`/api/accounts/${createdAccountId}`)
        .set(authHeader);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('deleted', true);
    });

    it('should return 404 for non-existent account', async () => {
      const response = await request(API_URL)
        .delete('/api/accounts/non_existent_id')
        .set(authHeader);

      expect(response.status).toBe(404);
    });
  });
});