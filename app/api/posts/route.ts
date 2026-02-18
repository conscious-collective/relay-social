export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { db } from "../../db";
import { posts } from "../../db/schema";
import { eq, desc } from "drizzle-orm";
import { getAuthUser, generateId } from "../../../lib/auth-helpers";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const accountId = searchParams.get("account_id");

  let results = await db
    .select()
    .from(posts)
    .where(eq(posts.userId, user.userId))
    .orderBy(desc(posts.createdAt))
    .limit(50);

  if (status) results = results.filter((p) => p.status === status);
  if (accountId) results = results.filter((p) => p.accountId === accountId);

  return NextResponse.json({ posts: results, count: results.length });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { account_id, content, media_urls, scheduled_at, metadata } = await req.json();
  if (!account_id || !content) {
    return NextResponse.json({ error: "account_id and content are required" }, { status: 400 });
  }

  const id = generateId("post_");
  const status = scheduled_at ? "scheduled" : "draft";

  const [post] = await db
    .insert(posts)
    .values({
      id,
      userId: user.userId,
      accountId: account_id,
      content,
      mediaUrls: media_urls || [],
      status,
      scheduledAt: scheduled_at ? new Date(scheduled_at) : null,
      metadata: metadata || null,
    })
    .returning();

  return NextResponse.json({ post }, { status: 201 });
}
