import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { cookie } from 'hono/cookie';

import { authRouter } from './routes/auth';
import { accountsRouter } from './routes/accounts';
import { postsRouter } from './routes/posts';
import { webhooksRouter } from './routes/webhooks';
import { billingRouter } from './routes/billing';
import { analyticsRouter } from './routes/analytics';
import { openapiRouter } from './routes/openapi';
import { schedulerRouter } from './routes/scheduler';
import { oauthRouter } from './routes/oauth';

export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  META_APP_ID: string;
  META_APP_SECRET: string;
  DODO_PAYMENTS_API_KEY: string;
  DODO_PRO_PRODUCT_ID: string;
  NEXT_PUBLIC_APP_URL: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
}

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use('*', cors());
app.use('*', logger());
app.use('*', cookie());

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Routes
app.route('/api/auth', authRouter);
app.route('/api/oauth', oauthRouter);
app.route('/api/accounts', accountsRouter);
app.route('/api/posts', postsRouter);
app.route('/api/webhooks', webhooksRouter);
app.route('/api/billing', billingRouter);
app.route('/api/analytics', analyticsRouter);
app.route('/api/openapi', openapiRouter);

// Scheduler - called by Cloudflare Cron every minute
app.post('/api/cron/scheduler', async (c) => {
  const db = c.env.DB;
  const now = Date.now();

  // Get scheduled posts that are due
  const posts = await db.prepare(`
    SELECT p.*, a.access_token as account_access_token, a.platform_id 
    FROM posts p 
    JOIN accounts a ON p.account_id = a.id 
    WHERE p.status = 'scheduled' 
    AND p.scheduled_at <= ?
  `).bind(now).all<any>();

  if (posts.length === 0) {
    return c.json({ processed: 0 });
  }

  const results = [];
  
  for (const post of posts) {
    try {
      await db.prepare('UPDATE posts SET status = ?, updated_at = ? WHERE id = ?')
        .bind('publishing', now, post.id);

      const mediaRes = await fetch(`https://graph.facebook.com/v21.0/${post.platform_id}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: post.account_access_token,
          image_url: post.media_urls ? JSON.parse(post.media_urls)[0] : 'https://via.placeholder.com/1080x1080',
          caption: post.content,
        }),
      });

      const media = await mediaRes.json();

      if (media.id) {
        const publishRes = await fetch(`https://graph.facebook.com/v21.0/${post.platform_id}/media_publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            access_token: post.account_access_token,
            creation_id: media.id,
          }),
        });

        const published = await publishRes.json();

        if (published.id) {
          await db.prepare(`
            UPDATE posts SET status = ?, platform_post_id = ?, published_at = ?, updated_at = ? WHERE id = ?
          `).bind('published', published.id, now, now, post.id);

          results.push({ id: post.id, status: 'published' });
        } else {
          throw new Error(media.error?.message || 'Failed');
        }
      } else {
        throw new Error(media.error?.message || 'Failed');
      }
    } catch (e: any) {
      await db.prepare(`
        UPDATE posts SET status = ?, error_message = ?, updated_at = ? WHERE id = ?
      `).bind('failed', e.message, now, post.id);

      results.push({ id: post.id, status: 'failed', error: e.message });
    }
  }

  return c.json({ processed: posts.length, results });
});

// Reference redirect
app.get('/api/reference', (c) => {
  return c.redirect('/api/openapi');
});

export default app;
