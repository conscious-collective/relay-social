import { Hono } from 'hono';
import { verifyToken } from '../utils/auth';
import { users } from '../schema';

// Plans - in-memory for now
const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    interval: 'month',
    credits: 0,
    features: ['1 Instagram account', '10 posts per week', 'Basic scheduling'],
    limits: { accounts: 1, postsPerWeek: 10, webhooks: 2 },
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 5,
    interval: 'month',
    credits: 1000,
    features: ['Unlimited accounts', '1000 credits', 'Priority support', 'Webhooks'],
    limits: { accounts: -1, postsPerWeek: -1, webhooks: -1 },
  },
];

export const billingRouter = new Hono();

// Get plans
billingRouter.get('/plans', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  
  let currentTier = 'free';
  let credits = 0;
  
  if (token) {
    try {
      const payload = await verifyToken(token, c.env.JWT_SECRET);
      const db = c.env.DB;
      
      const user = await db.prepare('SELECT tier, credits FROM users WHERE id = ?').bind(payload.userId).first<any>();
      currentTier = user?.tier || 'free';
      credits = user?.credits || 0;
    } catch {}
  }

  return c.json({ plans: PLANS, currentTier, credits });
});

// Create checkout
billingRouter.post('/checkout', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const payload = await verifyToken(token, c.env.JWT_SECRET);
    const { planId } = await c.req.json();
    const plan = PLANS.find((p) => p.id === planId);

    if (!plan || plan.id === 'free') {
      return c.json({ error: 'Invalid plan' }, 400);
    }

    const db = c.env.DB;
    const user = await db.prepare('SELECT email, dodo_customer_id FROM users WHERE id = ?').bind(payload.userId).first<any>();

    let customerId = user?.dodo_customer_id;

    // Create customer if doesn't exist (simplified - in production use DoDo SDK)
    if (!customerId) {
      // Would call DoDo API here
      customerId = `cus_${crypto.randomUUID()}`;
      await db.prepare('UPDATE users SET dodo_customer_id = ? WHERE id = ?').bind(customerId, payload.userId);
    }

    // Create checkout session (simplified - in production use DoDo SDK)
    const checkoutId = `chk_${Date.now()}`;
    const checkoutUrl = `${c.env.NEXT_PUBLIC_APP_URL}/billing/success?checkout_id=${checkoutId}&plan=${planId}`;

    return c.json({ checkoutId, checkoutUrl });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// Get/Complete checkout
billingRouter.get('/checkout', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const payload = await verifyToken(token, c.env.JWT_SECRET);
    const checkoutId = c.req.query('checkout_id');
    const action = c.req.query('action');

    if (action === 'complete' && checkoutId) {
      // In production: verify with DoDo, then update user
      const db = c.env.DB;
      await db.prepare('UPDATE users SET tier = ?, credits = ?, updated_at = ? WHERE id = ?')
        .bind('pro', 1000, Date.now(), payload.userId);

      return c.json({ success: true, tier: 'pro', credits: 1000 });
    }

    // Get current status
    const db = c.env.DB;
    const user = await db.prepare('SELECT tier, credits, dodo_customer_id FROM users WHERE id = ?').bind(payload.userId).first<any>();

    return c.json({
      tier: user?.tier || 'free',
      credits: user?.credits || 0,
      customerId: user?.dodo_customer_id,
    });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});
