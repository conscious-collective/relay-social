import { Queue, Worker } from "bullmq";
import { Redis } from "ioredis";
import { PublisherService } from "./publisher.js";

// Redis connection config for BullMQ
const redisConfig = {
  host: "localhost",
  port: 6379,
  maxRetriesPerRequest: null,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
};

// Parse Redis URL if provided
if (process.env.REDIS_URL) {
  try {
    const url = new URL(process.env.REDIS_URL);
    redisConfig.host = url.hostname;
    redisConfig.port = parseInt(url.port) || 6379;
  } catch (e) {
    console.warn("Invalid REDIS_URL, using localhost:6379");
  }
}

// Create job queue (will throw if Redis unavailable)
export let publishQueue: Queue | null = null;
export let worker: Worker | null = null;

try {
  publishQueue = new Queue("publish-posts", {
    connection: redisConfig,
    defaultJobOptions: {
      removeOnComplete: 100, // Keep last 100 completed jobs
      removeOnFail: 50,     // Keep last 50 failed jobs
      attempts: 3,          // Retry up to 3 times
      backoff: {
        type: "exponential",
        delay: 2000,        // Start with 2 second delay, exponentially increase
      },
    },
  });
} catch (error) {
  console.log("Redis unavailable - scheduler disabled");
}

export class SchedulerService {
  private publisher = new PublisherService();

  /**
   * Schedule a post for future publication
   */
  async schedulePost(postId: string, scheduledAt: Date): Promise<void> {
    if (!publishQueue) {
      // Fall back to immediate publishing if Redis unavailable
      console.log("⚠️ Redis unavailable - publishing immediately instead of scheduling");
      await this.publisher.publishPost(postId);
      return;
    }

    const delay = scheduledAt.getTime() - Date.now();
    
    if (delay <= 0) {
      // Publish immediately if scheduled time is in the past
      await this.publisher.publishPost(postId);
      return;
    }

    await publishQueue.add(
      "publish-post",
      { postId },
      {
        delay,
        jobId: `post-${postId}`, // Prevent duplicate jobs for same post
      }
    );
  }

  /**
   * Cancel a scheduled post
   */
  async cancelScheduledPost(postId: string): Promise<boolean> {
    if (!publishQueue) return false;
    
    try {
      const job = await publishQueue.getJob(`post-${postId}`);
      if (job) {
        await job.remove();
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Failed to cancel scheduled post ${postId}:`, error);
      return false;
    }
  }

  /**
   * Reschedule a post
   */
  async reschedulePost(postId: string, newScheduledAt: Date): Promise<void> {
    await this.cancelScheduledPost(postId);
    await this.schedulePost(postId, newScheduledAt);
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    if (!publishQueue) {
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        enabled: false,
      };
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      publishQueue.getWaiting(),
      publishQueue.getActive(),
      publishQueue.getCompleted(),
      publishQueue.getFailed(),
      publishQueue.getDelayed(),
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
      enabled: true,
    };
  }

  /**
   * Schedule periodic analytics fetching
   */
  async scheduleAnalyticsFetching(): Promise<void> {
    if (!publishQueue) throw new Error("Redis required for background jobs");
    
    await publishQueue.add(
      "fetch-analytics",
      {},
      {
        repeat: { 
          pattern: "0 */6 * * *", // Every 6 hours
        },
        jobId: "periodic-analytics-fetch",
      }
    );
  }

  /**
   * Schedule periodic token validation
   */
  async scheduleTokenValidation(): Promise<void> {
    if (!publishQueue) throw new Error("Redis required for background jobs");
    
    await publishQueue.add(
      "validate-tokens",
      {},
      {
        repeat: {
          pattern: "0 0 * * *", // Daily at midnight
        },
        jobId: "periodic-token-validation",
      }
    );
  }
}

// Background worker to process jobs (only if Redis available)
if (publishQueue) {
  try {
    worker = new Worker(
      "publish-posts",
      async (job) => {
        const publisher = new PublisherService();

        switch (job.name) {
          case "publish-post":
            const { postId } = job.data;
            const result = await publisher.publishPost(postId);
            
            if (!result.success) {
              throw new Error(result.error || "Failed to publish post");
            }
            
            return result;

          case "fetch-analytics":
            await publisher.fetchAnalytics();
            return { message: "Analytics fetched successfully" };

          case "validate-tokens":
            const tokenResult = await publisher.validateTokens();
            return tokenResult;

          default:
            throw new Error(`Unknown job type: ${job.name}`);
        }
      },
      {
        connection: redisConfig,
        concurrency: 5, // Process up to 5 jobs concurrently
      }
    );

    // Worker event handlers
    worker.on("completed", (job) => {
      console.log(`✅ Job ${job.id} completed successfully`);
    });

    worker.on("failed", (job, err) => {
      console.error(`❌ Job ${job?.id} failed:`, err.message);
    });

    worker.on("error", (err) => {
      console.error("🚨 Worker error:", err);
    });

    // Graceful shutdown
    process.on("SIGINT", async () => {
      console.log("🛑 Shutting down worker...");
      if (worker) await worker.close();
      process.exit(0);
    });
  } catch (error) {
    console.log("Worker creation failed - continuing without background processing");
  }
}