import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/index";
import { posts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

const verifyToken = (token: string) => {
  const JWT_SECRET = process.env.JWT_SECRET || "relay-social-secret-change-in-prod";
  return require("jsonwebtoken").verify(token, JWT_SECRET) as { userId: string; email: string };
};

const getUserId = (request: NextRequest) => {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  try {
    return verifyToken(token).userId;
  } catch {
    return null;
  }
};

// GET /api/posts
export async function GET(request: NextRequest) {
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user's accounts first
  const { accounts } = await import("@/db/schema");
  const userAccounts = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.userId, userId));
  const accountIds = userAccounts.map(a => a.id);

  if (accountIds.length === 0) {
    return NextResponse.json({ posts: [] });
  }

  const results = await db.select().from(posts).where(
    // @ts-ignore - dynamic where clause
    eq(posts.accountId, accountIds[0])
  );

  return NextResponse.json({ posts: results });
}

// POST /api/posts
export async function POST(request: NextRequest) {
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { account_id, content, media_urls, scheduled_at } = body;

  if (!account_id || !content) {
    return NextResponse.json({ error: "account_id and content are required" }, { status: 400 });
  }

  const id = `post_${nanoid(12)}`;
  
  await db.insert(posts).values({
    id,
    accountId: account_id,
    content,
    mediaUrls: media_urls || [],
    status: scheduled_at ? "scheduled" : "draft",
    scheduledAt: scheduled_at ? new Date(scheduled_at) : null,
  });

  const result = await db.select().from(posts).where(eq(posts.id, id));

  return NextResponse.json({ post: result[0] }, { status: 201 });
}

// DELETE /api/posts/:id
export async function DELETE(request: NextRequest) {
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Post ID required" }, { status: 400 });
  }

  await db.delete(posts).where(eq(posts.id, id));

  return NextResponse.json({ deleted: true });
}
