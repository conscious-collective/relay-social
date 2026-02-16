// OAuth Providers Status - Dashboard shows which OAuth flows are available
import { NextResponse } from 'next/server';

// Check which OAuth providers are configured
export async function GET() {
  const providers = {
    instagram: {
      available: !!(process.env.META_APP_ID && process.env.META_APP_SECRET),
      authUrl: '/api/oauth/instagram',
      configure: 'META_APP_ID, META_APP_SECRET',
      scopes: ['instagram_basic', 'instagram_content_publish', 'pages_show_list'],
    },
    twitter: {
      available: !!(process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET),
      authUrl: '/api/oauth/twitter',
      configure: 'TWITTER_CLIENT_ID, TWITTER_CLIENT_SECRET',
      scopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
    },
    linkedin: {
      available: !!(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET),
      authUrl: '/api/oauth/linkedin',
      configure: 'LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET',
      scopes: ['r_liteprofile', 'r_emailaddress', 'w_member_social'],
    },
  };

  return NextResponse.json({
    message: 'OAuth flows are handled by the Dashboard application',
    dashboard: 'http://localhost:3000',
    api: 'http://localhost:3001',
    architecture: {
      dashboard: 'Handles OAuth flows (browser redirects, user consent)',
      api: 'Handles posting and analytics (headless, token-based)',
    },
    providers,
  });
}