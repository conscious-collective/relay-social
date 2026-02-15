import { Hono } from "hono";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { db } from "../db/index.js";
import { posts } from "../db/schema.js";
import { nanoid } from "nanoid";

const app = new Hono();

// List posts
app.get("/", async (c) => {
  const status = c.req.query("status");
  const accountId = c.req.query("account_id");
  const limit = parseInt(c.req.query("limit") || "50");
  const offset = parseInt(c.req.query("offset") || "0");

  let query = db.select().from(posts).orderBy(desc(posts.createdAt)).limit(limit).offset(offset);

  // TODO: add filtering with drizzle where clauses
  const results = await query;
  
  // Filter in JS for now (drizzle dynamic where is verbose)
  let filtered = results;
  if (status) filtered = filtered.filter(p => p.status === status);
  if (accountId) filtered = filtered.filter(p => p.accountId === accountId);

  return c.json({ posts: filtered, count: filtered.length });
});

// Create post
app.post("/", async (c) => {
  const body = await c.req.json();
  const { account_id, content, media_urls, scheduled_at, metadata } = body;

  if (!account_id || !content) {
    return c.json({ error: "account_id and content are required" }, 400);
  }

  const id = `post_${nanoid(12)}`;
  const status = scheduled_at ? "scheduled" : "draft";

  const [post] = await db
    .insert(posts)
    .values({
      id,
      accountId: account_id,
      content,
      mediaUrls: media_urls || [],
      status,
      scheduledAt: scheduled_at ? new Date(scheduled_at) : null,
      metadata: metadata || null,
    })
    .returning();

  // TODO: if scheduled, add to BullMQ queue

  return c.json({ post }, 201);
});

// Get single post
app.get("/:id", async (c) => {
  const id = c.req.param("id");
  const [post] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);

  if (!post) return c.json({ error: "Post not found" }, 404);
  return c.json({ post });
});

// Update post
app.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();

  const [existing] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  if (!existing) return c.json({ error: "Post not found" }, 404);
  if (existing.status === "published") return c.json({ error: "Cannot edit published post" }, 400);

  const updates: Record<string, any> = { updatedAt: new Date() };
  if (body.content !== undefined) updates.content = body.content;
  if (body.media_urls !== undefined) updates.mediaUrls = body.media_urls;
  if (body.scheduled_at !== undefined) {
    updates.scheduledAt = body.scheduled_at ? new Date(body.scheduled_at) : null;
    updates.status = body.scheduled_at ? "scheduled" : "draft";
  }
  if (body.metadata !== undefined) updates.metadata = body.metadata;

  const [post] = await db.update(posts).set(updates).where(eq(posts.id, id)).returning();
  return c.json({ post });
});

// Delete post
app.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const [existing] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  if (!existing) return c.json({ error: "Post not found" }, 404);

  await db.delete(posts).where(eq(posts.id, id));
  return c.json({ deleted: true });
});

// Publish now
app.post("/:id/publish", async (c) => {
  const id = c.req.param("id");
  const [post] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  if (!post) return c.json({ error: "Post not found" }, 404);
  if (post.status === "published") return c.json({ error: "Already published" }, 400);

  // TODO: call platform adapter to publish
  // For now, mark as publishing
  const [updated] = await db
    .update(posts)
    .set({ status: "publishing", updatedAt: new Date() })
    .where(eq(posts.id, id))
    .returning();

  return c.json({ post: updated });
});

// Bulk create
app.post("/bulk", async (c) => {
  const body = await c.req.json();
  const { posts: postList } = body;

  if (!Array.isArray(postList) || postList.length === 0) {
    return c.json({ error: "posts array is required" }, 400);
  }

  const created = [];
  for (const p of postList) {
    const id = `post_${nanoid(12)}`;
    const status = p.scheduled_at ? "scheduled" : "draft";

    const [post] = await db
      .insert(posts)
      .values({
        id,
        accountId: p.account_id,
        content: p.content,
        mediaUrls: p.media_urls || [],
        status,
        scheduledAt: p.scheduled_at ? new Date(p.scheduled_at) : null,
        metadata: p.metadata || null,
      })
      .returning();

    created.push(post);
  }

  return c.json({ posts: created, count: created.length }, 201);
});

export default app;
