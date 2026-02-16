import { Hono } from "hono";
import { eq, desc, and, sum } from "drizzle-orm";
import { db } from "../db/index.js";
import { posts, accounts, analytics } from "../db/schema.js";
import { PublisherService } from "../services/publisher.js";

const app = new Hono();
const publisher = new PublisherService();

// Get analytics for a specific post
app.get("/posts/:id", async (c) => {
  const postId = c.req.param("id");

  // Check if post exists and is published
  const [post] = await db
    .select({
      id: posts.id,
      platformPostId: posts.platformPostId,
      status: posts.status,
      publishedAt: posts.publishedAt,
      account: {
        platform: accounts.platform,
        name: accounts.name,
        handle: accounts.handle,
      },
    })
    .from(posts)
    .innerJoin(accounts, eq(posts.accountId, accounts.id))
    .where(eq(posts.id, postId))
    .limit(1);

  if (!post) {
    return c.json({ error: "Post not found" }, 404);
  }

  if (post.status !== "published") {
    return c.json({ error: "Analytics only available for published posts" }, 400);
  }

  // Get stored analytics
  const [analyticsData] = await db
    .select()
    .from(analytics)
    .where(eq(analytics.postId, postId))
    .limit(1);

  // If no analytics or data is old (>6 hours), try to fetch fresh data
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
  const shouldRefresh = !analyticsData || analyticsData.fetchedAt < sixHoursAgo;

  if (shouldRefresh) {
    // Trigger analytics refresh in background
    publisher.fetchAnalytics(postId).catch(console.error);
    
    if (!analyticsData) {
      return c.json({
        post: {
          id: post.id,
          platformPostId: post.platformPostId,
          publishedAt: post.publishedAt,
          account: post.account,
        },
        analytics: null,
        message: "Analytics are being fetched. Check back in a few minutes.",
      });
    }
  }

  return c.json({
    post: {
      id: post.id,
      platformPostId: post.platformPostId,
      publishedAt: post.publishedAt,
      account: post.account,
    },
    analytics: analyticsData ? {
      impressions: analyticsData.impressions,
      reach: analyticsData.reach,
      likes: analyticsData.likes,
      comments: analyticsData.comments,
      shares: analyticsData.shares,
      saves: analyticsData.saves,
      clicks: analyticsData.clicks,
      fetchedAt: analyticsData.fetchedAt,
    } : null,
    refreshing: shouldRefresh,
  });
});

// Get account-level analytics (aggregated)
app.get("/accounts/:id", async (c) => {
  const accountId = c.req.param("id");
  const days = parseInt(c.req.query("days") || "30");

  // Validate account exists
  const [account] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.id, accountId))
    .limit(1);

  if (!account) {
    return c.json({ error: "Account not found" }, 404);
  }

  // Get date range
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

  // Get aggregated analytics for published posts in this account
  const analyticsResults = await db
    .select({
      totalPosts: sum(1),
      totalImpressions: sum(analytics.impressions),
      totalReach: sum(analytics.reach),
      totalLikes: sum(analytics.likes),
      totalComments: sum(analytics.comments),
      totalShares: sum(analytics.shares),
      totalSaves: sum(analytics.saves),
      totalClicks: sum(analytics.clicks),
    })
    .from(posts)
    .innerJoin(analytics, eq(posts.id, analytics.postId))
    .where(
      and(
        eq(posts.accountId, accountId),
        eq(posts.status, "published")
      )
    );

  // Get recent posts with analytics
  const recentPosts = await db
    .select({
      id: posts.id,
      content: posts.content,
      publishedAt: posts.publishedAt,
      analytics: {
        impressions: analytics.impressions,
        reach: analytics.reach,
        likes: analytics.likes,
        comments: analytics.comments,
        shares: analytics.shares,
        saves: analytics.saves,
        clicks: analytics.clicks,
        fetchedAt: analytics.fetchedAt,
      },
    })
    .from(posts)
    .innerJoin(analytics, eq(posts.id, analytics.postId))
    .where(
      and(
        eq(posts.accountId, accountId),
        eq(posts.status, "published")
      )
    )
    .orderBy(desc(posts.publishedAt))
    .limit(10);

  const totals = analyticsResults[0] || {
    totalPosts: 0,
    totalImpressions: 0,
    totalReach: 0,
    totalLikes: 0,
    totalComments: 0,
    totalShares: 0,
    totalSaves: 0,
    totalClicks: 0,
  };

  return c.json({
    account: {
      id: account.id,
      name: account.name,
      handle: account.handle,
      platform: account.platform,
    },
    dateRange: {
      startDate,
      endDate,
      days,
    },
    totals: {
      posts: parseInt(totals.totalPosts?.toString() || "0"),
      impressions: parseInt(totals.totalImpressions?.toString() || "0"),
      reach: parseInt(totals.totalReach?.toString() || "0"),
      likes: parseInt(totals.totalLikes?.toString() || "0"),
      comments: parseInt(totals.totalComments?.toString() || "0"),
      shares: parseInt(totals.totalShares?.toString() || "0"),
      saves: parseInt(totals.totalSaves?.toString() || "0"),
      clicks: parseInt(totals.totalClicks?.toString() || "0"),
    },
    averages: totals.totalPosts ? {
      impressions: Math.round((parseInt(totals.totalImpressions?.toString() || "0")) / parseInt(totals.totalPosts.toString())),
      reach: Math.round((parseInt(totals.totalReach?.toString() || "0")) / parseInt(totals.totalPosts.toString())),
      engagement: Math.round(((parseInt(totals.totalLikes?.toString() || "0")) + 
                             (parseInt(totals.totalComments?.toString() || "0")) + 
                             (parseInt(totals.totalShares?.toString() || "0"))) / parseInt(totals.totalPosts.toString())),
    } : { impressions: 0, reach: 0, engagement: 0 },
    recentPosts,
  });
});

