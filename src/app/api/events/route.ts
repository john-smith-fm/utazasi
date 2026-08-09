import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE_NAME, hasValidAccessSession } from "@/lib/access";
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
    const { data, error } = await supabase.from("events")
      .select("id, title, starts_at, ends_at, status, place_slug, source_url, last_verified_at")
      .eq("trip_id", trip.id).lt("starts_at", end).or(`ends_at.is.null,ends_at.gte.${start}`).order("starts_at", { ascending: true });
    if (error) throw error;
    return NextResponse.json({ events: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Events unavailable" }, { status: 503 });
  }
}
