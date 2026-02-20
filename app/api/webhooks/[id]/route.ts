import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/db";
import { webhooks } from "@/app/db/schema";
import { eq } from "drizzle-orm";

// GET /api/webhooks/[id] - Get webhook details
// PUT /api/webhooks/[id] - Update webhook (toggle enabled)
// DELETE /api/webhooks/[id] - Delete webhook

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 }
      );
    }

    const [webhook] = await db
      .select({
        id: webhooks.id,
        url: webhooks.url,
        events: webhooks.events,
        enabled: webhooks.enabled,
        createdAt: webhooks.createdAt,
      })
      .from(webhooks)
      .where(eq(webhooks.id, id))
      .limit(1);

    if (!webhook) {
      return NextResponse.json(
        { error: "Webhook not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(webhook);
  } catch (error: any) {
    console.error("Get webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 }
      );
    }

    const { enabled } = await req.json();

    // Check if webhook exists
    const [existing] = await db
      .select()
      .from(webhooks)
      .where(eq(webhooks.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Webhook not found" },
        { status: 404 }
      );
    }

    // Update webhook
    const [webhook] = await db
      .update(webhooks)
      .set({
        enabled: enabled ? 1 : 0,
        updatedAt: new Date(),
      })
      .where(eq(webhooks.id, id))
      .returning();

    return NextResponse.json({
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      enabled: webhook.enabled === 1,
    });
  } catch (error: any) {
    console.error("Update webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 }
      );
    }

    // Check if webhook exists
    const [existing] = await db
      .select()
      .from(webhooks)
      .where(eq(webhooks.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Webhook not found" },
        { status: 404 }
      );
    }

    // Delete webhook
    await db.delete(webhooks).where(eq(webhooks.id, id));

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error("Delete webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
