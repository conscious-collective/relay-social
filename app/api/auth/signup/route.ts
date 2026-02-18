export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/db";
import { users, apiKeys } from "@/app/db/schema";
import { eq } from "drizzle-orm";
import {
  signToken,
  hashPassword,
  generateId,
} from "@/lib/auth-helpers";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password required" },
      { status: 400 }
    );
  }

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing.length > 0) {
    return NextResponse.json(
      { error: "Email already registered" },
      { status: 400 }
    );
  }

  const passwordHash = await hashPassword(password);
  const userId = generateId("u_");

  await db.insert(users).values({ id: userId, email, passwordHash, tier: "free" });

  const apiKeyId = generateId("k_");
  const apiKey = `relay_${crypto.randomUUID().replace(/-/g, "")}`;
  await db.insert(apiKeys).values({ id: apiKeyId, userId, name: "Default", key: apiKey });

  const token = await signToken({ userId, email });
  return NextResponse.json(
    { user: { id: userId, email, tier: "free" }, token, apiKey },
    { status: 201 }
  );
}
