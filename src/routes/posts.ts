import { Hono } from 'hono';
import { verifyToken, generateId } from '../utils/auth';

export const postsRouter = new Hono();

// List posts
postsRouter.get('/', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const payload = await verifyToken(token, c.env.JWT_SECRET);
    const db = c.env.DB;
    
    const userPosts = await db.prepare(
      'SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC LIMIT 50'
    ).bind(payload.userId).all<any>();

    return c.json({ posts: userPosts, count: userPosts.length });
  } catch {
    return c.json({ error: 'Invalid token' }, 401);
  }
});

// Create post
postsRouter.post('/', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const payload = await verifyToken(token, c.env.JWT_SECRET);
    const { account_id, content, media_urls, scheduled_at, metadata } = await c.req.json();
    
    if (!account_id || !content) {
      return c.json({ error: 'account_id and content are required' }, 400);
    }

    const db = c.env.DB;
    const postId = generateId('post_');
    const status = scheduled_at ? 'scheduled' : 'draft';
    const scheduledAt = scheduled_at ? new Date(scheduled_at).getTime() : null;

    await db.prepare(`
      INSERT INTO posts (id, user_id, account_id, content, media_urls, status, scheduled_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(postId, payload.userId, account_id, content, JSON.stringify(media_urls || []), status, scheduledAt, Date.now(), Date.now());

    // If scheduled, add to queue for processing
    if (scheduledAt && c.env.SCHEDULER_QUEUE) {
      await c.env.SCHEDULER_QUEUE.send({
        type: 'publish_post',
        postId,
        scheduledAt,
      });
    }

    return c.json({ id: postId, status, scheduledAt }, 201);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// Update post
postsRouter.put('/:id', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const payload = await verifyToken(token, c.env.JWT_SECRET);
    const postId = c.req.param('id');
    const { status, scheduled_at, content, media_urls } = await c.req.json();
    
    const db = c.env.DB;
    
    // Build update query dynamically
    const updates: string[] = ['updated_at = ?'];
    const values: any[] = [Date.now()];

    if (status) {
      updates.push('status = ?');
      values.push(status);
    }
    if (scheduled_at !== undefined) {
      updates.push('scheduled_at = ?');
      values.push(scheduled_at ? new Date(scheduled_at).getTime() : null);
      
      // If scheduling, add to queue
      if (scheduled_at && c.env.SCHEDULER_QUEUE) {
        await c.env.SCHEDULER_QUEUE.send({
          type: 'publish_post',
          postId,
          scheduledAt: new Date(scheduled_at).getTime(),
        });
      }
    }
    if (content) {
      updates.push('content = ?');
      values.push(content);
    }
    if (media_urls) {
      updates.push('media_urls = ?');
      values.push(JSON.stringify(media_urls));
    }

    values.push(postId, payload.userId);

    await db.prepare(`UPDATE posts SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).bind(...values);

    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// Publish instantly
postsRouter.post('/:id/publish', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const payload = await verifyToken(token, c.env.JWT_SECRET);
    const postId = c.req.param('id');
    
    const db = c.env.DB;
    
    // Get post
    const post = await db.prepare('SELECT * FROM posts WHERE id = ? AND user_id = ?').bind(postId, payload.userId).first<any>();
    if (!post) {
      return c.json({ error: 'Post not found' }, 404);
    }

    // Get account
    const account = await db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?').bind(post.account_id, payload.userId).first<any>();
    if (!account) {
      return c.json({ error: 'Account not found' }, 404);
    }

    // Update status to publishing
    await db.prepare('UPDATE posts SET status = ?, updated_at = ? WHERE id = ?').bind('publishing', Date.now(), postId);

    try {
      // Publish to Instagram
      const result = await publishToInstagram(account, post, c.env);
      
      if (result.success) {
        await db.prepare('UPDATE posts SET status = ?, platform_post_id = ?, published_at = ?, updated_at = ? WHERE id = ?')
          .bind('published', result.postId, Date.now(), Date.now(), postId);
        
        return c.json({ success: true, postId, status: 'published' });
      } else {
        await db.prepare('UPDATE posts SET status = ?, error_message = ?, updated_at = ? WHERE id = ?')
          .bind('failed', result.error, Date.now(), postId);
        
        return c.json({ success: false, error: result.error }, 400);
      }
    } catch (e: any) {
      await db.prepare('UPDATE posts SET status = ?, error_message = ?, updated_at = ? WHERE id = ?')
        .bind('failed', e.message, Date.now(), postId);
      
      return c.json({ success: false, error: e.message }, 500);
    }
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// Delete post
postsRouter.delete('/:id', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const payload = await verifyToken(token, c.env.JWT_SECRET);
    const postId = c.req.param('id');
    
    const db = c.env.DB;
    await db.prepare('DELETE FROM posts WHERE id = ? AND user_id = ?').bind(postId, payload.userId);

    return c.json({ success: true });
  } catch {
    return c.json({ error: 'Invalid token' }, 401);
  }
});

// Publish helper
async function publishToInstagram(account: any, post: any, env: any): Promise<{ success: boolean; postId?: string; error?: string }> {
  const { access_token, platform_id } = account;
  const { content, media_urls } = post;

  try {
    // Create media container
    const containerRes = await fetch(`https://graph.facebook.com/v21.0/${platform_id}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token,
        image_url: media_urls?.[0] || 'https://via.placeholder.com/1080x1080',
        caption: content,
      }),
    });

    const container = await containerRes.json();

    if (container.id) {
      // Publish
      const publishRes = await fetch(`https://graph.facebook.com/v21.0/${platform_id}/media_publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token,
          creation_id: container.id,
        }),
      });

      const publish = await publishRes.json();
      
      if (publish.id) {
        return { success: true, postId: publish.id };
      }
    }

    return { success: false, error: container.error?.message || 'Failed to publish' };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
