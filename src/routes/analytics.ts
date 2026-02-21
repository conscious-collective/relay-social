import { Hono } from 'hono';
import { verifyToken } from '../utils/auth';

export const analyticsRouter = new Hono();

// Get analytics
analyticsRouter.get('/', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const payload = await verifyToken(token, c.env.JWT_SECRET);
    const db = c.env.DB;
    
    const postsCount = await db.prepare(
      'SELECT COUNT(*) as count FROM posts WHERE user_id = ?'
    ).bind(payload.userId).first<any>();

    const publishedCount = await db.prepare(
      "SELECT COUNT(*) as count FROM posts WHERE user_id = ? AND status = 'published'"
    ).bind(payload.userId).first<any>();

    const scheduledCount = await db.prepare(
      "SELECT COUNT(*) as count FROM posts WHERE user_id = ? AND status = 'scheduled'"
    ).bind(payload.userId).first<any>();

    const accountsCount = await db.prepare(
      'SELECT COUNT(*) as count FROM accounts WHERE user_id = ?'
    ).bind(payload.userId).first<any>();

    return c.json({
      posts: {
        total: postsCount?.count || 0,
        published: publishedCount?.count || 0,
        scheduled: scheduledCount?.count || 0,
      },
      accounts: accountsCount?.count || 0,
    });
  } catch {
    return c.json({ error: 'Invalid token' }, 401);
  }
});
