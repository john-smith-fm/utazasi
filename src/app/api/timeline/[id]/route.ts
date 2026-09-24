import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE_NAME, hasValidAccessSession } from "@/lib/access";
import { deleteTimelineActivity, updateTimelineActivity } from "@/lib/timeline-service";
import { requestedTripSlug } from "@/lib/trip-service";

export const dynamic = "force-dynamic";

function authorized(request: NextRequest) {
  return hasValidAccessSession(request.cookies.get(ACCESS_COOKIE_NAME)?.value);
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { activity?: unknown } | null;
  const trip = requestedTripSlug(request.nextUrl.searchParams.get("trip"));
  if ("error" in trip) return NextResponse.json({ error: trip.error }, { status: trip.status });

  try {
    const result = await updateTimelineActivity(trip.data, params.id, body?.activity);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ activity: result.data }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "A programpont mentése nem sikerült." }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const trip = requestedTripSlug(request.nextUrl.searchParams.get("trip"));
  if ("error" in trip) return NextResponse.json({ error: trip.error }, { status: trip.status });

  try {
    const result = await deleteTimelineActivity(trip.data, params.id);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ activity: result.data }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "A programpont törlése nem sikerült." }, { status: 503 });
  }
}
