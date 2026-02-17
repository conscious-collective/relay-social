import { createMiddleware } from "hono/factory";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { apiKeys, users } from "../db/schema.js";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "relay-social-secret-change-in-prod";

export const authMiddleware = createMiddleware(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Missing or invalid Authorization header" }, 401);
  }

  const token = authHeader.slice(7);
  
  // Try JWT first (new user auth)
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
    const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
    if (user) {
      c.set("userId" as never, user.id);
      c.set("user" as never, user);
      await next();
      return;
    }
  } catch {
    // Not a valid JWT, try API key (legacy)
  }

  // Try API key (legacy)
  const [apiKey] = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.key, token))
    .limit(1);

  if (!apiKey) {
    return c.json({ error: "Invalid API key" }, 401);
  }

  // Update last used
  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, apiKey.id));

  c.set("apiKeyId" as never, apiKey.id);
  c.set("userId" as never, apiKey.userId);
  await next();
});
