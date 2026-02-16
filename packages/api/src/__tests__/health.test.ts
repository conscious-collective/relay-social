// Health Check API Tests
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createServer } from 'http';

// Import the app (adjust path as needed)
import app from '../index.js';

const API_URL = 'http://localhost:3001';

describe('Health Check API', () => {
  let server: any;

  beforeAll(async () => {
    // Start server for testing
    server = createServer(app.fetch);
    await new Promise<void>((resolve) => {
      server.listen(3001, () => resolve());
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  describe('GET /', () => {
    it('should return API name and version', async () => {
      const response = await request(API_URL).get('/');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('name', 'Relay Social API');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('status', 'ok');
    });
  });

  describe('GET /api', () => {
    it('should return API documentation', async () => {
      const response = await request(API_URL).get('/api');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('endpoints');
      expect(response.body).toHaveProperty('note');
    });

    it('should list all available endpoints', async () => {
      const response = await request(API_URL).get('/api');
      const endpoints = response.body.endpoints;
      
      expect(endpoints).toHaveProperty('GET /api/accounts');
      expect(endpoints).toHaveProperty('POST /api/accounts');
      expect(endpoints).toHaveProperty('GET /api/posts');
      expect(endpoints).toHaveProperty('POST /api/posts');
      expect(endpoints).toHaveProperty('GET /api/media');
    });
  });

  describe('OAuth endpoints', () => {
    it('should return message about OAuth being handled by Dashboard', async () => {
      const response = await request(API_URL).get('/api/oauth/providers');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Unprotected routes', () => {
    it('should allow access to root without auth', async () => {
      const response = await request(API_URL).get('/');
      expect(response.status).toBe(200);
    });

    it('should allow access to /api without auth', async () => {
      const response = await request(API_URL).get('/api');
      expect(response.status).toBe(200);
    });
  });
});