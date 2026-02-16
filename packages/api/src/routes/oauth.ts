import { Hono } from "hono";
import { nanoid } from "nanoid";
import { db } from "../db/index.js";
import { accounts } from "../db/schema.js";

const app = new Hono();

// Environment variables
const META_APP_ID = process.env.META_APP_ID;
const META_APP_SECRET = process.env.META_APP_SECRET;
const META_REDIRECT_URI = process.env.META_REDIRECT_URI || "http://localhost:3001/api/oauth/instagram/callback";

const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID;
const TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET;
const TWITTER_REDIRECT_URI = process.env.TWITTER_REDIRECT_URI || "http://localhost:3001/api/oauth/twitter/callback";

const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const LINKEDIN_REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI || "http://localhost:3001/api/oauth/linkedin/callback";

// Instagram OAuth Flow
app.get("/instagram", (c) => {
  if (!META_APP_ID) {
    return c.json({ error: "Instagram OAuth not configured" }, 500);
  }

  const state = nanoid();
  const scope = ["instagram_basic", "instagram_content_publish", "pages_show_list"].join(",");
  
  const authUrl = new URL("https://www.facebook.com/v18.0/dialog/oauth");
  authUrl.searchParams.set("client_id", META_APP_ID);
  authUrl.searchParams.set("redirect_uri", META_REDIRECT_URI);
  authUrl.searchParams.set("scope", scope);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("state", state);

  // In production, you'd store state in session/db for CSRF protection
  return c.redirect(authUrl.toString());
});

app.get("/instagram/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");

  if (!code) {
    return c.json({ error: "Authorization denied" }, 400);
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch("https://graph.facebook.com/v18.0/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: META_APP_ID!,
        client_secret: META_APP_SECRET!,
        redirect_uri: META_REDIRECT_URI,
        code: code,
      }),
    });

    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      return c.json({ error: "Failed to get access token", details: tokenData }, 500);
    }

    // Get user's pages (Instagram accounts)
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?access_token=${tokenData.access_token}`
    );
    const pagesData = await pagesResponse.json();

    if (!pagesData.data) {
      return c.json({ error: "No Instagram accounts found", details: pagesData }, 400);
    }

    // For each page, check if it has an Instagram account
    const connectedAccounts = [];
    
    for (const page of pagesData.data) {
      try {
        // Get Instagram account connected to this page
        const igResponse = await fetch(
          `https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
        );
        const igData = await igResponse.json();
        
        if (igData.instagram_business_account) {
          const igAccountId = igData.instagram_business_account.id;
          
          // Get Instagram account details
          const igDetailResponse = await fetch(
            `https://graph.facebook.com/v18.0/${igAccountId}?fields=id,username,name,profile_picture_url&access_token=${page.access_token}`
          );
          const igDetails = await igDetailResponse.json();

          // Save to database
          const accountId = `acc_${nanoid(12)}`;
          const [account] = await db.insert(accounts).values({
            id: accountId,
            platform: "instagram",
            platformId: igAccountId,
            name: igDetails.name || igDetails.username,
            handle: igDetails.username,
            accessToken: page.access_token, // Use page access token for Instagram API calls
            avatarUrl: igDetails.profile_picture_url,
            metadata: JSON.stringify({
              pageId: page.id,
              pageName: page.name,
            }),
          }).returning();

          connectedAccounts.push({
            id: account.id,
            platform: "instagram",
            name: account.name,
            handle: account.handle,
            avatar: account.avatarUrl,
          });
        }
      } catch (err) {
        console.error(`Error processing page ${page.id}:`, err);
      }
    }

    if (connectedAccounts.length === 0) {
      return c.json({ 
        error: "No Instagram Business accounts found", 
        help: "Make sure your Facebook pages have Instagram Business accounts connected"
      }, 400);
    }

    return c.json({
      success: true,
      message: `Connected ${connectedAccounts.length} Instagram account(s)`,
      accounts: connectedAccounts,
    });

  } catch (error) {
    console.error("Instagram OAuth error:", error);
    return c.json({ error: "OAuth flow failed", details: error }, 500);
  }
});

// Twitter OAuth Flow (OAuth 2.0)
app.get("/twitter", (c) => {
  if (!TWITTER_CLIENT_ID) {
    return c.json({ error: "Twitter OAuth not configured" }, 500);
  }

  const state = nanoid();
  const codeChallenge = nanoid(43); // In production, use proper PKCE
  
  const authUrl = new URL("https://twitter.com/i/oauth2/authorize");
  authUrl.searchParams.set("client_id", TWITTER_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", TWITTER_REDIRECT_URI);
  authUrl.searchParams.set("scope", "tweet.read tweet.write users.read offline.access");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "plain");

  // In production, store state and code_challenge for verification
  return c.redirect(authUrl.toString());
});

