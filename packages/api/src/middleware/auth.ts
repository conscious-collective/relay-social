import { createMiddleware } from "hono/factory";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "relay-social-secret-change-in-prod";

export const authMiddleware = createMiddleware(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Missing or invalid Authorization header" }, 401);
  }

  const token = authHeader.slice(7);
  
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
    const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
    
    if (!user) {
      return c.json({ error: "User not found" }, 401);
    }

    c.set("userId", user.id);
    c.set("user", user);
    await next();
  } catch {
    return c.json({ error: "Invalid or expired token" }, 401);
  }
});