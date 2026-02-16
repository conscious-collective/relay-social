/**
 * Instagram Platform Adapter
 * Uses Meta Graph API for Instagram Business/Creator accounts
 * 
 * Docs: https://developers.facebook.com/docs/instagram-api/guides/content-publishing
 */

import { PlatformAdapter, PublishResult, PostData } from "./base.js";

interface InstagramConfig {
  userId: string; // Instagram Business/Creator account ID
  accessToken: string;
  refreshToken?: string;
}

interface MediaContainerResponse {
  id: string;
}

interface PublishResponse {
  id: string;
}

export class InstagramAdapter extends PlatformAdapter {
  private userId: string;
  private baseUrl = "https://graph.facebook.com/v21.0";

  constructor(config: InstagramConfig) {
    super(config.accessToken, config.refreshToken);
    this.userId = config.userId;
  }

  /**
   * Publish a post to Instagram
   */
  async publish(data: PostData): Promise<PublishResult> {
    try {
      // For MVP: support single image posts
      if (data.mediaUrls.length === 0) {
        return {
          success: false,
          error: "Instagram requires at least one media item",
        };
      }

      if (data.mediaUrls.length === 1) {
        return await this.publishSingleMedia(data);
      } else {
        return await this.publishCarousel(data);
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Unknown error publishing to Instagram",
      };
    }
  }

  /**
   * Publish single image/video post
   */
  private async publishSingleMedia(data: PostData): Promise<PublishResult> {
    const mediaUrl = data.mediaUrls[0];
    const isVideo = this.isVideoUrl(mediaUrl);

    // Step 1: Create media container
    const containerParams = new URLSearchParams({
      [isVideo ? "video_url" : "image_url"]: mediaUrl,
      caption: data.content,
      access_token: this.accessToken,
    });

    const containerResponse = await fetch(
      `${this.baseUrl}/${this.userId}/media?${containerParams}`,
      { method: "POST" }
    );

    if (!containerResponse.ok) {
      const error = await containerResponse.json();
      return {
        success: false,
        error: `Failed to create container: ${JSON.stringify(error)}`,
      };
    }

    const container: MediaContainerResponse = await containerResponse.json();

    // Step 2: Publish container
    const publishParams = new URLSearchParams({
      creation_id: container.id,
      access_token: this.accessToken,
    });

    const publishResponse = await fetch(
      `${this.baseUrl}/${this.userId}/media_publish?${publishParams}`,
      { method: "POST" }
    );

    if (!publishResponse.ok) {
      const error = await publishResponse.json();
      return {
        success: false,
        error: `Failed to publish: ${JSON.stringify(error)}`,
      };
    }

    const published: PublishResponse = await publishResponse.json();

    return {
      success: true,
      platformPostId: published.id,
    };
  }

  /**
   * Publish carousel (multiple images)
   */
  private async publishCarousel(data: PostData): Promise<PublishResult> {
    // Step 1: Create item containers
    const itemContainers: string[] = [];

    for (const url of data.mediaUrls) {
      const isVideo = this.isVideoUrl(url);
      const params = new URLSearchParams({
        [isVideo ? "video_url" : "image_url"]: url,
        is_carousel_item: "true",
        access_token: this.accessToken,
      });

      const response = await fetch(
        `${this.baseUrl}/${this.userId}/media?${params}`,
        { method: "POST" }
      );

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: `Failed to create carousel item: ${JSON.stringify(error)}`,
        };
      }

      const item: MediaContainerResponse = await response.json();
      itemContainers.push(item.id);
    }

    // Step 2: Create carousel container
    const carouselParams = new URLSearchParams({
      media_type: "CAROUSEL",
      children: itemContainers.join(","),
      caption: data.content,
      access_token: this.accessToken,
    });

    const carouselResponse = await fetch(
      `${this.baseUrl}/${this.userId}/media?${carouselParams}`,
      { method: "POST" }
    );

    if (!carouselResponse.ok) {
      const error = await carouselResponse.json();
      return {
        success: false,
        error: `Failed to create carousel: ${JSON.stringify(error)}`,
      };
    }

    const carousel: MediaContainerResponse = await carouselResponse.json();

    // Step 3: Publish carousel
    const publishParams = new URLSearchParams({
      creation_id: carousel.id,
      access_token: this.accessToken,
    });

    const publishResponse = await fetch(
      `${this.baseUrl}/${this.userId}/media_publish?${publishParams}`,
      { method: "POST" }
    );

    if (!publishResponse.ok) {
      const error = await publishResponse.json();
      return {
        success: false,
        error: `Failed to publish carousel: ${JSON.stringify(error)}`,
      };
    }

    const published: PublishResponse = await publishResponse.json();

    return {
      success: true,
      platformPostId: published.id,
    };
  }

  /**
   * Validate credentials by checking account info
   */
  async validate(): Promise<boolean> {
    try {
      const params = new URLSearchParams({
        fields: "id,username",
        access_token: this.accessToken,
      });

      const response = await fetch(`${this.baseUrl}/${this.userId}?${params}`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Check if URL is a video based on extension
   */
  private isVideoUrl(url: string): boolean {
    const videoExts = [".mp4", ".mov", ".avi", ".mkv"];
    return videoExts.some((ext) => url.toLowerCase().endsWith(ext));
  }
}
