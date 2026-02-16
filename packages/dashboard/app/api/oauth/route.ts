// OAuth Root Route - Redirect to providers or show help
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    message: 'Relay Social OAuth Hub',
    description: 'OAuth flows for connecting social media accounts',
    architecture: {
      dashboard: 'This app handles OAuth (browser-based, user-facing)',
      api: 'The API handles posting and analytics (headless, token-based)',
    },
    usage: {
      'GET /api/oauth': 'This help message',
      'GET /api/oauth/providers': 'List available OAuth providers',
      'GET /api/oauth/instagram': 'Start Instagram OAuth flow',
      'GET /api/oauth/twitter': 'Start Twitter OAuth flow',
      'GET /api/oauth/linkedin': 'Start LinkedIn OAuth flow',
    },
    dashboard: 'http://localhost:3000',
    api: 'http://localhost:3001',
  });
}