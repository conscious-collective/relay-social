// Instagram OAuth Flow - Handled by Dashboard (public-facing app)
import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

// Lazy initialization to avoid build-time database connection
const getSql = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }
  return neon(process.env.DATABASE_URL);
};

const META_APP_ID = process.env.META_APP_ID;
const META_APP_SECRET = process.env.META_APP_SECRET;
const META_REDIRECT_URI = process.env.META_REDIRECT_URI || 'http://localhost:3000/api/oauth/instagram/callback';

// Start OAuth flow - redirect to Instagram
export async function GET(request: NextRequest) {
  if (!META_APP_ID) {
    return NextResponse.json({ 
      error: 'Instagram OAuth not configured',
      configure: 'Set META_APP_ID and META_APP_SECRET in environment'
    }, { status: 500 });
  }

  const state = crypto.randomUUID();
  const scope = ['instagram_basic', 'instagram_content_publish', 'pages_show_list'].join(',');
  
  // Store state for CSRF validation (in production, use session/cookie)
  const authUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth');
  authUrl.searchParams.set('client_id', META_APP_ID);
  authUrl.searchParams.set('redirect_uri', META_REDIRECT_URI);
  authUrl.searchParams.set('scope', scope);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('state', state);

  // Redirect to Instagram OAuth
  return NextResponse.redirect(authUrl.toString());
}

// Handle callback from Instagram
export async function POST(request: NextRequest) {
  // This would handle the callback from Instagram
  // In a full implementation, you'd:
  // 1. Validate the state parameter
  // 2. Exchange code for access token
  // 3. Fetch Instagram account details
  // 4. Save to database via API call
  
  return NextResponse.json({
    message: 'Instagram OAuth callback - implement with callback route',
    nextSteps: [
      'Create /api/oauth/instagram/callback route',
      'Exchange code for tokens',
      'Save tokens to database',
      'Redirect to dashboard'
    ]
  });
}