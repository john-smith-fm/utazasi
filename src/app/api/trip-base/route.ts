import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE_NAME, hasValidAccessSession } from "@/lib/access";
import { TRIP_BASE_NAME } from "@/lib/trip-base";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  if (!hasValidAccessSession(request.cookies.get(ACCESS_COOKIE_NAME)?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const address = process.env.TRIP_BASE_MAP_ORIGIN?.trim();
  if (!address) return NextResponse.json({ error: "A privát szálláscím nincs konfigurálva." }, { status: 503 });

  return NextResponse.json({
    tripBase: {
      name: TRIP_BASE_NAME,
      address,
      mapUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}&travelmode=driving`,
    },
  }, { headers: { "Cache-Control": "no-store" } });
}
