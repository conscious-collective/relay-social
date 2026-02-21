import { Hono } from 'hono';
import { verifyToken, generateId } from '../utils/auth';
import { webhooks, webhookDeliveries } from '../schema';

export const webhooksRouter = new Hono();

// List webhooks
webhooksRouter.get('/', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const payload = await verifyToken(token, c.env.JWT_SECRET);
    const userId = c.req.query('userId');
    
    if (!userId) {
      return c.json({ error: 'userId query parameter is required' }, 400);
    }

    const db = c.env.DB;
    const userWebhooks = await db.prepare(
      'SELECT id, url, events, enabled, created_at FROM webhooks WHERE user_id = ?'
    ).bind(userId).all<any>();

    return c.json({ webhooks: userWebhooks });
  } catch {
    return c.json({ error: 'Invalid token' }, 401);
  }
});

// Create webhook
webhooksRouter.post('/', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const payload = await verifyToken(token, c.env.JWT_SECRET);
    const { url, events, userId } = await c.req.json();
    
    if (!url || !events || !userId) {
      return c.json({ error: 'url, events, and userId are required' }, 400);
    }

    const db = c.env.DB;
    const webhookId = generateId('wh_');
    const secret = crypto.randomUUID();

    await db.prepare(`
      INSERT INTO webhooks (id, user_id, url, events, secret, enabled, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    `).bind(webhookId, userId, url, JSON.stringify(events), secret, Date.now(), Date.now());

    return c.json({ id: webhookId, url, events, secret, enabled: true }, 201);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// Update webhook
webhooksRouter.put('/:id', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const payload = await verifyToken(token, c.env.JWT_SECRET);
    const webhookId = c.req.param('id');
    const { enabled } = await c.req.json();
    
    const db = c.env.DB;
    await db.prepare('UPDATE webhooks SET enabled = ?, updated_at = ? WHERE id = ? AND user_id = ?')
      .bind(enabled ? 1 : 0, Date.now(), webhookId, payload.userId);

    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// Delete webhook
webhooksRouter.delete('/:id', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const payload = await verifyToken(token, c.env.JWT_SECRET);
    const webhookId = c.req.param('id');
    
    const db = c.env.DB;
    await db.prepare('DELETE FROM webhooks WHERE id = ? AND user_id = ?').bind(webhookId, payload.userId);

    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});
