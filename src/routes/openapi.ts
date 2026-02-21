import { Hono } from 'hono';

export const openapiRouter = new Hono();

openapiRouter.get('/', (c) => {
  const spec = {
    openapi: '3.1.0',
    info: {
      title: 'Relay Social API',
      version: '1.0.0',
      description: 'Agent-native social media scheduling API',
    },
    servers: [
      { url: 'https://relay-social.yourname.workers.dev', description: 'Production' },
      { url: 'http://localhost:8787', description: 'Development' },
    ],
    paths: {
      '/api/auth/signup': {
        post: {
          summary: 'Sign up',
          tags: ['Auth'],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { email: { type: 'string' }, password: { type: 'string' } },
                  required: ['email', 'password'],
                },
              },
            },
          },
          responses: {
            '201': { description: 'User created' },
            '400': { description: 'Error' },
          },
        },
      },
      '/api/auth/login': {
        post: {
          summary: 'Login',
          tags: ['Auth'],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { email: { type: 'string' }, password: { type: 'string' } },
                  required: ['email', 'password'],
                },
              },
            },
          },
          responses: {
            '200': { description: 'Login successful' },
            '401': { description: 'Invalid credentials' },
          },
        },
      },
      '/api/accounts': {
        get: {
          summary: 'List accounts',
          tags: ['Accounts'],
          security: [{ BearerAuth: [] }],
          responses: {
            '200': { description: 'Accounts list' },
          },
        },
      },
      '/api/accounts/connect/instagram': {
        post: {
          summary: 'Connect Instagram',
          tags: ['Accounts'],
          security: [{ BearerAuth: [] }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    access_token: { type: 'string' },
                    instagram_username: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '201': { description: 'Account connected' },
          },
        },
      },
      '/api/posts': {
        get: {
          summary: 'List posts',
          tags: ['Posts'],
          security: [{ BearerAuth: [] }],
          responses: { '200': { description: 'Posts list' } },
        },
        post: {
          summary: 'Create post',
          tags: ['Posts'],
          security: [{ BearerAuth: [] }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    account_id: { type: 'string' },
                    content: { type: 'string' },
                    media_urls: { type: 'array', items: { type: 'string' } },
                  },
                  required: ['account_id', 'content'],
                },
              },
            },
          },
          responses: { '201': { description: 'Post created' } },
        },
      },
      '/api/posts/{id}/publish': {
        post: {
          summary: 'Publish instantly',
          tags: ['Posts'],
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: {
            '200': { description: 'Published' },
            '400': { description: 'Failed' },
          },
        },
      },
      '/api/webhooks': {
        get: {
          summary: 'List webhooks',
          tags: ['Webhooks'],
          security: [{ BearerAuth: [] }],
          responses: { '200': { description: 'Webhooks list' } },
        },
        post: {
          summary: 'Create webhook',
          tags: ['Webhooks'],
          security: [{ BearerAuth: [] }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    url: { type: 'string' },
                    events: { type: 'array', items: { type: 'string' } },
                    userId: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { '201': { description: 'Webhook created' } },
        },
      },
      '/api/billing/plans': {
        get: {
          summary: 'Get plans',
          tags: ['Billing'],
          responses: { '200': { description: 'Plans list' } },
        },
      },
    },
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
        },
      },
    },
  };

  return c.json(spec);
});
