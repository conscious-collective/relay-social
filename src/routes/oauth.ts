import { Hono } from 'hono';
import { setCookie, getCookie } from 'hono/cookie';
import { verifyToken } from '../utils/auth';
import { accounts } from '../schema';

export const oauthRouter = new Hono();

// Instagram OAuth config - from environment
const getInstagramConfig = (env: any) => ({
  clientId: env.META_APP_ID,
  clientSecret: env.META_APP_SECRET,
  redirectUri: `${env.NEXT_PUBLIC_APP_URL}/oauth/instagram/callback`,
});

// Initiate Instagram OAuth flow
oauthRouter.get('/instagram', async (c) => {
  const env = c.env;
  const config = getInstagramConfig(env);
  
  // Generate state for CSRF protection
  const state = crypto.randomUUID();
  
  // Store state in cookie (would use Redis/DB in production)
  setCookie(c, 'oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge: 60 * 10, // 10 minutes
  });

  const authUrl = new URL('https://api.instagram.com/oauth/authorize');
  authUrl.searchParams.set('client_id', config.clientId);
  authUrl.searchParams.set('redirect_uri', config.redirectUri);
  authUrl.searchParams.set('scope', 'user_profile,user_media');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('state', state);

  return c.redirect(authUrl.toString());
});

