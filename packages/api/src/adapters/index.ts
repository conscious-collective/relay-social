import { InstagramAdapter } from "./instagram.js";
import { TwitterAdapter } from "./twitter.js";
import { LinkedInAdapter } from "./linkedin.js";
import type { PlatformAdapter } from "./types.js";

const adapters: Record<string, PlatformAdapter> = {
  instagram: new InstagramAdapter(),
  twitter: new TwitterAdapter(),
  linkedin: new LinkedInAdapter(),
};

export function getAdapter(platform: string): PlatformAdapter | null {
  return adapters[platform] || null;
}

export { InstagramAdapter, TwitterAdapter, LinkedInAdapter };
export type { PlatformAdapter, PostContent, PublishResult, AnalyticsData } from "./types.js";