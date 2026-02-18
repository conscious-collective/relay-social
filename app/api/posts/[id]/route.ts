export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../db";
import { posts } from "../../../db/schema";
import { and, eq } from "drizzle-orm";
import { getAuthUser } from "../../../../lib/auth-helpers";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const [post] = await db
    .select()
    .from(posts)
    .where(and(eq(posts.id, id), eq(posts.userId, user.userId)))
    .limit(1);
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  return NextResponse.json({ post });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const [existing] = await db
    .select()
    .from(posts)
    .where(and(eq(posts.id, id), eq(posts.userId, user.userId)))
    .limit(1);
  if (!existing) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  if (existing.status === "published") {
    return NextResponse.json({ error: "Cannot edit published post" }, { status: 400 });
  }

  const body = await req.json();
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.content !== undefined) updates.content = body.content;
  if (body.media_urls !== undefined) updates.mediaUrls = body.media_urls;
  if (body.scheduled_at !== undefined) {
    updates.scheduledAt = body.scheduled_at ? new Date(body.scheduled_at) : null;
    updates.status = body.scheduled_at ? "scheduled" : "draft";
  }

  const [post] = await db.update(posts).set(updates).where(eq(posts.id, id)).returning();
  return NextResponse.json({ post });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await db.delete(posts).where(and(eq(posts.id, id), eq(posts.userId, user.userId)));
  return NextResponse.json({ success: true });
}
