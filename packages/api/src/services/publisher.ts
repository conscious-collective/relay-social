/**
 * Publisher Service
 * Handles publishing posts to social platforms
 */

import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { posts, accounts } from "../db/schema.js";
import { InstagramAdapter } from "../adapters/instagram.js";
import { PlatformAdapter } from "../adapters/base.js";

export class PublisherService {
  /**
   * Publish a post by ID
   */
  static async publishPost(postId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Get post
      const [post] = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);

      if (!post) {
        return { success: false, error: "Post not found" };
      }

      if (post.status === "published") {
        return { success: false, error: "Post already published" };
      }

      // Get account
      const [account] = await db
        .select()
        .from(accounts)
        .where(eq(accounts.id, post.accountId))
        .limit(1);

      if (!account) {
        return { success: false, error: "Account not found" };
      }

      // Update status to publishing
      await db
        .update(posts)
        .set({ status: "publishing", updatedAt: new Date() })
        .where(eq(posts.id, postId));

      // Get platform adapter
      const adapter = this.getAdapter(account);

      if (!adapter) {
        await db
          .update(posts)
          .set({
            status: "failed",
            errorMessage: `Unsupported platform: ${account.platform}`,
            updatedAt: new Date(),
          })
          .where(eq(posts.id, postId));

        return {
          success: false,
          error: `Unsupported platform: ${account.platform}`,
        };
      }

      // Validate credentials
      const isValid = await adapter.validate();
      if (!isValid) {
        await db
          .update(posts)
          .set({
            status: "failed",
            errorMessage: "Invalid credentials",
            updatedAt: new Date(),
          })
          .where(eq(posts.id, postId));

        return { success: false, error: "Invalid account credentials" };
      }

      // Publish
      const result = await adapter.publish({
        content: post.content,
        mediaUrls: post.mediaUrls || [],
        scheduledAt: post.scheduledAt || undefined,
      });

      if (result.success) {
        await db
          .update(posts)
          .set({
            status: "published",
            platformPostId: result.platformPostId,
            publishedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(posts.id, postId));

        return { success: true };
      } else {
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
      await db
        .update(posts)
        .set({
          status: "failed",
          errorMessage: error.message,
          updatedAt: new Date(),
        })
        .where(eq(posts.id, postId))
        .catch(() => {}); // Ignore if this fails

      return { success: false, error: error.message };
    }
  }

  /**
   * Get the appropriate platform adapter
   */
  private static getAdapter(account: typeof accounts.$inferSelect): PlatformAdapter | null {
    switch (account.platform.toLowerCase()) {
      case "instagram":
        // For Instagram, we need the user ID from metadata
        // For MVP, we'll use platform_id as userId
        return new InstagramAdapter({
          userId: account.platformId,
          accessToken: account.accessToken,
          refreshToken: account.refreshToken || undefined,
        });

      // Add more platforms here
      // case "twitter":
      //   return new TwitterAdapter({ ... });

      default:
        return null;
    }
  }
}
