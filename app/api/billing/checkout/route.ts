export const runtime = 'edge';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/db";
import { users } from "@/app/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth-helpers";
import { PLANS } from "../plans/route";

/**
 * POST /api/billing/checkout
 * Creates a checkout session for upgrading to Pro
 * 
 * For MVP: Returns a mock checkout URL
 * Later: Integrate with Stripe/DoDo
 */
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { planId } = await req.json();
  const plan = PLANS.find((p) => p.id === planId);

  if (!plan) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  if (plan.id === "free") {
    return NextResponse.json({ error: "Cannot checkout for free plan" }, { status: 400 });
  }

  // For MVP: Simulate checkout
  // Later: Create actual Stripe/DoDo checkout session
  const checkoutId = `checkout_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  
  // In production, this would create a real checkout session
  const checkoutUrl = `/billing/success?checkout_id=${checkoutId}&plan=${planId}`;

  return NextResponse.json({
    checkoutId,
    checkoutUrl,
    plan: {
      id: plan.id,
      name: plan.name,
      price: plan.price,
      interval: plan.interval,
    },
    // Mock payment link for testing
    paymentUrl: `${process.env.NEXT_PUBLIC_APP_URL}${checkoutUrl}`,
  });
}

/**
 * GET /api/billing/checkout
 * Get checkout status or complete checkout (for MVP mock flow)
 */
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const checkoutId = searchParams.get("checkout_id");
  const action = searchParams.get("action");

  // Complete checkout (MVP mock flow)
  if (action === "complete" && checkoutId) {
    await db
      .update(users)
      .set({ tier: "pro", updatedAt: new Date() })
      .where(eq(users.id, user.userId));

    return NextResponse.json({
      success: true,
      tier: "pro",
      message: "Upgraded to Pro!",
    });
  }

  // Get current subscription status
  const [userData] = await db
    .select({
      tier: users.tier,
      dodoCustomerId: users.dodoCustomerId,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, user.userId))
    .limit(1);

  return NextResponse.json({
    tier: userData?.tier || "free",
    customerId: userData?.dodoCustomerId,
    currentPeriodEnd: userData?.updatedAt,
  });
}
