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
  features: string[];
  limits: {
    accounts: number;
    postsPerMonth: number;
    webhooks: number;
  };
}

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    interval: "month",
    features: [
      "1 Instagram account",
      "10 posts per month",
      "Basic scheduling",
      "Community support",
    ],
    limits: {
      accounts: 1,
      postsPerMonth: 10,
      webhooks: 2,
    },
  },
  {
    id: "pro",
    name: "Pro",
    price: 19,
    interval: "month",
    features: [
      "Unlimited accounts",
      "Unlimited posts",
      "Priority support",
      "Advanced analytics",
      "Webhooks",
      "API access",
    ],
    limits: {
      accounts: -1, // unlimited
      postsPerMonth: -1, // unlimited
      webhooks: -1, // unlimited
    },
  },
];

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  
  let currentTier = "free";
  if (user) {
    const [userData] = await db
      .select({ tier: users.tier })
      .from(users)
      .where(eq(users.id, user.userId))
      .limit(1);
    currentTier = userData?.tier || "free";
  }

  return NextResponse.json({
    plans: PLANS,
    currentTier,
  });
}
