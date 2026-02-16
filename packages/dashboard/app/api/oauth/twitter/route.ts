// Twitter OAuth Flow - Handled by Dashboard (public-facing app)
import { NextRequest, NextResponse } from 'next/server';

const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID;
const TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET;
const TWITTER_REDIRECT_URI = process.env.TWITTER_REDIRECT_URI || 'http://localhost:3000/api/oauth/twitter/callback';

// Start OAuth flow - redirect to Twitter
export async function GET(request: NextRequest) {
  if (!TWITTER_CLIENT_ID) {
    return NextResponse.json({ 
      error: 'Twitter OAuth not configured',
      configure: 'Set TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET in environment'
    }, 500);
  }

  const state = crypto.randomUUID();
  const scope = ['tweet.read', 'tweet.write', 'users.read', 'offline.access'].join(' ');
  
  const authUrl = new URL('https://twitter.com/i/oauth2/authorize');
  authUrl.searchParams.set('client_id', TWITTER_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', TWITTER_REDIRECT_URI);
  authUrl.searchParams.set('scope', scope);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', crypto.randomUUID().slice(0, 43));
  authUrl.searchParams.set('code_challenge_method', 'plain');

  // Redirect to Twitter OAuth
  return NextResponse.redirect(authUrl.toString());
}