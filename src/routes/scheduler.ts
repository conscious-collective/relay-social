import { Hono } from 'hono';

export const schedulerRouter = new Hono();

// This route is called by Cloudflare Cron every minute
// It's registered via wrangler.toml triggers
schedulerRouter.post('/scheduler', async (c) => {
  const db = c.env.DB;
  const now = Date.now();

  // Get scheduled posts that are due
  const posts = await db.prepare(`
    SELECT p.*, a.access_token, a.platform_id 
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
      // Publish to Instagram
      const publishRes = await fetch(`https://graph.facebook.com/v21.0/${post.platform_id}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: post.access_token,
          image_url: post.media_urls ? JSON.parse(post.media_urls)[0] : 'https://via.placeholder.com/1080x1080',
          caption: post.content,
        }),
      });

      const container = await publishRes.json();

      if (container.id) {
        const finalRes = await fetch(`https://graph.facebook.com/v21.0/${post.platform_id}/media_publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            access_token: post.access_token,
            creation_id: container.id,
          }),
        });

        const published = await finalRes.json();

        await db.prepare(`
          UPDATE posts SET status = ?, platform_post_id = ?, published_at = ?, updated_at = ? WHERE id = ?
        `).bind('published', published.id || null, now, now, post.id);

        results.push({ id: post.id, status: 'published' });
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
