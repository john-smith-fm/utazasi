import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE_NAME, hasValidAccessSession } from "@/lib/access";
import { privateTripBaseDetails } from "@/lib/trip-base";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  if (!hasValidAccessSession(request.cookies.get(ACCESS_COOKIE_NAME)?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tripBase = privateTripBaseDetails(process.env.TRIP_BASE_MAP_ORIGIN);
  if (!tripBase) return NextResponse.json({ error: "A privát szálláscím nincs konfigurálva." }, { status: 503 });

  return NextResponse.json({ tripBase }, { headers: { "Cache-Control": "no-store" } });
}
