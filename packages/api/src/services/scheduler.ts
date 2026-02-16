/**
 * Scheduler Service
 * Checks for scheduled posts and publishes them when due
 * 
 * MVP: Simple interval-based checker
 * Production: Upgrade to BullMQ for robustness
 */

import { lte, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { posts } from "../db/schema.js";
import { PublisherService } from "./publisher.js";

export class SchedulerService {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private checkIntervalMs = 60 * 1000; // Check every minute

  /**
   * Start the scheduler
   */
  start() {
    if (this.isRunning) {
      console.log("⏰ Scheduler already running");
      return;
    }

    console.log("⏰ Scheduler started (checking every 60s)");
    this.isRunning = true;

    // Run immediately, then on interval
    this.checkScheduledPosts();

    this.intervalId = setInterval(() => {
      this.checkScheduledPosts();
    }, this.checkIntervalMs);
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log("⏰ Scheduler stopped");
  }

  /**
   * Check for posts that are due and publish them
   */
  private async checkScheduledPosts() {
    try {
      const now = new Date();

      // Find all scheduled posts that are due
      const duePosts = await db
        .select()
        .from(posts)
        .where(eq(posts.status, "scheduled"))
        .all();

      // Filter by scheduledAt in JS (Drizzle WHERE with lte/Date comparison can be tricky)
      const readyToPublish = duePosts.filter(
        (post) => post.scheduledAt && new Date(post.scheduledAt) <= now
      );

      if (readyToPublish.length > 0) {
        console.log(`📮 Publishing ${readyToPublish.length} scheduled post(s)...`);

        for (const post of readyToPublish) {
          console.log(`  → Publishing post ${post.id}...`);
          const result = await PublisherService.publishPost(post.id);

          if (result.success) {
            console.log(`    ✅ Published successfully`);
          } else {
            console.log(`    ❌ Failed: ${result.error}`);
          }
        }
      }
    } catch (error) {
      console.error("❌ Scheduler error:", error);
    }
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      running: this.isRunning,
      checkIntervalMs: this.checkIntervalMs,
    };
  }
}

// Singleton instance
export const scheduler = new SchedulerService();
