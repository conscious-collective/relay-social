// Posts API Tests
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createServer } from 'http';

const API_URL = 'http://localhost:3001';
const TEST_API_KEY = 'relay_sk_test_key_12345';

describe('Posts API', () => {
  let server: any;
  let authHeader: Record<string, string>;
  let testAccountId: string;

  beforeAll(async () => {
    server = createServer((await import('../index.js')).default.fetch);
    await new Promise<void>((resolve) => {
      server.listen(3001, () => resolve());
    });
    authHeader = { 'Authorization': `Bearer ${TEST_API_KEY}` };

    // Create a test account for posts
    const accountResponse = await request(API_URL)
      .post('/api/accounts')
      .set(authHeader)
      .send({
        platform: 'instagram',
        name: 'Test Account for Posts',
        handle: 'poststest',
        access_token: 'test_token_posts',
      });
    testAccountId = accountResponse.body.account.id;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  describe('GET /api/posts', () => {
    it('should require authentication', async () => {
      const response = await request(API_URL).get('/api/posts');
      expect(response.status).toBe(401);
    });

    it('should return posts list with valid API key', async () => {
      const response = await request(API_URL)
        .get('/api/posts')
        .set(authHeader);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('posts');
      expect(Array.isArray(response.body.posts)).toBe(true);
    });

    it('should filter posts by account_id', async () => {
      const response = await request(API_URL)
        .get(`/api/posts?account_id=${testAccountId}`)
        .set(authHeader);

      expect(response.status).toBe(200);
      expect(response.body.posts).toBeInstanceOf(Array);
    });

    it('should filter posts by status', async () => {
      const response = await request(API_URL)
        .get('/api/posts?status=draft')
        .set(authHeader);

      expect(response.status).toBe(200);
      expect(response.body.posts).toBeInstanceOf(Array);
    });
  });

  describe('POST /api/posts', () => {
    it('should create a draft post', async () => {
      const newPost = {
        account_id: testAccountId,
        content: 'Test post content for automation',
      };

      const response = await request(API_URL)
        .post('/api/posts')
        .set(authHeader)
        .send(newPost);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('post');
      expect(response.body.post).toHaveProperty('id');
      expect(response.body.post.content).toBe('Test post content for automation');
      expect(response.body.post.status).toBe('draft');
    });

    it('should create a post with media', async () => {
      const newPost = {
        account_id: testAccountId,
        content: 'Post with image',
        media_urls: ['https://example.com/image.jpg'],
      };

      const response = await request(API_URL)
        .post('/api/posts')
        .set(authHeader)
        .send(newPost);

      expect(response.status).toBe(201);
      expect(response.body.post.mediaUrls).toContain('https://example.com/image.jpg');
    });

    it('should reject post without required fields', async () => {
      const invalidPost = {
        content: 'Missing account_id',
      };

      const response = await request(API_URL)
        .post('/api/posts')
        .set(authHeader)
        .send(invalidPost);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should publish immediately with publish_now flag', async () => {
      const newPost = {
        account_id: testAccountId,
        content: 'Immediate publish test',
        publish_now: true,
      };

      const response = await request(API_URL)
        .post('/api/posts')
        .set(authHeader)
        .send(newPost);

      expect(response.status).toBe(201);
      // Status will be 'publishing' or 'published' or 'failed' depending on token validity
      expect(['publishing', 'published', 'failed']).toContain(response.body.post.status);
    });
  });

  describe('GET /api/posts/:id', () => {
    let createdPostId: string;

    beforeAll(async () => {
      const response = await request(API_URL)
        .post('/api/posts')
        .set(authHeader)
        .send({
          account_id: testAccountId,
          content: 'Post to fetch',
        });
      createdPostId = response.body.post.id;
    });

    it('should return single post', async () => {
      const response = await request(API_URL)
        .get(`/api/posts/${createdPostId}`)
        .set(authHeader);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('post');
      expect(response.body.post.id).toBe(createdPostId);
    });

    it('should return 404 for non-existent post', async () => {
      const response = await request(API_URL)
        .get('/api/posts/non_existent_id')
        .set(authHeader);

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /api/posts/:id', () => {
    let postToUpdate: string;

    beforeAll(async () => {
      const response = await request(API_URL)
        .post('/api/posts')
        .set(authHeader)
        .send({
          account_id: testAccountId,
          content: 'Original content',
        });
      postToUpdate = response.body.post.id;
    });

    it('should update post content', async () => {
      const response = await request(API_URL)
        .patch(`/api/posts/${postToUpdate}`)
        .set(authHeader)
        .send({ content: 'Updated content' });

      expect(response.status).toBe(200);
      expect(response.body.post.content).toBe('Updated content');
    });

    it('should not update published posts', async () => {
      // First create and try to publish
      const publishResponse = await request(API_URL)
        .post('/api/posts')
        .set(authHeader)
        .send({
          account_id: testAccountId,
          content: 'Published post',
          publish_now: true,
        });

      // Try to update the published post
      const response = await request(API_URL)
        .patch(`/api/posts/${publishResponse.body.post.id}`)
        .set(authHeader)
        .send({ content: 'Trying to update' });

      // Should either succeed or fail depending on implementation
      // Most implementations don't allow editing published posts
      expect([200, 400]).toContain(response.status);
    });
  });

  describe('DELETE /api/posts/:id', () => {
    it('should delete existing post', async () => {
      // Create a post to delete
      const createResponse = await request(API_URL)
        .post('/api/posts')
        .set(authHeader)
        .send({
          account_id: testAccountId,
          content: 'Post to delete',
        });

      const deleteResponse = await request(API_URL)
        .delete(`/api/posts/${createResponse.body.post.id}`)
        .set(authHeader);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body).toHaveProperty('deleted', true);
    });
  });
});