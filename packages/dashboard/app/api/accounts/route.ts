import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/index";
import { accounts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
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

// GET /api/accounts
export async function GET(request: NextRequest) {
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const results = await db.select({
    id: accounts.id,
    platform: accounts.platform,
    name: accounts.name,
    handle: accounts.handle,
    avatarUrl: accounts.avatarUrl,
    createdAt: accounts.createdAt,
  }).from(accounts).where(eq(accounts.userId, userId));

  return NextResponse.json({ accounts: results });
}

// POST /api/accounts/connect/instagram
export async function POST(request: NextRequest) {
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { access_token, instagram_username, instagram_id } = await request.json();

  if (!access_token || !instagram_username) {
    return NextResponse.json({ error: "access_token and instagram_username are required" }, { status: 400 });
  }

  // Validate token
  try {
    const debugResp = await fetch(
      `https://graph.instagram.com/me?fields=id,username,account_type&access_token=${access_token}`
    );
    if (!debugResp.ok) {
      return NextResponse.json({ error: "Invalid Instagram access token" }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: "Failed to validate Instagram token" }, { status: 400 });
  }

  const id = `acc_${nanoid(12)}`;

  await db.insert(accounts).values({
    id,
    userId,
    platform: "instagram",
    platformId: instagram_id || id,
    name: instagram_username,
    handle: instagram_username,
    accessToken: access_token,
  });

  return NextResponse.json({
    account: {
      id,
      platform: "instagram",
      name: instagram_username,
      handle: instagram_username,
    }
  }, { status: 201 });
}
