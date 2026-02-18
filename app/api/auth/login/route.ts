export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../db";
import { users, apiKeys } from "../../../db/schema";
import { eq } from "drizzle-orm";
import { signToken, verifyPassword } from "../../../../lib/auth-helpers";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  const keys = await db.select().from(apiKeys).where(eq(apiKeys.userId, user.id));
  const token = await signToken({ userId: user.id, email: user.email });

  return NextResponse.json({
    user: { id: user.id, email: user.email, tier: user.tier },
    token,
    apiKeys: keys.map((k) => ({ id: k.id, name: k.name, key: k.key })),
  });
}
