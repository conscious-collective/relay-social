import { Hono } from "hono";
import { eq, desc, and, or, like } from "drizzle-orm";
import { db } from "../db/index.js";
import { posts, accounts } from "../db/schema.js";
import { nanoid } from "nanoid";
// import { SchedulerService } from "../services/scheduler.js"; // Temporarily disabled
import { PublisherService } from "../services/publisher.js";

const app = new Hono();
// const scheduler = new SchedulerService(); // Temporarily disabled
const publisher = new PublisherService();

// List posts with filtering
app.get("/", async (c) => {
  const accountId = c.req.query("account_id");
  const status = c.req.query("status");
  const limit = Math.min(parseInt(c.req.query("limit") || "50"), 100);
  const offset = parseInt(c.req.query("offset") || "0");

  let query = db
    .select({
      id: posts.id,
      accountId: posts.accountId,
      content: posts.content,
      mediaUrls: posts.mediaUrls,
      platformPostId: posts.platformPostId,
      status: posts.status,
      scheduledAt: posts.scheduledAt,
      publishedAt: posts.publishedAt,
      errorMessage: posts.errorMessage,
      createdAt: posts.createdAt,
      updatedAt: posts.updatedAt,
      account: {
        name: accounts.name,
        handle: accounts.handle,
        platform: accounts.platform,
      },
    })
    .from(posts)
    .innerJoin(accounts, eq(posts.accountId, accounts.id))
    .orderBy(desc(posts.createdAt))
    .limit(limit)
    .offset(offset);

  // Apply filters
  const filters = [];
  if (accountId) {
    filters.push(eq(posts.accountId, accountId));
  }
  if (status) {
    filters.push(eq(posts.status, status));
  }

  if (filters.length > 0) {
    query = query.where(and(...filters));
  }

  const results = await query;

  return c.json({
    posts: results,
    pagination: {
      limit,
      offset,
      hasMore: results.length === limit,
    },
  });
});

// Get single post
app.get("/:id", async (c) => {
  const id = c.req.param("id");

  const [result] = await db
    .select({
      id: posts.id,
      accountId: posts.accountId,
      content: posts.content,
      mediaUrls: posts.mediaUrls,
      platformPostId: posts.platformPostId,
      status: posts.status,
      scheduledAt: posts.scheduledAt,
      publishedAt: posts.publishedAt,
      errorMessage: posts.errorMessage,
      metadata: posts.metadata,
      createdAt: posts.createdAt,
      updatedAt: posts.updatedAt,
      account: {
        id: accounts.id,
        name: accounts.name,
        handle: accounts.handle,
        platform: accounts.platform,
        avatarUrl: accounts.avatarUrl,
      },
    })
    .from(posts)
    .innerJoin(accounts, eq(posts.accountId, accounts.id))
    .where(eq(posts.id, id))
    .limit(1);

  if (!result) {
    return c.json({ error: "Post not found" }, 404);
  }

  return c.json({ post: result });
});

// Create post (draft or scheduled)
app.post("/", async (c) => {
  const body = await c.req.json();
  const { account_id, content, media_urls = [], scheduled_at, publish_now = false, metadata = {} } = body;

  if (!account_id || !content) {
    return c.json({ error: "account_id and content are required" }, 400);
  }

  // Validate account exists
  const [account] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.id, account_id))
    .limit(1);

  if (!account) {
    return c.json({ error: "Account not found" }, 404);
  }

  const postId = `post_${nanoid(12)}`;
  const now = new Date();
  let status = "draft";
  let scheduledAt = null;

  if (publish_now) {
    status = "publishing";
  } else if (scheduled_at) {
    const scheduleDate = new Date(scheduled_at);
    if (scheduleDate <= now) {
      status = "publishing";
    } else {
      status = "scheduled";
      scheduledAt = scheduleDate;
    }
  }

  // Create post in database
  const [post] = await db
    .insert(posts)
    .values({
      id: postId,
      accountId: account_id,
      content,
      mediaUrls: media_urls,
      status,
      scheduledAt,
      metadata: JSON.stringify(metadata),
    })
    .returning();

  // Handle immediate publishing or scheduling
  if (status === "publishing") {
    // Publish immediately in background
    publisher.publishPost(postId).catch(console.error);
  } else if (status === "scheduled" && scheduledAt) {
    // TODO: Schedule for future publication when Redis is available
    // For now, publish immediately
    publisher.publishPost(postId).catch(console.error);
    console.log(`⚠️ Scheduled post ${postId} published immediately (scheduler disabled)`);
  }

  return c.json({
    post: {
      id: post.id,
      accountId: post.accountId,
      content: post.content,
      mediaUrls: post.mediaUrls,
      status: post.status,
      scheduledAt: post.scheduledAt,
      createdAt: post.createdAt,
      account: {
        name: account.name,
        handle: account.handle,
        platform: account.platform,
      },
    },
  }, 201);
});

