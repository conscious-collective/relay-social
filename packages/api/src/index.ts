import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { authMiddleware } from "./middleware/auth.js";
import postsRouter from "./routes/posts.js";
import accountsRouter from "./routes/accounts.js";
import mediaRouter from "./routes/media.js";
import analyticsRouter from "./routes/analytics.js";
import oauthRouter from "./routes/oauth.js";
import { db, sqlite } from "./db/index.js";
import { apiKeys } from "./db/schema.js";
import { nanoid } from "nanoid";
// import { SchedulerService, worker } from "./services/scheduler.js"; // Temporarily disabled
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = new Hono();

// Middleware
app.use("*", cors());
app.use("*", logger());

// Static file serving for uploads
app.use("/uploads/*", serveStatic({ root: "./" }));

// Health check (no auth)
app.get("/", (c) =>
  c.json({
    name: "Relay Social API",
    version: "0.1.0",
    status: "ok",
    docs: "/api",
  })
);

// API info (no auth)
app.get("/api", (c) =>
  c.json({
    endpoints: {
      "GET /api/oauth/providers": "List OAuth providers",
      "GET /api/oauth/instagram": "Start Instagram OAuth flow",
      "GET /api/oauth/twitter": "Start Twitter OAuth flow",
      "GET /api/oauth/linkedin": "Start LinkedIn OAuth flow",
      "GET /api/accounts": "List connected accounts",
      "POST /api/accounts": "Add account (manual)",
      "DELETE /api/accounts/:id": "Remove account",
      "GET /api/posts": "List posts",
      "POST /api/posts": "Create post",
      "GET /api/posts/:id": "Get post",
      "PATCH /api/posts/:id": "Update post",
      "DELETE /api/posts/:id": "Delete post",
      "POST /api/posts/:id/publish": "Publish now",
      "POST /api/posts/bulk": "Bulk create posts",
      "GET /api/media": "List media",
      "POST /api/media/upload": "Upload media",
      "DELETE /api/media/:id": "Delete media",
      "GET /api/analytics/posts/:id": "Post analytics",
      "GET /api/analytics/overview": "Overview analytics",
    },
    oauth: {
      instagram: {
        required_env: ["META_APP_ID", "META_APP_SECRET"],
        scopes: ["instagram_basic", "instagram_content_publish", "pages_show_list"],
      },
      twitter: {
        required_env: ["TWITTER_CLIENT_ID", "TWITTER_CLIENT_SECRET"],
        scopes: ["tweet.read", "tweet.write", "users.read", "offline.access"],
      },
      linkedin: {
        required_env: ["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET"],
        scopes: ["r_liteprofile", "r_emailaddress", "w_member_social"],
      },
    },
  })
);

// OAuth routes (no auth required)
app.route("/api/oauth", oauthRouter);

// Protected API routes
app.use("/api/*", authMiddleware);
app.route("/api/posts", postsRouter);
app.route("/api/accounts", accountsRouter);
app.route("/api/media", mediaRouter);
app.route("/api/analytics", analyticsRouter);

// Bootstrap: create tables and default API key if needed
async function bootstrap() {
  // Create tables using raw SQL (simple for SQLite)
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      key TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      last_used_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      platform TEXT NOT NULL,
      platform_id TEXT NOT NULL,
      name TEXT NOT NULL,
      handle TEXT NOT NULL,
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      token_expires_at INTEGER,
      avatar_url TEXT,
      metadata TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL REFERENCES accounts(id),
      content TEXT NOT NULL,
      media_urls TEXT DEFAULT '[]',
      platform_post_id TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      scheduled_at INTEGER,
      published_at INTEGER,
      error_message TEXT,
      metadata TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE IF NOT EXISTS media (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      url TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER,
      width INTEGER,
      height INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE IF NOT EXISTS analytics (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL REFERENCES posts(id),
      impressions INTEGER DEFAULT 0,
      reach INTEGER DEFAULT 0,
      likes INTEGER DEFAULT 0,
      comments INTEGER DEFAULT 0,
      shares INTEGER DEFAULT 0,
      saves INTEGER DEFAULT 0,
      clicks INTEGER DEFAULT 0,
      fetched_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `);

  // Create default API key if none exists
  const existing = sqlite.prepare("SELECT COUNT(*) as count FROM api_keys").get() as any;
  if (existing.count === 0) {
    const key = `relay_sk_${nanoid(32)}`;
    sqlite.prepare("INSERT INTO api_keys (id, name, key, created_at) VALUES (?, ?, ?, ?)").run(
      `key_${nanoid(12)}`,
      "default",
      key,
      Math.floor(Date.now() / 1000)
    );
    console.log(`\n🔑 Default API key created: ${key}\n   Save this — it won't be shown again!\n`);
  }
}

const port = parseInt(process.env.API_PORT || "3001");

bootstrap().then(async () => {
  // TODO: Enable scheduler when Redis is available
  const schedulerEnabled = false;
  console.log("🔶 Scheduler disabled - Redis integration disabled for now");
  console.log("   Posts will be published immediately");
  
  serve({ fetch: app.fetch, port }, (info) => {
    console.log(`\n📡 Relay Social API running at http://localhost:${info.port}`);
    console.log(`   Docs: http://localhost:${info.port}/api`);
    console.log(`   OAuth: http://localhost:${info.port}/api/oauth/providers`);
    console.log(`   Scheduler: ${schedulerEnabled ? '✅ enabled' : '❌ disabled (Redis required)'}\n`);
    
    // Environment check
    const envIssues = [];
    if (!process.env.META_APP_ID) envIssues.push("META_APP_ID (Instagram OAuth)");
    if (!process.env.TWITTER_CLIENT_ID) envIssues.push("TWITTER_CLIENT_ID (Twitter OAuth)");
    if (!process.env.LINKEDIN_CLIENT_ID) envIssues.push("LINKEDIN_CLIENT_ID (LinkedIn OAuth)");
    
    if (envIssues.length > 0) {
      console.log(`🔶 Missing OAuth config: ${envIssues.join(", ")}`);
      console.log(`   OAuth flows will be disabled until configured\n`);
    }
  });
});

export default app;
