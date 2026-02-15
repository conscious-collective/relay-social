import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { analytics, posts, accounts } from "../db/schema.js";

const app = new Hono();

// Get analytics for a post
app.get("/posts/:id", async (c) => {
  const postId = c.req.param("id");
  const results = await db.select().from(analytics).where(eq(analytics.postId, postId));
  return c.json({ analytics: results });
});

// Overview — aggregate across all accounts
app.get("/overview", async (c) => {
  const allPosts = await db.select().from(posts);
  const allAnalytics = await db.select().from(analytics);
  const allAccounts = await db.select({
    id: accounts.id,
    platform: accounts.platform,
    name: accounts.name,
    handle: accounts.handle,
  }).from(accounts);

  const totalPosts = allPosts.length;
  const published = allPosts.filter(p => p.status === "published").length;
  const scheduled = allPosts.filter(p => p.status === "scheduled").length;
  const drafts = allPosts.filter(p => p.status === "draft").length;
  const failed = allPosts.filter(p => p.status === "failed").length;

  const totals = allAnalytics.reduce(
    (acc, a) => ({
      impressions: acc.impressions + (a.impressions || 0),
      reach: acc.reach + (a.reach || 0),
      likes: acc.likes + (a.likes || 0),
      comments: acc.comments + (a.comments || 0),
      shares: acc.shares + (a.shares || 0),
      saves: acc.saves + (a.saves || 0),
      clicks: acc.clicks + (a.clicks || 0),
    }),
    { impressions: 0, reach: 0, likes: 0, comments: 0, shares: 0, saves: 0, clicks: 0 }
  );

  return c.json({
    accounts: allAccounts.length,
    posts: { total: totalPosts, published, scheduled, drafts, failed },
    engagement: totals,
  });
});

export default app;
