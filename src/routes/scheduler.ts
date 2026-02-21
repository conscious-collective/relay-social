import { Hono } from 'hono';

export const schedulerRouter = new Hono();

// Cron trigger - runs every minute via wrangler.toml
// Cloudflare automatically calls this endpoint
schedulerRouter.post('/scheduler', async (c) => {
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
    return c.json({ processed: 0, message: 'No posts to publish' });
  }

  const results = [];
  
  for (const post of posts) {
    try {
      // Update status to publishing
      await db.prepare('UPDATE posts SET status = ?, updated_at = ? WHERE id = ?')
        .bind('publishing', now, post.id);

      // Publish to Instagram
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
          throw new Error(media.error?.message || 'Failed to publish');
        }
      } else {
        throw new Error(media.error?.message || 'Failed to create media');
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
