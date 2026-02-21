import { Hono } from 'hono';
import { hashPassword, verifyPassword, signToken, verifyToken, generateId } from '../utils/auth';
import { users, apiKeys } from '../schema';
import { eq, desc } from 'drizzle-orm';

export const authRouter = new Hono();

// Signup
authRouter.post('/signup', async (c) => {
  const { email, password } = await c.req.json();
  
  if (!email || !password) {
    return c.json({ error: 'Email and password required' }, 400);
  }

  const db = c.env.DB;
  
  // Check if user exists
  const existing = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (existing) {
    return c.json({ error: 'Email already exists' }, 400);
  }

  const passwordHash = await hashPassword(password);
  const userId = generateId('u_');

  await db.prepare(`
    INSERT INTO users (id, email, password_hash, tier, credits, created_at, updated_at)
    VALUES (?, ?, ?, 'free', 0, ?, ?)
  `).bind(userId, email, passwordHash, Date.now(), Date.now());

  // Create default API key
  const keyId = generateId('k_');
  const apiKey = `relay_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;
  
  await db.prepare(`
    INSERT INTO api_keys (id, user_id, name, key, created_at)
    VALUES (?, ?, 'Default', ?, ?)
  `).bind(keyId, userId, apiKey, Date.now());

  const token = await signToken({ userId, email }, c.env.JWT_SECRET);

  return c.json({
    user: { id: userId, email, tier: 'free' },
    token,
    apiKey,
  });
});

// Login
authRouter.post('/login', async (c) => {
  const { email, password } = await c.req.json();
  
  if (!email || !password) {
    return c.json({ error: 'Email and password required' }, 400);
  }

  const db = c.env.DB;
  
  const user = await db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first<any>();
  if (!user) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  const token = await signToken({ userId: user.id, email: user.email }, c.env.JWT_SECRET);

  // Get API keys
  const keys = await db.prepare('SELECT id, name, key FROM api_keys WHERE user_id = ?').bind(user.id).all<any>();

  return c.json({
    user: { id: user.id, email: user.email, tier: user.tier },
    token,
    apiKeys: keys,
  });
});

// Get current user
authRouter.get('/me', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const payload = await verifyToken(token, c.env.JWT_SECRET);
    const db = c.env.DB;
    
    const user = await db.prepare('SELECT id, email, tier FROM users WHERE id = ?').bind(payload.userId).first<any>();
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    const keys = await db.prepare('SELECT id, name, key FROM api_keys WHERE user_id = ?').bind(user.id).all<any>();
    const accounts = await db.prepare('SELECT id, platform, name, handle FROM accounts WHERE user_id = ?').bind(user.id).all<any>();

    return c.json({ user, apiKeys: keys, accounts });
  } catch {
    return c.json({ error: 'Invalid token' }, 401);
  }
});

// Create API key
authRouter.post('/keys', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const payload = await verifyToken(token, c.env.JWT_SECRET);
    const { name } = await c.req.json();
    
    const db = c.env.DB;
    const keyId = generateId('k_');
    const apiKey = `relay_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;

    await db.prepare(`
      INSERT INTO api_keys (id, user_id, name, key, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(keyId, payload.userId, name || 'API Key', apiKey, Date.now());

    return c.json({ id: keyId, name: name || 'API Key', key: apiKey }, 201);
  } catch {
    return c.json({ error: 'Invalid token' }, 401);
  }
});

// Delete API key
authRouter.delete('/keys/:id', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const payload = await verifyToken(token, c.env.JWT_SECRET);
    const keyId = c.req.param('id');
    
    const db = c.env.DB;
    await db.prepare('DELETE FROM api_keys WHERE id = ? AND user_id = ?').bind(keyId, payload.userId);

    return c.json({ success: true });
  } catch {
    return c.json({ error: 'Invalid token' }, 401);
  }
});
