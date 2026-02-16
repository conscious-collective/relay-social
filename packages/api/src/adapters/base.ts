/**
 * Base Platform Adapter
 * All platform integrations extend this
 */

export interface PublishResult {
  success: boolean;
  platformPostId?: string;
  error?: string;
}

export interface MediaItem {
  url: string;
  type: "image" | "video";
  caption?: string;
}

export interface PostData {
  content: string;
  mediaUrls: string[];
  scheduledAt?: Date;
}

export abstract class PlatformAdapter {
  protected accessToken: string;
  protected refreshToken?: string;

  constructor(accessToken: string, refreshToken?: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }

  /**
   * Publish a single post
   */
  abstract publish(data: PostData): Promise<PublishResult>;

  /**
   * Refresh access token if needed
   */
  async refreshAccessToken(): Promise<string | null> {
    return null; // Override in platform-specific adapters
  }

  /**
   * Validate credentials
   */
  abstract validate(): Promise<boolean>;
}
