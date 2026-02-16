// LinkedIn OAuth Flow - Handled by Dashboard (public-facing app)
import { NextRequest, NextResponse } from 'next/server';

const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const LINKEDIN_REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:3000/api/oauth/linkedin/callback';

// Start OAuth flow - redirect to LinkedIn
export async function GET(request: NextRequest) {
  if (!LINKEDIN_CLIENT_ID) {
    return NextResponse.json({ 
      error: 'LinkedIn OAuth not configured',
      configure: 'Set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET in environment'
    }, { status: 500 });
  }

  const state = crypto.randomUUID();
  const scope = ['r_liteprofile', 'r_emailaddress', 'w_member_social'].join(' ');
  
  const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
  authUrl.searchParams.set('client_id', LINKEDIN_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', LINKEDIN_REDIRECT_URI);
  authUrl.searchParams.set('scope', scope);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('state', state);

  // Redirect to LinkedIn OAuth
  return NextResponse.redirect(authUrl.toString());
}