// Update post (reschedule, edit content)
app.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const { content, media_urls, scheduled_at, metadata } = body;

  const [existing] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  if (!existing) {
    return c.json({ error: "Post not found" }, 404);
  }

  if (existing.status === "published") {
    return c.json({ error: "Cannot edit published posts" }, 400);
  }

  if (existing.status === "publishing") {
    return c.json({ error: "Cannot edit posts that are being published" }, 400);
  }

  // Prepare updates
  const updates: any = { updatedAt: new Date() };
  
  if (content !== undefined) updates.content = content;
  if (media_urls !== undefined) updates.mediaUrls = media_urls;
  if (metadata !== undefined) updates.metadata = JSON.stringify(metadata);

  // Handle rescheduling
  if (scheduled_at !== undefined) {
    const newScheduleDate = scheduled_at ? new Date(scheduled_at) : null;
    
    if (newScheduleDate && newScheduleDate <= new Date()) {
      // Schedule for immediate publishing
      updates.status = "publishing";
      updates.scheduledAt = null;
    } else if (newScheduleDate) {
      // Reschedule for future
      updates.status = "scheduled";
      updates.scheduledAt = newScheduleDate;
    } else {
      // Remove scheduling (make draft)
      updates.status = "draft";
      updates.scheduledAt = null;
    }

    // Cancel existing schedule if any
    if (existing.status === "scheduled") {
      // await scheduler.cancelScheduledPost(id); // TODO: Enable when Redis available
      console.log(`⚠️ Cannot cancel scheduled post ${id} - scheduler disabled`);
    }

    // Set up new schedule
    if (updates.status === "scheduled") {
      // await scheduler.schedulePost(id, newScheduleDate!); // TODO: Enable when Redis available
      // For now, publish immediately
      publisher.publishPost(id).catch(console.error);
      console.log(`⚠️ Scheduled post ${id} published immediately (scheduler disabled)`);
    } else if (updates.status === "publishing") {
      publisher.publishPost(id).catch(console.error);
    }
  }

  // Update in database
  const [updated] = await db
    .update(posts)
    .set(updates)
    .where(eq(posts.id, id))
    .returning();

  return c.json({ post: updated });
});

// Delete post
app.delete("/:id", async (c) => {
  const id = c.req.param("id");

  const [existing] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  if (!existing) {
    return c.json({ error: "Post not found" }, 404);
  }

  // Cancel scheduled job if exists
  if (existing.status === "scheduled") {
    // await scheduler.cancelScheduledPost(id); // TODO: Enable when Redis available
    console.log(`⚠️ Cannot cancel scheduled post ${id} - scheduler disabled`);
  }

  await db.delete(posts).where(eq(posts.id, id));

  return c.json({ deleted: true });
});

// Publish post immediately
app.post("/:id/publish", async (c) => {
  const id = c.req.param("id");

  const [existing] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  if (!existing) {
    return c.json({ error: "Post not found" }, 404);
  }

  if (existing.status === "published") {
    return c.json({ error: "Post already published" }, 400);
  }

  if (existing.status === "publishing") {
    return c.json({ error: "Post is already being published" }, 400);
  }

  // Cancel schedule if exists
  if (existing.status === "scheduled") {
    // await scheduler.cancelScheduledPost(id); // TODO: Enable when Redis available
    console.log(`⚠️ Cannot cancel scheduled post ${id} - scheduler disabled`);
  }

  // Update status and publish
  await db
    .update(posts)
    .set({ 
      status: "publishing", 
      scheduledAt: null,
      updatedAt: new Date(),
    })
    .where(eq(posts.id, id));

  // Publish in background
  const result = await publisher.publishPost(id);

  return c.json({
    success: result.success,
    error: result.error,
  });
});

// Bulk create posts
app.post("/bulk", async (c) => {
  const body = await c.req.json();
  const { posts: postsData } = body;

  if (!Array.isArray(postsData) || postsData.length === 0) {
    return c.json({ error: "posts array is required" }, 400);
  }

  if (postsData.length > 50) {
    return c.json({ error: "Maximum 50 posts per bulk request" }, 400);
  }

  const results = [];
  const errors = [];

  for (let i = 0; i < postsData.length; i++) {
    const postData = postsData[i];
    
    try {
      // Validate required fields
      if (!postData.account_id || !postData.content) {
        errors.push({ index: i, error: "account_id and content are required" });
        continue;
      }

      // Check account exists
      const [account] = await db
        .select()
        .from(accounts)
        .where(eq(accounts.id, postData.account_id))
        .limit(1);

      if (!account) {
        errors.push({ index: i, error: "Account not found" });
        continue;
      }

      const postId = `post_${nanoid(12)}`;
      const now = new Date();
      let status = "draft";
      let scheduledAt = null;

      if (postData.publish_now) {
        status = "publishing";
      } else if (postData.scheduled_at) {
        const scheduleDate = new Date(postData.scheduled_at);
        if (scheduleDate <= now) {
          status = "publishing";
        } else {
          status = "scheduled";
          scheduledAt = scheduleDate;
        }
      }

      // Create post
      const [post] = await db
        .insert(posts)
        .values({
          id: postId,
          accountId: postData.account_id,
          content: postData.content,
          mediaUrls: postData.media_urls || [],
          status,
          scheduledAt,
          metadata: JSON.stringify(postData.metadata || {}),
        })
        .returning();

      // Handle publishing/scheduling
      if (status === "publishing") {
        publisher.publishPost(postId).catch(console.error);
      } else if (status === "scheduled" && scheduledAt) {
        // await scheduler.schedulePost(postId, scheduledAt); // TODO: Enable when Redis available
        // For now, publish immediately
        publisher.publishPost(postId).catch(console.error);
        console.log(`⚠️ Bulk scheduled post ${postId} published immediately (scheduler disabled)`);
      }

      results.push({
        index: i,
        post: {
          id: post.id,
          status: post.status,
          scheduledAt: post.scheduledAt,
        },
      });

    } catch (error: any) {
      errors.push({ index: i, error: error.message });
    }
  }

  return c.json({
    success: results.length,
    errors: errors.length,
    results,
    errors,
  });
});

export default app;