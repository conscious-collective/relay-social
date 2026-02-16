export interface PostContent {
  text: string;
  mediaUrls: string[];
  metadata?: Record<string, any>;
}

export interface PublishResult {
  success: boolean;
  platformPostId?: string;
  publishedAt?: Date;
  error?: string;
}

export interface AnalyticsData {
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
}

export interface PlatformAdapter {
  platform: string;
  publishPost(accessToken: string, platformId: string, content: PostContent): Promise<PublishResult>;
  getAnalytics(accessToken: string, platformPostId: string): Promise<AnalyticsData | null>;
  validateToken(accessToken: string, platformId: string): Promise<boolean>;
}