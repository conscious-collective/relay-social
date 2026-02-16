import { InstagramAdapter } from "./instagram.js";
import { TwitterAdapter } from "./twitter.js";
import type { PlatformAdapter } from "./types.js";

const adapters: Record<string, PlatformAdapter> = {
  instagram: new InstagramAdapter(),
  twitter: new TwitterAdapter(),
};

export function getAdapter(platform: string): PlatformAdapter | null {
  return adapters[platform] || null;
}

export { InstagramAdapter, TwitterAdapter };
export type { PlatformAdapter, PostContent, PublishResult, AnalyticsData } from "./types.js";