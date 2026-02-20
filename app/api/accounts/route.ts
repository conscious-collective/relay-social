export const runtime = 'edge';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/db";
import { accounts } from "@/app/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await db
    .select({
      id: accounts.id,
      platform: accounts.platform,
      name: accounts.name,
      handle: accounts.handle,
      avatarUrl: accounts.avatarUrl,
      createdAt: accounts.createdAt,
    })
    .from(accounts)
    .where(eq(accounts.userId, user.userId));

  return NextResponse.json({ accounts: result });
}
