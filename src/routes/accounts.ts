import { Hono } from 'hono';
import { verifyToken, generateId } from '../utils/auth';
import { accounts } from '../schema';

export const accountsRouter = new Hono();

// List accounts
accountsRouter.get('/', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const payload = await verifyToken(token, c.env.JWT_SECRET);
    const db = c.env.DB;
    
    const userAccounts = await db.prepare(
      'SELECT id, platform, name, handle, avatar_url FROM accounts WHERE user_id = ?'
    ).bind(payload.userId).all<any>();

    return c.json({ accounts: userAccounts });
  } catch {
    return c.json({ error: 'Invalid token' }, 401);
  }
});

// Connect Instagram (manual token)
accountsRouter.post('/connect/instagram', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const payload = await verifyToken(token, c.env.JWT_SECRET);
    const { access_token, instagram_username } = await c.req.json();
    
    if (!access_token || !instagram_username) {
      return c.json({ error: 'access_token and instagram_username required' }, 400);
    }

    const db = c.env.DB;
    const accountId = generateId('acc_');

    await db.prepare(`
      INSERT INTO accounts (id, user_id, platform, platform_id, name, handle, access_token, created_at, updated_at)
      VALUES (?, ?, 'instagram', ?, ?, ?, ?, ?, ?)
    `).bind(
      accountId,
      payload.userId,
      instagram_username, // platform_id
      instagram_username, // name
      instagram_username, // handle
      access_token,
      Date.now(),
      Date.now()
    );

    return c.json({ id: accountId, platform: 'instagram', name: instagram_username, handle: instagram_username }, 201);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// OAuth redirect
accountsRouter.get('/connect/instagram', async (c) => {
  const userId = c.req.query('userId');
  if (!userId) return c.json({ error: 'userId required' }, 400);

  const scopes = ['instagram_basic', 'instagram_content_publish', 'pages_show_list'].join(',');
  const redirectUri = `${c.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/instagram`;
  
  const authUrl = new URL('https://www.facebook.com/v21.0/dialog/oauth');
  authUrl.searchParams.set('client_id', c.env.META_APP_ID);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', scopes);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('state', userId);

  return c.redirect(authUrl.toString());
});

// OAuth callback
accountsRouter.get('/callback/instagram', async (c) => {
  const code = c.req.query('code');
  const userId = c.req.query('state');
  const error = c.req.query('error');

  if (error) {
    return c.redirect(`${c.env.NEXT_PUBLIC_APP_URL}/accounts?error=${error}`);
  }

  if (!code || !userId) {
    return c.redirect(`${c.env.NEXT_PUBLIC_APP_URL}/accounts?error=missing_params`);
  }

  try {
    // Exchange code for token
    const tokenUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token');
    tokenUrl.searchParams.set('client_id', c.env.META_APP_ID);
    tokenUrl.searchParams.set('client_secret', c.env.META_APP_SECRET);
    tokenUrl.searchParams.set('redirect_uri', `${c.env.NEXT_PUBLIC_APP_URL}/api/accounts/callback/instagram`);
    tokenUrl.searchParams.set('code', code);

    const tokenRes = await fetch(tokenUrl.toString());
    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      return c.redirect(`${c.env.NEXT_PUBLIC_APP_URL}/accounts?error=token_failed`);
    }

    // Get Instagram account
    const igUrl = new URL('https://graph.facebook.com/v21.0/me');
    igUrl.searchParams.set('fields', 'instagram_business_account{id,username,name}');
    igUrl.searchParams.set('access_token', tokenData.access_token);

    const igRes = await fetch(igUrl.toString());
    const igData = await igRes.json();

    if (!igData.instagram_business_account) {
      return c.redirect(`${c.env.NEXT_PUBLIC_APP_URL}/accounts?error=no_instagram`);
    }

    const igAccount = igData.instagram_business_account;

    // Save account
    const db = c.env.DB;
    const accountId = generateId('acc_');

    await db.prepare(`
      INSERT INTO accounts (id, user_id, platform, platform_id, name, handle, access_token, created_at, updated_at)
      VALUES (?, ?, 'instagram', ?, ?, ?, ?, ?, ?)
    `).bind(
      accountId,
      userId,
      igAccount.id,
      igAccount.name || igAccount.username,
      igAccount.username,
      tokenData.access_token,
      Date.now(),
      Date.now()
    );

    return c.redirect(`${c.env.NEXT_PUBLIC_APP_URL}/accounts?success=connected`);
  } catch (e) {
    return c.redirect(`${c.env.NEXT_PUBLIC_APP_URL}/accounts?error=callback_failed`);
  }
});

// Delete account
accountsRouter.delete('/:id', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const payload = await verifyToken(token, c.env.JWT_SECRET);
    const accountId = c.req.param('id');
    
    const db = c.env.DB;
    await db.prepare('DELETE FROM accounts WHERE id = ? AND user_id = ?').bind(accountId, payload.userId);

    return c.json({ success: true });
  } catch {
    return c.json({ error: 'Invalid token' }, 401);
  }
});
