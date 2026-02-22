import { Hono } from 'hono';
import { verifyToken } from '../utils/auth';

// Plans configuration
const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    interval: 'month',
    credits: 0,
    features: ['1 Instagram account', '10 posts per week', 'Basic scheduling'],
    limits: { accounts: 1, postsPerWeek: 10, webhooks: 2 },
    stripePriceId: null,
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 9,
    interval: 'month',
    credits: 500,
    features: ['3 Instagram accounts', '500 credits/month', 'Advanced scheduling', 'Webhooks'],
    limits: { accounts: 3, postsPerWeek: 50, webhooks: 5 },
    stripePriceId: 'price_starter_monthly',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 29,
    interval: 'month',
    credits: 2000,
    features: ['Unlimited accounts', '2000 credits/month', 'Priority support', 'Analytics', 'Webhooks'],
    limits: { accounts: -1, postsPerWeek: -1, webhooks: -1 },
    stripePriceId: 'price_pro_monthly',
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

  // Return plans without sensitive stripe price IDs for public
  const publicPlans = PLANS.map(({ stripePriceId, ...plan }) => plan);

  return c.json({ plans: publicPlans, currentTier, credits });
});

// Get current billing status
billingRouter.get('/status', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const payload = await verifyToken(token, c.env.JWT_SECRET);
    const db = c.env.DB;
    
    const user = await db.prepare(`
      SELECT tier, credits, dodo_customer_id, dodo_subscription_id 
      FROM users WHERE id = ?
    `).bind(payload.userId).first<any>();

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    const plan = PLANS.find(p => p.id === user.tier) || PLANS[0];

    return c.json({
      tier: user.tier,
      credits: user.credits,
      customerId: user.dodo_customer_id,
      subscriptionId: user.dodo_subscription_id,
      plan: {
        id: plan.id,
        name: plan.name,
        price: plan.price,
        interval: plan.interval,
      },
    });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// Create Stripe checkout session
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

    if (!plan.stripePriceId) {
      return c.json({ error: 'Plan not available for purchase' }, 400);
    }

    const db = c.env.DB;
    const user = await db.prepare('SELECT email, dodo_customer_id FROM users WHERE id = ?').bind(payload.userId).first<any>();

    // Create or get Stripe customer
    let customerId = user?.dodo_customer_id;
    
    if (!customerId) {
      // In production: use Stripe SDK to create customer
      // const stripe = new Stripe(c.env.STRIPE_SECRET_KEY);
      // const customer = await stripe.customers.create({ email: user.email });
      customerId = `cus_${crypto.randomUUID()}`;
      
      await db.prepare('UPDATE users SET dodo_customer_id = ? WHERE id = ?')
        .bind(customerId, payload.userId);
    }

    // Create Stripe checkout session
    // In production: use Stripe SDK
    /*
    const stripe = new Stripe(c.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${c.env.NEXT_PUBLIC_APP_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${c.env.NEXT_PUBLIC_APP_URL}/billing/cancel`,
    });
    */

    // For now, return mock checkout (replace with real Stripe in production)
    const checkoutId = `cs_${crypto.randomUUID()}`;
    const checkoutUrl = `${c.env.NEXT_PUBLIC_APP_URL}/billing/success?checkout_id=${checkoutId}&plan=${planId}&customer=${customerId}`;

    return c.json({
      checkoutId,
      checkoutUrl,
      plan: { id: plan.id, name: plan.name, price: plan.price },
    });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// Create customer portal session (for managing subscription)
billingRouter.post('/portal', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const payload = await verifyToken(token, c.env.JWT_SECRET);
    const db = c.env.DB;
    
    const user = await db.prepare('SELECT dodo_customer_id FROM users WHERE id = ?').bind(payload.userId).first<any>();

    if (!user?.dodo_customer_id) {
      return c.json({ error: 'No subscription found' }, 404);
    }

    // In production: create Stripe portal session
    /*
    const stripe = new Stripe(c.env.STRIPE_SECRET_KEY);
    const session = await stripe.billingPortal.sessions.create({
      customer: user.dodo_customer_id,
      return_url: `${c.env.NEXT_PUBLIC_APP_URL}/settings`,
    });
    */

    // Mock portal URL
    const portalUrl = `${c.env.NEXT_PUBLIC_APP_URL}/billing/portal?customer=${user.dodo_customer_id}`;

    return c.json({ portalUrl });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// Handle webhook from payment provider (Stripe/DoDo)
billingRouter.post('/webhook', async (c) => {
  const signature = c.req.header('stripe-signature') || c.req.header('x-dodo-signature');
  
  if (!signature) {
    return c.json({ error: 'Missing signature' }, 400);
  }

  // Verify webhook signature
  // In production: use Stripe.webhooks.constructEvent or DoDo's verification
  
  const body = await c.req.text();
  let event;

  try {
    // In production: verify and parse the event
    // const stripe = new Stripe(c.env.STRIPE_SECRET_KEY);
    // event = stripe.webhooks.constructEvent(body, signature, c.env.STRIPE_WEBHOOK_SECRET);
    
    // For now, parse as JSON
    event = JSON.parse(body);
  } catch (e: any) {
    return c.json({ error: `Webhook error: ${e.message}` }, 400);
  }

  const db = c.env.DB;

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const customerId = session.customer;
      const planId = session.metadata?.planId || 'pro';
      const plan = PLANS.find(p => p.id === planId) || PLANS[2];

      // Update user to paid tier
      await db.prepare(`
        UPDATE users SET tier = ?, credits = ?, dodo_subscription_id = ?, updated_at = ?
        WHERE dodo_customer_id = ?
      `).bind(
        plan.id,
        plan.credits,
        session.subscription || `sub_${crypto.randomUUID()}`,
        Date.now(),
        customerId
      );
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      const customerId = subscription.customer;
      
      if (subscription.status === 'active') {
        // Subscription renewed
        const plan = PLANS.find(p => p.stripePriceId === subscription.items.data[0].price.id);
        if (plan) {
          await db.prepare(`
            UPDATE users SET tier = ?, credits = ?, updated_at = ?
            WHERE dodo_customer_id = ?
          `).bind(plan.id, plan.credits, Date.now(), customerId);
        }
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const customerId = subscription.customer;

      // Downgrade to free tier
      await db.prepare(`
        UPDATE users SET tier = 'free', credits = 0, dodo_subscription_id = NULL, updated_at = ?
        WHERE dodo_customer_id = ?
      `).bind(Date.now(), customerId);
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      const customerId = invoice.customer;
      
      // Could notify user about failed payment
      console.log(`Payment failed for customer ${customerId}`);
      break;
    }
  }

  return c.json({ received: true });
});

// Verify checkout (called after redirect from checkout)
billingRouter.get('/verify', async (c) => {
  const checkoutId = c.req.query('checkout_id');
  const planId = c.req.query('plan');
  
  if (!checkoutId || !planId) {
    return c.json({ error: 'Missing parameters' }, 400);
  }

  const plan = PLANS.find(p => p.id === planId);
  if (!plan) {
    return c.json({ error: 'Invalid plan' }, 400);
  }

  // In production: verify with Stripe
  // const stripe = new Stripe(c.env.STRIPE_SECRET_KEY);
  // const session = await stripe.checkout.sessions.retrieve(checkoutId);
  
  // For demo: assume checkout is complete
  return c.json({
    success: true,
    tier: plan.id,
    credits: plan.credits,
    message: `Successfully subscribed to ${plan.name}!`,
  });
});

// Apply credits (for testing/manual add)
billingRouter.post('/credits', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const payload = await verifyToken(token, c.env.JWT_SECRET);
    const { credits, action } = await c.req.json();
    
    const db = c.env.DB;
    const user = await db.prepare('SELECT credits, tier FROM users WHERE id = ?').bind(payload.userId).first<any>();

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    let newCredits = user.credits;
    
    if (action === 'add') {
      newCredits += credits;
    } else if (action === 'deduct') {
      newCredits = Math.max(0, newCredits - credits);
    } else if (action === 'set') {
      newCredits = credits;
    }

    await db.prepare('UPDATE users SET credits = ?, updated_at = ? WHERE id = ?')
      .bind(newCredits, Date.now(), payload.userId);

    return c.json({ credits: newCredits });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});
