import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/db";
import { accounts } from "@/app/db/schema";
import { eq } from "drizzle-orm";

/**
 * POST /api/auth/refresh
 * Refresh access token for a connected account
 * 
 * Request body:
 * {
 *   "accountId": "acc_xxx"
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 }
      );
    }

    const { accountId } = await req.json();

    if (!accountId) {
      return NextResponse.json(
        { error: "accountId is required" },
        { status: 400 }
      );
    }

    // Get the account
    const [account] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .limit(1);

    if (!account) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    // Check if refresh token exists
    if (!account.refreshToken) {
      return NextResponse.json(
        {
          error: "No refresh token available for this account",
          hint: "Re-authenticate via OAuth to get a refresh token",
        },
        { status: 400 }
      );
    }

    // Platform-specific refresh logic
    let newAccessToken: string;
    let expiresAt: Date;

    switch (account.platform) {
      case "instagram":
        // Instagram (Meta) long-lived token refresh
        // https://developers.facebook.com/docs/instagram-basic-display-api/guides/long-lived-access-tokens
        const refreshUrl = `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${account.accessToken}`;

        const response = await fetch(refreshUrl);
        const data = await response.json();

        if (!response.ok || data.error) {
          return NextResponse.json(
            {
              error: "Failed to refresh Instagram token",
              details: data.error?.message || "Unknown error",
            },
            { status: 500 }
          );
        }

        newAccessToken = data.access_token;
        // Instagram long-lived tokens last 60 days
        expiresAt = new Date(Date.now() + data.expires_in * 1000);
        break;

      // Add other platforms here (Twitter, Facebook, etc.)
      default:
        return NextResponse.json(
          { error: `Token refresh not implemented for platform: ${account.platform}` },
          { status: 501 }
        );
    }

    // Update the account with new token
    await db
      .update(accounts)
      .set({
        accessToken: newAccessToken,
        tokenExpiresAt: expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(accounts.id, accountId));

    return NextResponse.json({
      success: true,
      accountId: account.id,
      platform: account.platform,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error: any) {
    console.error("Token refresh error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
