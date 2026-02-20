export const runtime = 'edge';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/db";
import { apiKeys } from "@/app/db/schema";
import { and, eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth-helpers";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await db
    .delete(apiKeys)
    .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, user.userId)));
  return NextResponse.json({ success: true });
}
