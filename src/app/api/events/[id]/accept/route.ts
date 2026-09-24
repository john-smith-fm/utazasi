import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE_NAME, hasValidAccessSession } from "@/lib/access";
import { acceptEventIntoTimeline } from "@/lib/timeline-service";
import { requestedTripSlug } from "@/lib/trip-service";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  if (!hasValidAccessSession(request.cookies.get(ACCESS_COOKIE_NAME)?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null) as { tripSlug?: unknown; date?: unknown } | null;
  const date = typeof body?.date === "string" ? body.date : "";
  const trip = requestedTripSlug(body?.tripSlug);
  if ("error" in trip) return NextResponse.json({ error: trip.error }, { status: trip.status });
  try {
    const result = await acceptEventIntoTimeline(trip.data, params.id, date);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ activity: result.data }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Az esemény hozzáadása nem sikerült." }, { status: 503 });
  }
}
