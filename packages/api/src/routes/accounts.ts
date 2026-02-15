import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { accounts } from "../db/schema.js";
import { nanoid } from "nanoid";

const app = new Hono();

// List accounts
app.get("/", async (c) => {
  const results = await db.select({
    id: accounts.id,
    platform: accounts.platform,
    name: accounts.name,
    handle: accounts.handle,
    avatarUrl: accounts.avatarUrl,
    createdAt: accounts.createdAt,
  }).from(accounts);

  return c.json({ accounts: results });
});

// Add account (manual for MVP — OAuth later)
app.post("/", async (c) => {
  const body = await c.req.json();
  const { platform, platform_id, name, handle, access_token, refresh_token, avatar_url } = body;

  if (!platform || !name || !access_token) {
    return c.json({ error: "platform, name, and access_token are required" }, 400);
  }

  const id = `acc_${nanoid(12)}`;

  const [account] = await db
    .insert(accounts)
    .values({
      id,
      platform,
      platformId: platform_id || id,
      name,
      handle: handle || name,
      accessToken: access_token,
      refreshToken: refresh_token || null,
      avatarUrl: avatar_url || null,
    })
    .returning();

  return c.json({
    account: {
      id: account.id,
      platform: account.platform,
      name: account.name,
      handle: account.handle,
    }
  }, 201);
});

// Delete account
app.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const [existing] = await db.select().from(accounts).where(eq(accounts.id, id)).limit(1);
  if (!existing) return c.json({ error: "Account not found" }, 404);

  await db.delete(accounts).where(eq(accounts.id, id));
  return c.json({ deleted: true });
});

export default app;
