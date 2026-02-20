export const runtime = 'edge';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/db";
import { accounts } from "@/app/db/schema";
import { eq } from "drizzle-orm";

/**
 * GET /api/auth/status?accountId=acc_xxx
 * Check health status of a connected account
 * 
 * Returns:
 * {
 *   "accountId": "acc_xxx",
 *   "platform": "instagram",
 *   "status": "active" | "expired" | "expiring_soon" | "invalid",
 *   "expiresAt": "2026-04-20T...",
 *   "daysUntilExpiry": 45,
 *   "needsRefresh": false
 * }
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get("accountId");

    if (!accountId) {
      return NextResponse.json(
        { error: "accountId query parameter is required" },
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

    // Calculate expiry status
    const now = new Date();
    const expiresAt = account.tokenExpiresAt;
    
    let status: "active" | "expired" | "expiring_soon" | "unknown";
    let daysUntilExpiry: number | null = null;
    let needsRefresh = false;

    if (!expiresAt) {
      // No expiry timestamp means we don't know when it expires
      status = "unknown";
    } else {
      const msUntilExpiry = expiresAt.getTime() - now.getTime();
      daysUntilExpiry = Math.floor(msUntilExpiry / (1000 * 60 * 60 * 24));

      if (msUntilExpiry < 0) {
        status = "expired";
        needsRefresh = true;
      } else if (daysUntilExpiry < 7) {
        status = "expiring_soon";
        needsRefresh = true;
      } else {
        status = "active";
      }
    }

    return NextResponse.json({
      accountId: account.id,
      platform: account.platform,
      handle: account.handle,
      status,
      expiresAt: expiresAt?.toISOString() || null,
      daysUntilExpiry,
      needsRefresh,
      hasRefreshToken: !!account.refreshToken,
    });
  } catch (error: any) {
    console.error("Status check error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
