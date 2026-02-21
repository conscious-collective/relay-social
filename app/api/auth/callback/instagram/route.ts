export const runtime = 'edge';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/db";
import { accounts } from "@/app/db/schema";
import { generateId } from "@/lib/auth-helpers";

const META_APP_ID = process.env.META_APP_ID!;
const META_APP_SECRET = process.env.META_APP_SECRET!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * GET /api/auth/callback/instagram
 * Handles OAuth callback, exchanges code for token
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const userId = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${APP_URL}/accounts?error=${error}`);
  }

  if (!code || !userId) {
    return NextResponse.redirect(`${APP_URL}/accounts?error=missing_params`);
  }

  try {
    // Exchange code for access token
    const tokenUrl = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
    tokenUrl.searchParams.set("client_id", META_APP_ID);
    tokenUrl.searchParams.set("client_secret", META_APP_SECRET);
    tokenUrl.searchParams.set("redirect_uri", `${APP_URL}/api/auth/callback/instagram`);
    tokenUrl.searchParams.set("code", code);

    const tokenResponse = await fetch(tokenUrl.toString());
    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      return NextResponse.redirect(`${APP_URL}/accounts?error=token_failed`);
    }

    const accessToken = tokenData.access_token;

    // Get Instagram account info
    const igUrl = new URL("https://graph.facebook.com/v21.0/me");
    igUrl.searchParams.set("fields", "instagram_business_account{id,username,name}");
    igUrl.searchParams.set("access_token", accessToken);

    const igResponse = await fetch(igUrl.toString());
    const igData = await igResponse.json();

    if (!igData.instagram_business_account) {
      return NextResponse.redirect(`${APP_URL}/accounts?error=no_instagram`);
    }

    const igAccount = igData.instagram_business_account;

    // Save account to database
    const accountId = generateId("acc_");
    await db.insert(accounts).values({
      id: accountId,
      userId,
      platform: "instagram",
      platformId: igAccount.id,
      name: igAccount.name || igAccount.username,
      handle: igAccount.username,
      accessToken,
      refreshToken: null,
      tokenExpiresAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.redirect(`${APP_URL}/accounts?success=connected`);
  } catch (err) {
    console.error("OAuth callback error:", err);
    return NextResponse.redirect(`${APP_URL}/accounts?error=callback_failed`);
  }
}