app.get("/twitter/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");

  if (!code) {
    return c.json({ error: "Authorization denied" }, 400);
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch("https://api.twitter.com/2/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${Buffer.from(`${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: TWITTER_REDIRECT_URI,
        code_verifier: "code_challenge_here", // Should match the challenge sent earlier
      }),
    });

    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      return c.json({ error: "Failed to get access token", details: tokenData }, 500);
    }

    // Get user profile
    const userResponse = await fetch("https://api.twitter.com/2/users/me", {
      headers: {
        "Authorization": `Bearer ${tokenData.access_token}`,
      },
    });
    const userData = await userResponse.json();

    if (!userData.data) {
      return c.json({ error: "Failed to get user data", details: userData }, 500);
    }

    // Save to database
    const accountId = `acc_${nanoid(12)}`;
    const [account] = await db.insert(accounts).values({
      id: accountId,
      platform: "twitter",
      platformId: userData.data.id,
      name: userData.data.name,
      handle: userData.data.username,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      tokenExpiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null,
      metadata: JSON.stringify({
        verified: userData.data.verified || false,
        publicMetrics: userData.data.public_metrics || {},
      }),
    }).returning();

    return c.json({
      success: true,
      message: "Twitter account connected successfully",
      account: {
        id: account.id,
        platform: "twitter",
        name: account.name,
        handle: account.handle,
      },
    });

  } catch (error) {
    console.error("Twitter OAuth error:", error);
    return c.json({ error: "OAuth flow failed", details: error }, 500);
  }
});

// LinkedIn OAuth Flow
app.get("/linkedin", (c) => {
  if (!LINKEDIN_CLIENT_ID) {
    return c.json({ error: "LinkedIn OAuth not configured" }, 500);
  }

  const state = nanoid();
  const scope = ["r_liteprofile", "r_emailaddress", "w_member_social"].join(" ");
  
  const authUrl = new URL("https://www.linkedin.com/oauth/v2/authorization");
  authUrl.searchParams.set("client_id", LINKEDIN_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", LINKEDIN_REDIRECT_URI);
  authUrl.searchParams.set("scope", scope);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("state", state);

  // In production, you'd store state in session/db for CSRF protection
  return c.redirect(authUrl.toString());
});

app.get("/linkedin/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");

  if (!code) {
    return c.json({ error: "Authorization denied" }, 400);
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: LINKEDIN_CLIENT_ID!,
        client_secret: LINKEDIN_CLIENT_SECRET!,
        redirect_uri: LINKEDIN_REDIRECT_URI,
        code: code,
      }),
    });

    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      return c.json({ error: "Failed to get access token", details: tokenData }, 500);
    }

    // Get user profile
    const userResponse = await fetch("https://api.linkedin.com/v2/people/~?projection=(id,firstName,lastName,profilePicture(displayImage~:playableStreams))", {
      headers: {
        "Authorization": `Bearer ${tokenData.access_token}`,
        "X-Restli-Protocol-Version": "2.0.0",
      },
    });
    const userData = await userResponse.json();

    if (!userData.id) {
      return c.json({ error: "Failed to get user data", details: userData }, 500);
    }

    // Get user email
    const emailResponse = await fetch("https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))", {
      headers: {
        "Authorization": `Bearer ${tokenData.access_token}`,
        "X-Restli-Protocol-Version": "2.0.0",
      },
    });
    const emailData = await emailResponse.json();

    const email = emailData.elements?.[0]?.["handle~"]?.emailAddress;
    const firstName = userData.firstName?.localized?.en_US || userData.firstName?.preferredLocale?.language || "User";
    const lastName = userData.lastName?.localized?.en_US || userData.lastName?.preferredLocale?.language || "";
    const fullName = `${firstName} ${lastName}`.trim();

    // Extract profile picture URL
    let avatarUrl = null;
    if (userData.profilePicture?.["displayImage~"]?.elements?.length > 0) {
      const images = userData.profilePicture["displayImage~"].elements;
      // Get the largest image
      const largestImage = images.reduce((prev: any, current: any) => 
        (current.data["com.linkedin.digitalmedia.mediaartifact.StillImage"].storageSize.width > 
         prev.data["com.linkedin.digitalmedia.mediaartifact.StillImage"].storageSize.width) ? current : prev
      );
      avatarUrl = largestImage?.identifiers?.[0]?.identifier;
    }

    // Save to database
    const accountId = `acc_${nanoid(12)}`;
    const [account] = await db.insert(accounts).values({
      id: accountId,
      platform: "linkedin",
      platformId: userData.id,
      name: fullName,
      handle: email || fullName.toLowerCase().replace(/\s+/g, ''),
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || null,
      tokenExpiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null,
      avatarUrl: avatarUrl,
      metadata: JSON.stringify({
        email: email,
        firstName: firstName,
        lastName: lastName,
        locale: userData.firstName?.preferredLocale || null,
      }),
    }).returning();

    return c.json({
      success: true,
      message: "LinkedIn account connected successfully",
      account: {
        id: account.id,
        platform: "linkedin",
        name: account.name,
        handle: account.handle,
        avatar: account.avatarUrl,
      },
    });

  } catch (error) {
    console.error("LinkedIn OAuth error:", error);
    return c.json({ error: "OAuth flow failed", details: error }, 500);
  }
});

// List OAuth providers and their status
app.get("/providers", (c) => {
  return c.json({
    providers: {
      instagram: {
        available: !!META_APP_ID,
        authUrl: "/api/oauth/instagram",
        requirements: ["META_APP_ID", "META_APP_SECRET"],
        scopes: ["instagram_basic", "instagram_content_publish", "pages_show_list"],
      },
      twitter: {
        available: !!TWITTER_CLIENT_ID,
        authUrl: "/api/oauth/twitter", 
        requirements: ["TWITTER_CLIENT_ID", "TWITTER_CLIENT_SECRET"],
        scopes: ["tweet.read", "tweet.write", "users.read", "offline.access"],
      },
      linkedin: {
        available: !!LINKEDIN_CLIENT_ID,
        authUrl: "/api/oauth/linkedin",
        requirements: ["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET"],
        scopes: ["r_liteprofile", "r_emailaddress", "w_member_social"],
      },
    },
  });
});

export default app;