// Overview analytics across all accounts
app.get("/overview", async (c) => {
  const days = parseInt(c.req.query("days") || "30");

  // Get totals across all accounts
  const overviewResults = await db
    .select({
      totalAccounts: sum(1),
      platform: accounts.platform,
      totalPosts: sum(1),
      totalImpressions: sum(analytics.impressions),
      totalReach: sum(analytics.reach),
      totalLikes: sum(analytics.likes),
      totalComments: sum(analytics.comments),
      totalShares: sum(analytics.shares),
      totalSaves: sum(analytics.saves),
      totalClicks: sum(analytics.clicks),
    })
    .from(accounts)
    .leftJoin(posts, eq(accounts.id, posts.accountId))
    .leftJoin(analytics, eq(posts.id, analytics.postId))
    .where(eq(posts.status, "published"))
    .groupBy(accounts.platform);

  // Get recent activity
  const recentActivity = await db
    .select({
      postId: posts.id,
      content: posts.content.substring(0, 100) + "...", // Truncate
      publishedAt: posts.publishedAt,
      account: {
        name: accounts.name,
        handle: accounts.handle,
        platform: accounts.platform,
      },
      analytics: {
        impressions: analytics.impressions,
        likes: analytics.likes,
        comments: analytics.comments,
      },
    })
    .from(posts)
    .innerJoin(accounts, eq(posts.accountId, accounts.id))
    .leftJoin(analytics, eq(posts.id, analytics.postId))
    .where(eq(posts.status, "published"))
    .orderBy(desc(posts.publishedAt))
    .limit(20);

  const platformBreakdown = overviewResults.map(row => ({
    platform: row.platform,
    posts: parseInt(row.totalPosts?.toString() || "0"),
    impressions: parseInt(row.totalImpressions?.toString() || "0"),
    reach: parseInt(row.totalReach?.toString() || "0"),
    engagement: parseInt(row.totalLikes?.toString() || "0") + 
                parseInt(row.totalComments?.toString() || "0") + 
                parseInt(row.totalShares?.toString() || "0"),
  }));

  return c.json({
    dateRange: {
      days,
      endDate: new Date(),
      startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
    },
    totals: {
      platforms: platformBreakdown.length,
      accounts: overviewResults.reduce((sum, row) => sum + parseInt(row.totalAccounts?.toString() || "0"), 0),
      posts: platformBreakdown.reduce((sum, row) => sum + row.posts, 0),
      impressions: platformBreakdown.reduce((sum, row) => sum + row.impressions, 0),
      engagement: platformBreakdown.reduce((sum, row) => sum + row.engagement, 0),
    },
    platformBreakdown,
    recentActivity,
  });
});

// Refresh all analytics
app.post("/refresh", async (c) => {
  const postId = c.req.query("post_id");

  if (postId) {
    // Refresh specific post
    await publisher.fetchAnalytics(postId);
    return c.json({ message: `Analytics refresh triggered for post ${postId}` });
  } else {
    // Refresh all
    await publisher.fetchAnalytics();
    return c.json({ message: "Analytics refresh triggered for all posts" });
  }
});

export default app;