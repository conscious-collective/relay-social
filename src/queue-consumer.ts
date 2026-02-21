export interface Env {
  DB: D1Database;
}

export default {
  async queue(batch: MessageBatch, env: Env): Promise<void> {
    const db = env.DB;
    
    for (const message of batch.messages) {
      try {
        const data = message.body as { type: string; postId: string; scheduledAt: number };
        
        if (data.type === 'publish_post') {
          const { postId } = data;
          await processScheduledPost(db, postId);
        }
        
        message.ack();
      } catch (e) {
        console.error('Queue processing error:', e);
        message.retry();
      }
    }
  }
};

async function processScheduledPost(db: D1Database, postId: string) {
  const now = Date.now();
  
  // Get post with account info
  const post = await db.prepare(`
    SELECT p.*, a.access_token as account_access_token, a.platform_id 
    FROM posts p 
    JOIN accounts a ON p.account_id = a.id 
    WHERE p.id = ?
  `).bind(postId).first<any>();

  if (!post || post.status !== 'scheduled') {
    console.log(`Post ${postId} not found or not scheduled`);
    return;
  }

  // Update status to publishing
  await db.prepare('UPDATE posts SET status = ?, updated_at = ? WHERE id = ?')
    .bind('publishing', now, postId);

  try {
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
        `).bind('published', published.id, now, now, postId);
        console.log(`Post ${postId} published successfully`);
      } else {
        throw new Error(media.error?.message || 'Failed to publish');
      }
    } else {
      throw new Error(media.error?.message || 'Failed to create media');
    }
  } catch (e: any) {
    await db.prepare(`
      UPDATE posts SET status = ?, error_message = ?, updated_at = ? WHERE id = ?
    `).bind('failed', e.message, now, postId);
    console.error(`Post ${postId} failed:`, e.message);
  }
}
