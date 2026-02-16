import type { PlatformAdapter, PostContent, PublishResult, AnalyticsData } from "./types.js";

export class InstagramAdapter implements PlatformAdapter {
  platform = "instagram" as const;

  async publishPost(accessToken: string, platformId: string, content: PostContent): Promise<PublishResult> {
    try {
      if (content.mediaUrls.length === 0) {
        return { success: false, error: "Instagram posts require at least one image" };
      }

      if (content.mediaUrls.length === 1) {
        return await this.publishSinglePost(accessToken, platformId, content);
      } else {
        return await this.publishCarousel(accessToken, platformId, content);
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async publishSinglePost(accessToken: string, platformId: string, content: PostContent): Promise<PublishResult> {
    // Step 1: Create media container
    const containerResponse = await fetch(`https://graph.facebook.com/v18.0/${platformId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        image_url: content.mediaUrls[0],
        caption: content.text,
        access_token: accessToken,
      }),
    });

    const containerData = await containerResponse.json();
    
    if (!containerData.id) {
      return { success: false, error: containerData.error?.message || "Failed to create media container" };
    }

    // Step 2: Publish the container
    const publishResponse = await fetch(`https://graph.facebook.com/v18.0/${platformId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        creation_id: containerData.id,
        access_token: accessToken,
      }),
    });

    const publishData = await publishResponse.json();

    if (!publishData.id) {
      return { success: false, error: publishData.error?.message || "Failed to publish post" };
    }

    return {
      success: true,
      platformPostId: publishData.id,
      publishedAt: new Date(),
    };
  }

  private async publishCarousel(accessToken: string, platformId: string, content: PostContent): Promise<PublishResult> {
    // Step 1: Create individual media containers
    const mediaContainerIds = [];

    for (const mediaUrl of content.mediaUrls) {
      const containerResponse = await fetch(`https://graph.facebook.com/v18.0/${platformId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          image_url: mediaUrl,
          is_carousel_item: "true",
          access_token: accessToken,
        }),
      });

      const containerData = await containerResponse.json();
      
      if (!containerData.id) {
        return { success: false, error: `Failed to create carousel item: ${containerData.error?.message}` };
      }

      mediaContainerIds.push(containerData.id);
    }

    // Step 2: Create carousel container
    const carouselResponse = await fetch(`https://graph.facebook.com/v18.0/${platformId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        media_type: "CAROUSEL",
        children: mediaContainerIds.join(","),
        caption: content.text,
        access_token: accessToken,
      }),
    });

    const carouselData = await carouselResponse.json();
    
    if (!carouselData.id) {
      return { success: false, error: carouselData.error?.message || "Failed to create carousel container" };
    }

    // Step 3: Publish carousel
    const publishResponse = await fetch(`https://graph.facebook.com/v18.0/${platformId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        creation_id: carouselData.id,
        access_token: accessToken,
      }),
    });

    const publishData = await publishResponse.json();

    if (!publishData.id) {
      return { success: false, error: publishData.error?.message || "Failed to publish carousel" };
    }

    return {
      success: true,
      platformPostId: publishData.id,
      publishedAt: new Date(),
    };
  }

  async getAnalytics(accessToken: string, platformPostId: string): Promise<AnalyticsData | null> {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${platformPostId}/insights?metric=impressions,reach,likes,comments,shares,saves&access_token=${accessToken}`
      );

      const data = await response.json();

      if (!data.data || data.data.length === 0) {
        return null;
      }

      const metrics: AnalyticsData = {
        impressions: 0,
        reach: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0,
        clicks: 0,
      };

      // Parse Instagram Insights API response
      for (const insight of data.data) {
        const value = insight.values[0]?.value || 0;
        
        switch (insight.name) {
          case "impressions":
            metrics.impressions = value;
            break;
          case "reach":
            metrics.reach = value;
            break;
          case "likes":
            metrics.likes = value;
            break;
          case "comments":
            metrics.comments = value;
            break;
          case "shares":
            metrics.shares = value;
            break;
          case "saves":
            metrics.saves = value;
            break;
        }
      }

      return metrics;
    } catch (error) {
      console.error("Failed to fetch Instagram analytics:", error);
      return null;
    }
  }

  async validateToken(accessToken: string, platformId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${platformId}?fields=id,username&access_token=${accessToken}`
      );
      const data = await response.json();
      return !!data.id && !data.error;
    } catch {
      return false;
    }
  }
}