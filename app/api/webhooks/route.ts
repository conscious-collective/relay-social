export const runtime = 'edge';
import { db } from "@/app/db";
import { webhooks } from "@/app/db/schema";
import { eq } from "drizzle-orm";

// GET /api/webhooks - List all webhooks for user
// POST /api/webhooks - Create a new webhook

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId query parameter is required" },
        { status: 400 }
      );
    }

    const userWebhooks = await db
      .select({
        id: webhooks.id,
        url: webhooks.url,
        events: webhooks.events,
        enabled: webhooks.enabled,
        createdAt: webhooks.createdAt,
      })
      .from(webhooks)
      .where(eq(webhooks.userId, userId));

    return NextResponse.json({ webhooks: userWebhooks });
  } catch (error: any) {
    console.error("List webhooks error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 }
      );
    }

    const { url, events, userId } = await req.json();

    if (!url || !events || !userId) {
      return NextResponse.json(
        { error: "url, events, and userId are required" },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // Validate events
    const validEvents = [
      "post.published",
      "post.failed",
      "account.connected",
      "account.expired",
    ];
    for (const event of events) {
      if (!validEvents.includes(event)) {
        return NextResponse.json(
          {
            error: `Invalid event: ${event}. Valid events: ${validEvents.join(", ")}`,
          },
          { status: 400 }
        );
      }
    }

    // Generate secret using Web Crypto API (Cloudflare compatible)
    const secret = await generateRandomSecret();

    const [webhook] = await db
      .insert(webhooks)
      .values({
        id: `wh_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        userId,
        url,
        events: events as any,
        secret,
        enabled: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json(
      {
        id: webhook.id,
        url: webhook.url,
        events: webhook.events,
        secret: webhook.secret, // Only returned on creation!
        enabled: webhook.enabled === 1,
        createdAt: webhook.createdAt,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Create webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

// Web Crypto API helper for Cloudflare compatibility
async function generateRandomSecret(): Promise<string> {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
