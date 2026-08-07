import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE_NAME, hasValidAccessSession, isAccessConfigured } from "@/lib/access";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  return NextResponse.json({ authenticated: hasValidAccessSession(request.cookies.get(ACCESS_COOKIE_NAME)?.value), configured: isAccessConfigured() }, { headers: { "Cache-Control": "no-store" } });
}
