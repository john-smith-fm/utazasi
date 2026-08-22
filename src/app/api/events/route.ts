import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE_NAME, hasValidAccessSession } from "@/lib/access";
import { eventOverlapsRange } from "@/lib/event-date";
import { TIMELINE_TRIP_SLUG, timelineServerClient } from "@/lib/timeline-service";

export const dynamic = "force-dynamic";

function dayBounds(date: string) {
  const start = new Date(`${date}T00:00:00+02:00`);
  return { start: start.toISOString(), end: new Date(start.getTime() + 24 * 60 * 60 * 1000).toISOString() };
}

export async function GET(request: NextRequest) {
  if (!hasValidAccessSession(request.cookies.get(ACCESS_COOKIE_NAME)?.value)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const date = request.nextUrl.searchParams.get("date") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  try {
    const supabase = timelineServerClient();
    const { data: trip, error: tripError } = await supabase.from("trips").select("id").eq("slug", TIMELINE_TRIP_SLUG).maybeSingle();
    if (tripError) throw tripError;
    if (!trip) return NextResponse.json({ events: [] }, { headers: { "Cache-Control": "no-store" } });
    const { start, end } = dayBounds(date);
    const { data: candidates, error } = await supabase.from("events")
      .select("id, title, starts_at, ends_at, status, place_slug, source_url, last_verified_at")
      .eq("trip_id", trip.id).lt("starts_at", end).order("starts_at", { ascending: true });
    if (error) throw error;
    const data = (candidates ?? []).filter((event) => eventOverlapsRange(event, start, end));
    const { data: day, error: dayError } = await supabase.from("days").select("id").eq("trip_id", trip.id).eq("date", date).maybeSingle();
    if (dayError) throw dayError;
    const eventIds = data.map((event) => event.id);
    const { data: acceptedActivities, error: acceptedError } = eventIds.length && day
      ? await supabase.from("timeline_activities").select("source_event_id").eq("day_id", day.id).in("source_event_id", eventIds)
      : { data: [], error: null };
    if (acceptedError) throw acceptedError;
    const acceptedEventIds = new Set((acceptedActivities ?? []).flatMap((activity) => activity.source_event_id ? [activity.source_event_id] : []));
    return NextResponse.json({ events: data.map((event) => ({ ...event, accepted: acceptedEventIds.has(event.id) })) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Events unavailable" }, { status: 503 });
  }
}
