import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { posts, accounts, analytics } from "../db/schema.js";
import { getAdapter } from "../adapters/index.js";
import type { PostContent } from "../adapters/types.js";

export class PublisherService {
  /**
   * Publish a single post immediately
   */
  async publishPost(postId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get post and account details
      const [post] = await db
        .select({
          post: posts,
          account: accounts,
        })
        .from(posts)
        .innerJoin(accounts, eq(posts.accountId, accounts.id))
        .where(eq(posts.id, postId))
        .limit(1);

      if (!post) {
        return { success: false, error: "Post not found" };
      }

      if (post.post.status === "published") {
        return { success: false, error: "Post already published" };
      }

      // Get platform adapter
      const adapter = getAdapter(post.account.platform);
      if (!adapter) {
        return { success: false, error: `No adapter for platform: ${post.account.platform}` };
      }

      // Prepare content
      const content: PostContent = {
        text: post.post.content,
        mediaUrls: (post.post.mediaUrls as string[]) || [],
        metadata: post.post.metadata as Record<string, any>,
      };

      // Update status to publishing
      await db
        .update(posts)
        .set({ 
          status: "publishing",
          updatedAt: new Date(),
        })
        .where(eq(posts.id, postId));

      // Publish via adapter
      const result = await adapter.publishPost(
        post.account.accessToken,
        post.account.platformId,
        content
      );

      if (result.success) {
        // Update post as published
        await db
          .update(posts)
          .set({
            status: "published",
            platformPostId: result.platformPostId,
            publishedAt: result.publishedAt || new Date(),
            errorMessage: null,
            updatedAt: new Date(),
          })
          .where(eq(posts.id, postId));

        return { success: true };
      } else {
        // Update post as failed
        await db
          .update(posts)
          .set({
            status: "failed",
            errorMessage: result.error,
            updatedAt: new Date(),
          })
          .where(eq(posts.id, postId));

        return { success: false, error: result.error };
      }

    } catch (error: any) {
      // Update post as failed
      await db
        .update(posts)
        .set({
          status: "failed",
          errorMessage: error.message,
          updatedAt: new Date(),
        })
        .where(eq(posts.id, postId));

      return { success: false, error: error.message };
    }
  }

  /**
   * Publish all posts that are scheduled for now or earlier
   */
  async publishScheduledPosts(): Promise<{ published: number; failed: number }> {
    const now = new Date();
    
    // Get all posts scheduled for publication
    const scheduledPosts = await db
      .select({ id: posts.id })
      .from(posts)
      .where(
        eq(posts.status, "scheduled")
      )
      .execute();

    let published = 0;
    let failed = 0;

    for (const post of scheduledPosts) {
      const result = await this.publishPost(post.id);
      if (result.success) {
        published++;
      } else {
        failed++;
      }
    }

    return { published, failed };
  }

  /**
   * Fetch analytics for published posts
   */
  async fetchAnalytics(postId?: string): Promise<void> {
    const query = db
      .select({
        postId: posts.id,
        platformPostId: posts.platformPostId,
        platform: accounts.platform,
        accessToken: accounts.accessToken,
        platformId: accounts.platformId,
      })
      .from(posts)
      .innerJoin(accounts, eq(posts.accountId, accounts.id))
      .where(eq(posts.status, "published"));

    if (postId) {
      query.where(eq(posts.id, postId));
    }

    const publishedPosts = await query.execute();

    for (const post of publishedPosts) {
      if (!post.platformPostId) continue;

      const adapter = getAdapter(post.platform);
      if (!adapter) continue;

      try {
        const analyticsData = await adapter.getAnalytics(
          post.accessToken,
          post.platformPostId
        );

        if (analyticsData) {
          // Upsert analytics data
          await db
            .insert(analytics)
            .values({
              id: `analytics_${post.postId}`,
              postId: post.postId,
              ...analyticsData,
              fetchedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: analytics.postId,
              set: {
                ...analyticsData,
                fetchedAt: new Date(),
              },
            })
            .execute();
        }
      } catch (error) {
        console.error(`Failed to fetch analytics for post ${post.postId}:`, error);
      }
    }
  }

  /**
   * Validate all account tokens and refresh if needed
   */
  async validateTokens(): Promise<{ valid: number; invalid: number; refreshed: number }> {
    const allAccounts = await db.select().from(accounts).execute();

    let valid = 0;
    let invalid = 0;
    let refreshed = 0;

    for (const account of allAccounts) {
      const adapter = getAdapter(account.platform);
      if (!adapter) continue;

      const isValid = await adapter.validateToken(account.accessToken, account.platformId);

      if (isValid) {
        valid++;
      } else {
        // Try to refresh token if we have a refresh token
        if (account.refreshToken) {
          // TODO: Implement token refresh logic per platform
          // For now, just mark as invalid
          invalid++;
        } else {
          invalid++;
        }
      }
    }

    return { valid, invalid, refreshed };
  }
}