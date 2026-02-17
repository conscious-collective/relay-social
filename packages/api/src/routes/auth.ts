import { Hono } from "hono";
import { db } from "../db/index.js";
import { users, apiKeys, accounts } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import { hash, verify } from "@node-rs/argon2";
import { generateId } from "lucia";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "relay-social-secret-change-in-prod";
const JWT_EXPIRY = "7d";

const auth = new Hono();

// Verify token helper
const verifyToken = (token: string) => {
  return jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
};

// Signup
auth.post("/signup", async (c) => {
  const { email, password, name } = await c.req.json();
  
  if (!email || !password) {
    return c.json({ error: "Email and password required" }, 400);
  }

  // Check existing user
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) {
    return c.json({ error: "Email already registered" }, 400);
  }

  const passwordHash = await hash(password);
  const userId = generateId(16);
  
  await db.insert(users).values({
    id: userId,
    email,
    passwordHash,
    tier: "free",
  });

  // Generate default API key
  const apiKeyId = generateId(16);
  const apiKey = `relay_${crypto.randomUUID().replace(/-/g, "")}`;
  
  await db.insert(apiKeys).values({
    id: apiKeyId,
    userId,
    name: "Default",
    key: apiKey,
  });

  const token = jwt.sign({ userId: userId, email }, JWT_SECRET, { expiresIn: JWT_EXPIRY });

  return c.json({
    user: { id: userId, email, tier: "free" },
    token,
    apiKey,
  });
});

// Login
auth.post("/login", async (c) => {
  const { email, password } = await c.req.json();
  
  if (!email || !password) {
    return c.json({ error: "Email and password required" }, 400);
  }

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const valid = await verify(user.passwordHash, password);
  if (!valid) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  // Get user's API keys
  const keys = await db.select().from(apiKeys).where(eq(apiKeys.userId, user.id));
  
  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRY });

  return c.json({
    user: { id: user.id, email: user.email, tier: user.tier },
    token,
    apiKeys: keys.map(k => ({ id: k.id, name: k.name, key: k.key })),
  });
});

// Get current user
auth.get("/me", async (c) => {
  const token = c.req.header("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return c.json({ error: "No token provided" }, 401);
  }

  try {
    const payload = await verifyToken(token, JWT_SECRET);
    const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
    
    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    const keys = await db.select().from(apiKeys).where(eq(apiKeys.userId, user.id));
    const userAccounts = await db.select().from(accounts).where(eq(accounts.id, user.id));

    return c.json({
      user: { id: user.id, email: user.email, tier: user.tier },
      apiKeys: keys.map(k => ({ id: k.id, name: k.name, key: k.key })),
      accounts: userAccounts,
    });
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }
});

// Create new API key
auth.post("/keys", async (c) => {
  const token = c.req.header("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return c.json({ error: "No token provided" }, 401);
  }

  try {
    const payload = await verifyToken(token, JWT_SECRET);
    const { name } = await c.req.json();
    
    const apiKeyId = generateId(16);
    const apiKey = `relay_${crypto.randomUUID().replace(/-/g, "")}`;
    
    await db.insert(apiKeys).values({
      id: apiKeyId,
      userId: payload.userId,
      name: name || "New Key",
      key: apiKey,
    });

    return c.json({ id: apiKeyId, name: name || "New Key", key: apiKey });
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }
});

// List API keys
auth.get("/keys", async (c) => {
  const token = c.req.header("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return c.json({ error: "No token provided" }, 401);
  }

  try {
    const payload = await verifyToken(token, JWT_SECRET);
    const keys = await db.select().from(apiKeys).where(eq(apiKeys.userId, payload.userId));
    return c.json({ keys });
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }
});

// Delete API key
auth.delete("/keys/:id", async (c) => {
  const token = c.req.header("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return c.json({ error: "No token provided" }, 401);
  }

  try {
    const payload = await verifyToken(token, JWT_SECRET);
    const keyId = c.req.param("id");
    
    await db.delete(apiKeys).where(and(
      eq(apiKeys.id, keyId),
      eq(apiKeys.userId, payload.userId)
    ));

    return c.json({ success: true });
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }
});

export default auth;
