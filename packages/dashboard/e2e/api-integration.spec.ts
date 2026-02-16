// API Integration E2E Tests
import { test, expect } from '@playwright/test';

const API_URL = process.env.API_URL || 'http://localhost:3001';

test.describe('API Health', () => {
  test('API should be running', async ({ request }) => {
    const response = await request.get(API_URL);
    expect(response.ok()).toBeTruthy();
  });

  test('API should return version info', async ({ request }) => {
    const response = await request.get(API_URL);
    const data = await response.json();
    
    expect(data).toHaveProperty('name', 'Relay Social API');
    expect(data).toHaveProperty('version');
  });
});

test.describe('API Documentation', () => {
  test('should list available endpoints', async ({ request }) => {
    const response = await request.get(`${API_URL}/api`);
    const data = await response.json();
    
    expect(data).toHaveProperty('endpoints');
    expect(data.endpoints).toHaveProperty('GET /api/accounts');
  });
});

test.describe('API Authentication', () => {
  test('should reject requests without API key', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/posts`);
    expect(response.status()).toBe(401);
  });

  test('should accept requests with valid API key', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/accounts`, {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_API_KEY || 'relay_sk_test'}`,
      },
    });
    expect(response.status()).toBe(200);
  });
});