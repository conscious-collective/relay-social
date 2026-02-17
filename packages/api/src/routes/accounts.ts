import { Hono } from "hono";
import { db, sqlite } from "../db/index.js";
import { accounts } from "../db/schema.js";
import { nanoid } from "nanoid";

const app = new Hono();

// Get user from context
const getUserId = (c: any) => c.get("userId");

// List accounts (user's only)
app.get("/", async (c) => {
  const userId = getUserId(c);
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const results = sqlite.prepare(`
    SELECT id, platform, name, handle, avatar_url, created_at 
    FROM accounts 
    WHERE user_id = ?
  `).all(userId);

  return c.json({ accounts: results });
});

// Connect Instagram (manual token for MVP)
app.post("/connect/instagram", async (c) => {
  const userId = getUserId(c);
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body = await c.req.json();
  const { access_token, instagram_username, instagram_id } = body;

  if (!access_token || !instagram_username) {
    return c.json({ error: "access_token and instagram_username are required" }, 400);
  }

  // Validate token by calling Instagram Graph API
  try {
    const debugResp = await fetch(
      `https://graph.instagram.com/me?fields=id,username,account_type&access_token=${access_token}`
    );
    if (!debugResp.ok) {
      return c.json({ error: "Invalid Instagram access token" }, 400);
    }
    const userData = await debugResp.json();
  } catch (e) {
    return c.json({ error: "Failed to validate Instagram token" }, 400);
  }

  const id = `acc_${nanoid(12)}`;

  sqlite.prepare(`
    INSERT INTO accounts (id, user_id, platform, platform_id, name, handle, access_token)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, userId, "instagram", instagram_id || id, instagram_username, instagram_username, access_token);

  return c.json({
    account: {
      id,
      platform: "instagram",
      name: instagram_username,
      handle: instagram_username,
    }
  }, 201);
});

// Instagram OAuth URL generator
app.get("/oauth/instagram", async (c) => {
  const userId = getUserId(c);
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const appId = process.env.META_APP_ID || "YOUR_APP_ID";
  const redirectUri = process.env.META_REDIRECT_URI || "http://localhost:3001/api/accounts/oauth/instagram/callback";
  
  const scope = "instagram_basic,instagram_content_publish,pages_show_list";
  const oauthUrl = `https://api.instagram.com/oauth/authorize?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code&state=${userId}`;

  return c.json({ oauthUrl });
});

// Instagram OAuth callback
app.get("/oauth/instagram/callback", async (c) => {
  const { code, state: userId, error_message } = c.req.query();

  if (error_message) {
    return c.html(`
      <html><body>
        <h1>Connection Failed</h1>
        <p>${error_message}</p>
        <p><a href="/">Go back</a></p>
      </body></html>
    `);
  }

  if (!code || !userId) {
    return c.html(`
      <html><body>
        <h1>Missing Parameters</h1>
        <p>Authorization failed.</p>
        <p><a href="/">Go back</a></p>
      </body></html>
    `);
  }

  // Exchange code for token
  const appId = process.env.META_APP_ID || "YOUR_APP_ID";
  const appSecret = process.env.META_APP_SECRET || "YOUR_APP_SECRET";
  const redirectUri = process.env.META_REDIRECT_URI || "http://localhost:3001/api/accounts/oauth/instagram/callback";

  try {
    const tokenResp = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: appId,
        client_secret: appSecret,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code,
      }),
    });

    if (!tokenResp.ok) {
      const err = await tokenResp.text();
      return c.html(`
        <html><body>
          <h1>Token Exchange Failed</h1>
          <p>${err}</p>
          <p><a href="/">Go back</a></p>
        </body></html>
      `);
    }

    const tokenData = await tokenResp.json();
    
    // Get long-lived token
    const longLivedResp = await fetch(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${appSecret}&access_token=${tokenData.access_token}`
    );
    const longLivedData = await longLivedResp.json();

    // Get IG user info
    const igUserResp = await fetch(
      `https://graph.instagram.com/me?fields=id,username,account_type&access_token=${longLivedData.access_token}`
    );
    const igUser = await igUserResp.json();

    // Save account
    const id = `acc_${nanoid(12)}`;
    sqlite.prepare(`
      INSERT INTO accounts (id, user_id, platform, platform_id, name, handle, access_token)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, "instagram", igUser.id, igUser.username, igUser.username, longLivedData.access_token);

    return c.html(`
      <html><body>
        <h1>Connected!</h1>
        <p>Your Instagram account @${igUser.username} has been connected.</p>
        <p>You can close this window and return to your dashboard.</p>
      </body></html>
    `);
  } catch (e) {
    return c.html(`
      <html><body>
        <h1>Error</h1>
        <p>Something went wrong. Please try again.</p>
        <p><a href="/">Go back</a></p>
      </body></html>
    `);
  }
});

// Delete account
app.delete("/:id", async (c) => {
  const userId = getUserId(c);
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const id = c.req.param("id");
  
  // Verify ownership
  const existing = sqlite.prepare("SELECT id FROM accounts WHERE id = ? AND user_id = ?").get(id, userId);
  if (!existing) {
    return c.json({ error: "Account not found" }, 404);
  }

  sqlite.prepare("DELETE FROM accounts WHERE id = ?").run(id);
  return c.json({ deleted: true });
});

export default app;
