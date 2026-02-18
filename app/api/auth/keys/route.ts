export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../db";
import { apiKeys } from "../../../db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser, generateId } from "../../../../lib/auth-helpers";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const keys = await db.select().from(apiKeys).where(eq(apiKeys.userId, user.userId));
  return NextResponse.json({ keys });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { name } = await req.json();
  const id = generateId("k_");
  const key = `relay_${crypto.randomUUID().replace(/-/g, "")}`;
  await db.insert(apiKeys).values({ id, userId: user.userId, name: name || "New Key", key });
  return NextResponse.json({ id, name: name || "New Key", key }, { status: 201 });
}
