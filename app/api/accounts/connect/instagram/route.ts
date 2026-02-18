export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/db";
import { accounts } from "@/app/db/schema";
import { getAuthUser, generateId } from "@/lib/auth-helpers";

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { access_token, instagram_username, instagram_id } = await req.json();
  if (!access_token || !instagram_username) {
    return NextResponse.json(
      { error: "access_token and instagram_username are required" },
      { status: 400 }
    );
  }

  // Validate token with Instagram Graph API
  const debugResp = await fetch(
    `https://graph.instagram.com/me?fields=id,username,account_type&access_token=${access_token}`
  );
  if (!debugResp.ok) {
    return NextResponse.json(
      { error: "Invalid Instagram access token" },
      { status: 400 }
    );
  }

  const id = generateId("acc_");
  await db.insert(accounts).values({
    id,
    userId: user.userId,
    platform: "instagram",
    platformId: instagram_id || id,
    name: instagram_username,
    handle: instagram_username,
    accessToken: access_token,
  });

  return NextResponse.json(
    {
      account: {
        id,
        platform: "instagram",
        name: instagram_username,
        handle: instagram_username,
      },
    },
    { status: 201 }
  );
}
