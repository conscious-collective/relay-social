import type { PlatformAdapter, PostContent, PublishResult, AnalyticsData } from "./types.js";

export class LinkedInAdapter implements PlatformAdapter {
  platform = "linkedin" as const;

  async publishPost(accessToken: string, platformId: string, content: PostContent): Promise<PublishResult> {
    try {
      // LinkedIn API v2 requires person URN format
      const personUrn = `urn:li:person:${platformId}`;

      const payload: any = {
        author: personUrn,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: {
              text: content.text,
            },
            shareMediaCategory: content.mediaUrls.length > 0 ? "IMAGE" : "NONE",
          },
        },
        visibility: {
          "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
        },
      };

      // Add media if provided
      if (content.mediaUrls.length > 0) {
        // LinkedIn requires uploading assets first, then referencing them
        const mediaAssets = [];

        for (const mediaUrl of content.mediaUrls.slice(0, 9)) { // LinkedIn allows max 9 images
          const assetResult = await this.uploadAsset(accessToken, personUrn, mediaUrl);
          if (assetResult.success && assetResult.assetUrn) {
            mediaAssets.push({
              status: "READY",
              description: {
                text: content.text.substring(0, 120), // Short description
              },
              media: assetResult.assetUrn,
              title: {
                text: "Shared via Relay Social",
              },
            });
          }
        }

        if (mediaAssets.length > 0) {
          payload.specificContent["com.linkedin.ugc.ShareContent"].media = mediaAssets;
        }
      }

      const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || data.error?.message || "Failed to create LinkedIn post",
        };
      }

      return {
        success: true,
        platformPostId: data.id,
        publishedAt: new Date(),
      };

    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async uploadAsset(accessToken: string, personUrn: string, mediaUrl: string): Promise<{ success: boolean; assetUrn?: string; error?: string }> {
    try {
      // First, register the upload
      const registerPayload = {
        registerUploadRequest: {
          recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
          owner: personUrn,
          serviceRelationships: [
            {
              relationshipType: "OWNER",
              identifier: "urn:li:userGeneratedContent",
            },
          ],
        },
      };

      const registerResponse = await fetch("https://api.linkedin.com/v2/assets?action=registerUpload", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify(registerPayload),
      });

      const registerData = await registerResponse.json();

      if (!registerResponse.ok) {
        return { success: false, error: registerData.message || "Failed to register asset upload" };
      }

      const uploadUrl = registerData.value.uploadMechanism["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"].uploadUrl;
      const assetUrn = registerData.value.asset;

      // Fetch the media file
      const mediaResponse = await fetch(mediaUrl);
      if (!mediaResponse.ok) {
        return { success: false, error: `Failed to fetch media from ${mediaUrl}` };
      }

      const mediaBuffer = await mediaResponse.arrayBuffer();

      // Upload the media to LinkedIn's storage
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": mediaResponse.headers.get("content-type") || "image/jpeg",
        },
        body: mediaBuffer,
      });

      if (!uploadResponse.ok) {
        return { success: false, error: "Failed to upload media to LinkedIn" };
      }

      return { success: true, assetUrn };

    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async getAnalytics(accessToken: string, platformPostId: string): Promise<AnalyticsData | null> {
    try {
      // LinkedIn Analytics API requires the share URN format
      const shareUrn = `urn:li:share:${platformPostId}`;

      const response = await fetch(
        `https://api.linkedin.com/v2/socialMetadata/${encodeURIComponent(shareUrn)}`,
        {
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "X-Restli-Protocol-Version": "2.0.0",
          },
        }
      );

      if (!response.ok) {
        // LinkedIn analytics may not be immediately available
        return null;
      }

      const data = await response.json();

      // LinkedIn provides different metrics structure
      const totalEngagement = (data.totalShares || 0) + (data.totalLikes || 0) + (data.totalComments || 0);

      return {
        impressions: data.totalImpressions || 0,
        reach: data.totalImpressions || 0, // LinkedIn doesn't separate reach/impressions in basic metrics
        likes: data.totalLikes || 0,
        comments: data.totalComments || 0,
        shares: data.totalShares || 0,
        saves: 0, // LinkedIn doesn't provide saves in basic metrics
        clicks: data.totalClicks || 0,
      };

    } catch (error) {
      console.error("Failed to fetch LinkedIn analytics:", error);
      return null;
    }
  }

  async validateToken(accessToken: string, platformId: string): Promise<boolean> {
    try {
      const response = await fetch("https://api.linkedin.com/v2/people/~", {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "X-Restli-Protocol-Version": "2.0.0",
        },
      });

      return response.ok;
    } catch {
      return false;
    }
  }
}