export const runtime = 'edge';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/db";
import { users } from "@/app/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth-helpers";

export interface Plan {
  id: string;
  name: string;
  price: number;
  interval: "month" | "year";
  credits: number;
  features: string[];
  limits: {
    accounts: number;
    postsPerWeek: number;
    webhooks: number;
  };
}

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    interval: "month",
    credits: 0,
    features: [
      "1 Instagram account",
      "10 posts per week",
      "Basic scheduling",
      "Community support",
    ],
    limits: {
      accounts: 1,
      postsPerWeek: 10,
      webhooks: 2,
    },
  },
  {
    id: "pro",
    name: "Pro",
    price: 5,
    interval: "month",
    credits: 1000,
    features: [
      "Unlimited Instagram accounts",
      "1000 post credits",
      "Priority support",
      "Advanced analytics",
      "Webhooks",
      "API access",
    ],
    limits: {
      accounts: -1, // unlimited
      postsPerWeek: -1, // unlimited (uses credits)
      webhooks: -1, // unlimited
    },
  },
];

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