// Instagram OAuth callback
oauthRouter.get('/instagram/callback', async (c) => {
  const env = c.env;
  const config = getInstagramConfig(env);
  
  const code = c.req.query('code');
  const state = c.req.query('state');
  const storedState = getCookie(c, 'oauth_state');
  
  if (!code || !state || state !== storedState) {
    return c.redirect(`${env.NEXT_PUBLIC_APP_URL}/accounts?error=oauth_failed`);
  }

  // Exchange code for access token
  const tokenUrl = new URL('https://api.instagram.com/oauth/access_token');
  tokenUrl.searchParams.set('client_id', config.clientId);
  tokenUrl.searchParams.set('client_secret', config.clientSecret);
  tokenUrl.searchParams.set('grant_type', 'authorization_code');
  tokenUrl.searchParams.set('redirect_uri', config.redirectUri);
  tokenUrl.searchParams.set('code', code);

  let tokenResponse;
  try {
    const res = await fetch(tokenUrl.toString(), { method: 'POST' });
    tokenResponse = await res.json();
  } catch (e) {
    return c.redirect(`${env.NEXT_PUBLIC_APP_URL}/accounts?error=token_exchange_failed`);
  }

  if (tokenResponse.error_message) {
    return c.redirect(`${env.NEXT_PUBLIC_APP_URL}/accounts?error=${tokenResponse.error_message}`);
  }

  // Get long-lived access token
  const longLivedToken = await exchangeForLongLivedToken(tokenResponse.access_token, config.clientId, config.clientSecret);
  
  // Get user profile
  const profile = await getInstagramProfile(longLivedToken);

  // Check if user is logged in (optional - could also be new user flow)
  const token = getCookie(c, 'auth_token');
  let userId = null;
  
  if (token) {
    try {
      const payload = await verifyToken(token, env.JWT_SECRET);
      userId = payload.userId;
    } catch {}
  }

  if (userId) {
    // Save account to existing user
    const db = env.DB;
    const accountId = `acc_${crypto.randomUUID()}`;
    
    await db.prepare(`
      INSERT INTO accounts (id, user_id, platform, platform_id, name, handle, access_token, refresh_token, token_expires_at, avatar_url, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      accountId,
      userId,
      'instagram',
      profile.id,
      profile.name,
      profile.username,
      longLivedToken.access_token,
      longLivedToken.refresh_token || null,
      longLivedToken.expires_at ? Math.floor(longLivedToken.expires_at * 1000) : null,
      profile.profile_picture_url,
      Date.now(),
      Date.now()
    );

    return c.redirect(`${env.NEXT_PUBLIC_APP_URL}/accounts?success=connected`);
  }

  // Return token info for new user (would normally use secure temporary storage)
  return c.redirect(`${env.NEXT_PUBLIC_APP_URL}/oauth/instagram/verify?token=${longLivedToken.access_token}&user_id=${profile.id}&name=${encodeURIComponent(profile.name)}`);
});

// Exchange short-lived token for long-lived token
async function exchangeForLongLivedToken(shortLivedToken: string, clientId: string, clientSecret: string) {
  const url = new URL('https://graph.instagram.com/access_token');
  url.searchParams.set('grant_type', 'ig_exchange_token');
  url.searchParams.set('client_secret', clientSecret);
  url.searchParams.set('access_token', shortLivedToken);

  const res = await fetch(url.toString());
  const data = await res.json();

  return {
    access_token: data.access_token,
    refresh_token: null, // Instagram doesn't provide refresh token in this flow
    expires_in: data.expires_in,
    expires_at: Date.now() + (data.expires_in * 1000),
  };
}

// Get Instagram user profile
async function getInstagramProfile(accessToken: string) {
  const url = new URL('https://graph.instagram.com/me');
  url.searchParams.set('fields', 'id,username,account_type,media_count');
  url.searchParams.set('access_token', accessToken);

  const res = await fetch(url.toString());
  const data = await res.json();

  // Get profile picture separately
  const profileUrl = new URL('https://graph.instagram.com/me');
  profileUrl.searchParams.set('fields', 'id,username,media_count,profile_picture_url');
  profileUrl.searchParams.set('access_token', accessToken);
  
  const profileRes = await fetch(profileUrl.toString());
  const profile = await profileRes.json();

  return {
    id: profile.id,
    username: profile.username,
    name: profile.username,
    profile_picture_url: profile.profile_picture_url || '',
  };
}

// Refresh Instagram access token
oauthRouter.post('/instagram/refresh', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const payload = await verifyToken(token, c.env.JWT_SECRET);
    const db = c.env.DB;
    
    const account = await db.prepare(`
      SELECT * FROM accounts WHERE user_id = ? AND platform = 'instagram'
    `).bind(payload.userId).first<any>();

    if (!account) {
      return c.json({ error: 'No Instagram account found' }, 404);
    }

    const config = getInstagramConfig(c.env);
    
    // Refresh token using Instagram's refresh endpoint
    const url = new URL('https://graph.instagram.com/refresh_access_token');
    url.searchParams.set('grant_type', 'ig_refresh_token');
    url.searchParams.set('access_token', account.access_token);

    const res = await fetch(url.toString());
    const data = await res.json();

    if (data.access_token) {
      await db.prepare(`
        UPDATE accounts SET access_token = ?, token_expires_at = ?, updated_at = ?
        WHERE id = ?
      `).bind(
        data.access_token,
        Date.now() + (data.expires_in * 1000),
        Date.now(),
        account.id
      );

      return c.json({ success: true, expires_in: data.expires_in });
    }

    return c.json({ error: 'Failed to refresh token' }, 400);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// Get OAuth status for current user
oauthRouter.get('/status', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return c.json({ connected: false });

  try {
    const payload = await verifyToken(token, c.env.JWT_SECRET);
    const db = c.env.DB;

    const instagramAccount = await db.prepare(`
      SELECT id, platform, name, handle, avatar_url, token_expires_at
      FROM accounts WHERE user_id = ? AND platform = 'instagram'
    `).bind(payload.userId).first<any>();

    return c.json({
      connected: !!instagramAccount,
      instagram: instagramAccount ? {
        id: instagramAccount.id,
        name: instagramAccount.name,
        handle: instagramAccount.handle,
        avatarUrl: instagramAccount.avatar_url,
        tokenExpiresAt: instagramAccount.token_expires_at,
      } : null,
    });
  } catch {
    return c.json({ connected: false });
  }
});
