import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE_NAME, hasValidAccessSession } from "@/lib/access";
import { createTimelineActivity, timelineServerClient } from "@/lib/timeline-service";
import { requestedTripSlug, resolveTripRef } from "@/lib/trip-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!hasValidAccessSession(request.cookies.get(ACCESS_COOKIE_NAME)?.value)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const scope = request.nextUrl.searchParams.get("scope");
  const date = request.nextUrl.searchParams.get("date") ?? "";
  const requestedTrip = requestedTripSlug(request.nextUrl.searchParams.get("trip"));
  if ("error" in requestedTrip) return NextResponse.json({ error: requestedTrip.error }, { status: requestedTrip.status });
  if (scope !== "trip" && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: "Invalid date" }, { status: 400 });

  try {
    const supabase = timelineServerClient();
    const trip = await resolveTripRef(requestedTrip.data);
    if ("error" in trip) return NextResponse.json(scope === "trip" ? { days: [] } : { day: null }, { status: trip.status, headers: { "Cache-Control": "no-store" } });

    if (scope === "trip") {
      const { data: days, error: daysError } = await supabase.from("days").select("id, date, title, subtitle").eq("trip_id", trip.data.id).order("date", { ascending: true });
      if (daysError) throw daysError;
      const dayRows = days ?? [];
      if (!dayRows.length) return NextResponse.json({ days: [] }, { headers: { "Cache-Control": "no-store" } });
      const { data: activities, error: activitiesError } = await supabase
        .from("timeline_activities")
        .select("id, day_id, start_time, start_time_precision, time_label, duration_minutes, title, description, location_name, place_slug, source_event_id, kind, is_system_generated, created_at")
        .in("day_id", dayRows.map((day) => day.id))
        .order("start_time", { ascending: true })
        .order("created_at", { ascending: true });
      if (activitiesError) throw activitiesError;
      const activitiesByDay = new Map<string, typeof activities>();
      for (const activity of activities ?? []) {
        const grouped = activitiesByDay.get(activity.day_id) ?? [];
        grouped.push(activity);
        activitiesByDay.set(activity.day_id, grouped);
      }
      return NextResponse.json({ days: dayRows.map((day) => ({ ...day, activities: activitiesByDay.get(day.id) ?? [] })) }, { headers: { "Cache-Control": "no-store" } });
    }

    const { data: day, error: dayError } = await supabase.from("days").select("id, date, title, subtitle").eq("trip_id", trip.data.id).eq("date", date).maybeSingle();
    if (dayError) throw dayError;
    if (!day) return NextResponse.json({ day: null }, { headers: { "Cache-Control": "no-store" } });

    const { data: activities, error: activitiesError } = await supabase
      .from("timeline_activities")
      .select("id, start_time, start_time_precision, time_label, duration_minutes, title, description, location_name, place_slug, source_event_id, kind, is_system_generated, created_at")
      .eq("day_id", day.id)
      .order("start_time", { ascending: true })
      .order("created_at", { ascending: true });
    if (activitiesError) throw activitiesError;
    return NextResponse.json({ day: { ...day, activities: activities ?? [] } }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Timeline unavailable" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  if (!hasValidAccessSession(request.cookies.get(ACCESS_COOKIE_NAME)?.value)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null) as { tripSlug?: unknown; date?: unknown; activity?: unknown; requestId?: unknown } | null;
  const date = typeof body?.date === "string" ? body.date : "";
  const trip = requestedTripSlug(body?.tripSlug);
  if ("error" in trip) return NextResponse.json({ error: trip.error }, { status: trip.status });

  try {
    const result = await createTimelineActivity(trip.data, date, body?.activity, body?.requestId);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ activity: result.data }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "A programpont mentése nem sikerült." }, { status: 503 });
  }
}
