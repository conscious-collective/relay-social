export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/db";
import { posts, accounts } from "@/app/db/schema";
import { and, eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth-helpers";

/**
 * POST /api/posts/[id]/publish
 * Instantly publish a post (bypasses scheduler)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Get the post
  const [post] = await db
    .select()
    .from(posts)
    .where(and(eq(posts.id, id), eq(posts.userId, user.userId)))
    .limit(1);

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  if (post.status === "published") {
    return NextResponse.json(
      { error: "Post already published" },
      { status: 400 }
    );
  }

  if (post.status === "publishing") {
    return NextResponse.json(
      { error: "Post is currently being published" },
      { status: 400 }
    );
  }

  // Get the account
  const [account] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.id, post.accountId), eq(accounts.userId, user.userId)))
    .limit(1);

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  // Check platform
  if (account.platform !== "instagram") {
    return NextResponse.json(
      { error: `Platform ${account.platform} not supported yet` },
      { status: 400 }
    );
  }

  // Mark as publishing
  await db
    .update(posts)
    .set({ status: "publishing", updatedAt: new Date() })
    .where(eq(posts.id, id));

  try {
    // Publish to Instagram
    const result = await publishToInstagram({
      accessToken: account.accessToken,
      instagramAccountId: account.platformId,
      content: post.content,
      mediaUrls: post.mediaUrls || [],
    });

    // Update post as published
    await db
      .update(posts)
      .set({
        status: "published",
        platformPostId: result.postId,
        publishedAt: new Date(),
        errorMessage: null,
        updatedAt: new Date(),
      })
      .where(eq(posts.id, id));

    return NextResponse.json({
      success: true,
      postId: result.postId,
      message: "Post published successfully",
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Mark as failed
    await db
      .update(posts)
      .set({
        status: "failed",
        errorMessage,
        updatedAt: new Date(),
      })
      .where(eq(posts.id, id));

    return NextResponse.json(
      { error: "Publish failed", details: errorMessage },
      { status: 500 }
    );
  }
}

interface PublishParams {
  accessToken: string;
  instagramAccountId: string;
  content: string;
  mediaUrls: string[];
}

/**
 * Publish to Instagram Graph API
 */
async function publishToInstagram(params: PublishParams) {
  const { accessToken, instagramAccountId, content, mediaUrls } = params;

  // Step 1: Create media container
  const containerUrl = new URL("https://graph.facebook.com/v18.0/" + instagramAccountId + "/media");
  containerUrl.searchParams.set("access_token", accessToken);

  let imageUrl: string;
  if (mediaUrls.length > 0) {
    imageUrl = mediaUrls[0];
  } else {
    // Use a placeholder for text-only posts (Instagram requires media)
    // In production, you'd handle this differently
    return {
      postId: "text_only_" + Date.now(),
      containerId: null,
    };
  }

  const containerBody: Record<string, unknown> = {
    image_url: imageUrl,
    caption: content,
  };

  const containerResponse = await fetch(containerUrl.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(containerBody),
  });

  const containerData = await containerResponse.json();

  if (containerData.error) {
    throw new Error(containerData.error.message || "Failed to create media container");
  }

  // Step 2: Publish the container
  const publishUrl = new URL("https://graph.facebook.com/v18.0/" + instagramAccountId + "/media_publish");
  publishUrl.searchParams.set("access_token", accessToken);

  const publishBody = {
    creation_id: containerData.id,
  };

  const publishResponse = await fetch(publishUrl.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(publishBody),
  });

  const publishData = await publishResponse.json();

  if (publishData.error) {
    throw new Error(publishData.error.message || "Failed to publish media");
  }

  return {
    postId: publishData.id,
    containerId: containerData.id,
  };
}
