/**
 * Webhook Service
 * Handles outbound webhook delivery for events
 */

import { db } from "@/app/db";
import { webhooks, webhookDeliveries } from "@/app/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export type WebhookEvent =
  | "post.published"
  | "post.failed"
  | "account.connected"
  | "account.expired";

interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: any;
}

/**
 * Trigger webhooks for a specific event
 */
export async function triggerWebhook(
  userId: string,
  event: WebhookEvent,
  data: any
) {
  // Find all enabled webhooks for this user that listen to this event
  const userWebhooks = await db
    .select()
    .from(webhooks)
    .where(eq(webhooks.userId, userId));

  const relevantWebhooks = userWebhooks.filter(
    (wh) => wh.enabled === 1 && (wh.events as string[]).includes(event)
  );

  if (relevantWebhooks.length === 0) {
    console.log(`No webhooks configured for event: ${event}`);
    return;
  }

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };

  // Deliver to all relevant webhooks
  for (const webhook of relevantWebhooks) {
    await deliverWebhook(webhook.id, webhook.url, webhook.secret, payload);
  }
}

/**
 * Deliver a single webhook
 */
async function deliverWebhook(
  webhookId: string,
  url: string,
  secret: string,
  payload: WebhookPayload
) {
  const deliveryId = `whd_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  // Create delivery record
  await db.insert(webhookDeliveries).values({
    id: deliveryId,
    webhookId,
    event: payload.event,
    payload: payload as any,
    status: "pending",
    attempts: 0,
    createdAt: new Date(),
  });

  // Attempt delivery
  try {
    const body = JSON.stringify(payload);
    const signature = generateSignature(body, secret);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Relay-Signature": signature,
        "X-Relay-Event": payload.event,
        "User-Agent": "Relay-Social-Webhook/1.0",
      },
      body,
    });

    if (response.ok) {
      // Success
      await db
        .update(webhookDeliveries)
        .set({
          status: "delivered",
          attempts: 1,
          lastAttemptAt: new Date(),
          deliveredAt: new Date(),
        })
        .where(eq(webhookDeliveries.id, deliveryId));
    } else {
      // HTTP error
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
  } catch (error: any) {
    // Delivery failed
    await db
      .update(webhookDeliveries)
      .set({
        status: "failed",
        attempts: 1,
        lastAttemptAt: new Date(),
        errorMessage: error.message,
      })
      .where(eq(webhookDeliveries.id, deliveryId));

    console.error(`Webhook delivery failed (${deliveryId}):`, error);
  }
}

/**
 * Generate HMAC signature for webhook payload
 */
function generateSignature(body: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

/**
 * Verify webhook signature (for inbound webhooks from other services)
 */
export function verifySignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = generateSignature(body, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
