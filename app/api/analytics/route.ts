export const runtime = 'edge';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/db";
import { posts, accounts } from "@/app/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [allPosts, allAccounts] = await Promise.all([
    db.select().from(posts).where(eq(posts.userId, user.userId)),
    db
      .select({ id: accounts.id, platform: accounts.platform, name: accounts.name, handle: accounts.handle })
      .from(accounts)
      .where(eq(accounts.userId, user.userId)),
  ]);

  return NextResponse.json({
    accounts: allAccounts.length,
    posts: {
      total: allPosts.length,
      published: allPosts.filter((p) => p.status === "published").length,
      scheduled: allPosts.filter((p) => p.status === "scheduled").length,
      drafts: allPosts.filter((p) => p.status === "draft").length,
      failed: allPosts.filter((p) => p.status === "failed").length,
    },
  });
}
