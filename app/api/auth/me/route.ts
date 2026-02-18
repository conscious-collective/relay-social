export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../db";
import { users, apiKeys, accounts } from "../../../db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "../../../../lib/auth-helpers";

export async function GET(req: NextRequest) {
  const authUser = await getAuthUser(req);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [user] = await db.select().from(users).where(eq(users.id, authUser.userId)).limit(1);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const keys = await db.select().from(apiKeys).where(eq(apiKeys.userId, user.id));
  const userAccounts = await db.select().from(accounts).where(eq(accounts.userId, user.id));

  return NextResponse.json({
    user: { id: user.id, email: user.email, tier: user.tier },
    apiKeys: keys.map((k) => ({ id: k.id, name: k.name, key: k.key })),
    accounts: userAccounts,
  });
}
