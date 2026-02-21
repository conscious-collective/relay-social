export const runtime = 'edge';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/db";
import { users } from "@/app/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth-helpers";
import { PLANS } from "@/lib/plans";

// Initialize DoDo Payments client
function getDodoClient() {
  const DodoPayments = require("dodopayments");
  return new DodoPayments({
    bearerToken: process.env.DODO_PAYMENTS_API_KEY,
    environment: process.env.NODE_ENV === "production" ? "live_mode" : "test_mode",
  });
}

/**
 * POST /api/billing/checkout
 * Creates a checkout session for upgrading to Pro
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

  try {
    const dodo = getDodoClient();
    
    // Get or create customer
    const [userData] = await db
      .select({ email: users.email, dodoCustomerId: users.dodoCustomerId })
      .from(users)
      .where(eq(users.id, user.userId))
      .limit(1);

    let customerId = userData?.dodoCustomerId;

    // Create customer if doesn't exist
    if (!customerId) {
      const customer = await dodo.customers.create({
        email: userData?.email,
        metadata: {
          user_id: user.userId,
        },
      });
      customerId = customer.customer_id;

      // Save customer ID
      await db
        .update(users)
        .set({ dodoCustomerId: customerId })
        .where(eq(users.id, user.userId));
    }

    // Create checkout session for Pro plan
    const checkoutSession = await dodo.checkoutSessions.create({
      customer_id: customerId,
      product_cart: [
        {
          product_id: process.env.DODO_PRO_PRODUCT_ID || "prod_pro_monthly",
          quantity: 1,
        },
      ],
      metadata: {
        user_id: user.userId,
        plan: "pro",
        credits: plan.credits,
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing/success?checkout_id={checkout_id}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?cancelled=true`,
    });

    return NextResponse.json({
      checkoutId: checkoutSession.session_id,
      checkoutUrl: checkoutSession.url,
    });
  } catch (error: any) {
    console.error("DoDo checkout error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create checkout" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/billing/checkout
 * Get checkout status or handle webhook
 */
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const checkoutId = searchParams.get("checkout_id");
  const action = searchParams.get("action");

  // Complete checkout (after redirect from DoDo)
  if (action === "complete" && checkoutId) {
    try {
      const dodo = getDodoClient();
      
      // Verify checkout was successful
      const checkout = await dodo.checkoutSessions.retrieve({
        checkout_session_id: checkoutId,
      });
      
      if (checkout.status === "completed") {
        // Get credits from metadata
        const credits = checkout.metadata?.credits || 1000;
        
        // Update user to Pro with credits
        await db
          .update(users)
          .set({ 
            tier: "pro", 
            credits: credits,
            updatedAt: new Date() 
          })
          .where(eq(users.id, user.userId));

        return NextResponse.json({
          success: true,
          tier: "pro",
          credits,
          message: "Upgraded to Pro!",
        });
      } else {
        return NextResponse.json(
          { error: "Checkout not completed" },
          { status: 400 }
        );
      }
    } catch (error: any) {
      console.error("Complete checkout error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to complete checkout" },
        { status: 500 }
      );
    }
  }

  // Get current subscription status
  const [userData] = await db
    .select({
      tier: users.tier,
      credits: users.credits,
      dodoCustomerId: users.dodoCustomerId,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, user.userId))
    .limit(1);

  return NextResponse.json({
    tier: userData?.tier || "free",
    credits: userData?.credits || 0,
    customerId: userData?.dodoCustomerId,
    currentPeriodEnd: userData?.updatedAt,
  });
}
