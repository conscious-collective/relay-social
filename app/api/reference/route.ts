export const runtime = 'edge';
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // Redirect to OpenAPI spec
  const url = new URL(req.url);
  return NextResponse.redirect(new URL("/openapi.json", url.origin));
}
