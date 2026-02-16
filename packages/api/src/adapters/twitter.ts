import type { PlatformAdapter, PostContent, PublishResult, AnalyticsData } from "./types.js";

export class TwitterAdapter implements PlatformAdapter {
  platform = "twitter" as const;

  async publishPost(accessToken: string, platformId: string, content: PostContent): Promise<PublishResult> {
    try {
      let mediaIds: string[] = [];

      // Upload media if any
      if (content.mediaUrls.length > 0) {
        for (const mediaUrl of content.mediaUrls.slice(0, 4)) { // Twitter allows max 4 images
          const mediaId = await this.uploadMedia(accessToken, mediaUrl);
          if (mediaId) {
            mediaIds.push(mediaId);
          }
        }
      }

      // Create tweet
      const tweetPayload: any = {
        text: content.text,
      };

      if (mediaIds.length > 0) {
        tweetPayload.media = { media_ids: mediaIds };
      }

      const response = await fetch("https://api.twitter.com/2/tweets", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(tweetPayload),
      });

      const data = await response.json();

      if (!data.data?.id) {
        return { 
          success: false, 
          error: data.errors?.[0]?.detail || data.detail || "Failed to create tweet" 
        };
      }

      return {
        success: true,
        platformPostId: data.data.id,
        publishedAt: new Date(),
      };

    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async uploadMedia(accessToken: string, mediaUrl: string): Promise<string | null> {
    try {
      // First, fetch the media file
      const mediaResponse = await fetch(mediaUrl);
      if (!mediaResponse.ok) {
        console.error(`Failed to fetch media from ${mediaUrl}`);
        return null;
      }

      const mediaBuffer = await mediaResponse.arrayBuffer();
      const mediaType = mediaResponse.headers.get("content-type") || "image/jpeg";

      // Upload to Twitter
      const uploadResponse = await fetch("https://upload.twitter.com/1.1/media/upload.json", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/octet-stream",
        },
        body: mediaBuffer,
      });

      const uploadData = await uploadResponse.json();

      if (!uploadData.media_id_string) {
        console.error("Failed to upload media to Twitter:", uploadData);
        return null;
      }

      return uploadData.media_id_string;

    } catch (error) {
      console.error("Error uploading media:", error);
      return null;
    }
  }

  async getAnalytics(accessToken: string, platformPostId: string): Promise<AnalyticsData | null> {
    try {
      // Twitter API v2 doesn't provide engagement metrics for free tier
      // For basic tier ($100/mo), you'd use the tweets/:id endpoint with tweet.fields
      const response = await fetch(
        `https://api.twitter.com/2/tweets/${platformPostId}?tweet.fields=public_metrics`,
        {
          headers: {
            "Authorization": `Bearer ${accessToken}`,
          },
        }
      );

      const data = await response.json();

      if (!data.data?.public_metrics) {
        return null;
      }

      const metrics = data.data.public_metrics;

      return {
        impressions: metrics.impression_count || 0,
        reach: metrics.impression_count || 0, // Twitter doesn't separate reach/impressions in public metrics
        likes: metrics.like_count || 0,
        comments: metrics.reply_count || 0,
        shares: metrics.retweet_count || 0,
        saves: metrics.bookmark_count || 0,
        clicks: 0, // Not available in public metrics
      };

    } catch (error) {
      console.error("Failed to fetch Twitter analytics:", error);
      return null;
    }
  }

  async validateToken(accessToken: string, platformId: string): Promise<boolean> {
    try {
      const response = await fetch("https://api.twitter.com/2/users/me", {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      });
      
      const data = await response.json();
      return !!data.data?.id && !data.errors;
    } catch {
      return false;
    }
  }
}