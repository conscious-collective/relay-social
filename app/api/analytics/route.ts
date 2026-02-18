export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { db } from "../../db";
import { analytics, posts, accounts } from "../../db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "../../../lib/auth-helpers";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allPosts = await db.select().from(posts).where(eq(posts.userId, user.userId));
  const allAccounts = await db.select({
    id: accounts.id,
    platform: accounts.platform,
    name: accounts.name,
    handle: accounts.handle,
  }).from(accounts).where(eq(accounts.userId, user.userId));

  const published = allPosts.filter((p) => p.status === "published").length;
  const scheduled = allPosts.filter((p) => p.status === "scheduled").length;
  const drafts = allPosts.filter((p) => p.status === "draft").length;
  const failed = allPosts.filter((p) => p.status === "failed").length;

  return NextResponse.json({
    accounts: allAccounts.length,
    posts: { total: allPosts.length, published, scheduled, drafts, failed },
  });
}
