import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import { authRouter } from './routes/auth';
import { accountsRouter } from './routes/accounts';
import { postsRouter } from './routes/posts';
import { webhooksRouter } from './routes/webhooks';
import { billingRouter } from './routes/billing';
import { analyticsRouter } from './routes/analytics';
import { openapiRouter } from './routes/openapi';

export interface Env {
  DB: D1Database;
  SCHEDULER_QUEUE: any;
  JWT_SECRET: string;
  META_APP_ID: string;
  META_APP_SECRET: string;
  DODO_PAYMENTS_API_KEY: string;
  DODO_PRO_PRODUCT_ID: string;
  NEXT_PUBLIC_APP_URL: string;
}

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use('*', cors());
app.use('*', logger());

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Routes
app.route('/api/auth', authRouter);
app.route('/api/accounts', accountsRouter);
app.route('/api/posts', postsRouter);
app.route('/api/webhooks', webhooksRouter);
app.route('/api/billing', billingRouter);
app.route('/api/analytics', analyticsRouter);
app.route('/api/openapi', openapiRouter);

// Reference redirect
app.get('/api/reference', (c) => {
  return c.redirect('/api/openapi');
});

export default app;
