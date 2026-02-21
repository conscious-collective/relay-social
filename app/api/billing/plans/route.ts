export const runtime = 'edge';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/db";
import { users } from "@/app/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth-helpers";
import { PLANS } from "@/lib/plans";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  
  let currentTier = "free";
  let credits = 0;
  
  if (user) {
    const [userData] = await db
      .select({ tier: users.tier, credits: users.credits })
      .from(users)
      .where(eq(users.id, user.userId))
      .limit(1);
    currentTier = userData?.tier || "free";
    credits = userData?.credits || 0;
  }

  return NextResponse.json({
    plans: PLANS,
    currentTier,
    credits,
  });
}
