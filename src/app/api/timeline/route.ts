import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE_NAME, hasValidAccessSession } from "@/lib/access";
import { createTimelineActivity, timelineServerClient, TIMELINE_TRIP_SLUG } from "@/lib/timeline-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!hasValidAccessSession(request.cookies.get(ACCESS_COOKIE_NAME)?.value)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const date = request.nextUrl.searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: "Invalid date" }, { status: 400 });

  try {
    const supabase = timelineServerClient();
    const { data: trip, error: tripError } = await supabase.from("trips").select("id").eq("slug", TIMELINE_TRIP_SLUG).maybeSingle();
    if (tripError) throw tripError;
    if (!trip) return NextResponse.json({ day: null }, { headers: { "Cache-Control": "no-store" } });

    const { data: day, error: dayError } = await supabase.from("days").select("id, date, title, subtitle").eq("trip_id", trip.id).eq("date", date).maybeSingle();
    if (dayError) throw dayError;
    if (!day) return NextResponse.json({ day: null }, { headers: { "Cache-Control": "no-store" } });

    const { data: activities, error: activitiesError } = await supabase
      .from("timeline_activities")
      .select("id, start_time, duration_minutes, title, description, location_name, place_slug, kind, is_system_generated, created_at")
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

  const body = await request.json().catch(() => null) as { date?: unknown; activity?: unknown; requestId?: unknown } | null;
  const date = typeof body?.date === "string" ? body.date : "";

  try {
    const result = await createTimelineActivity(date, body?.activity, body?.requestId);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ activity: result.data }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "A programpont mentése nem sikerült." }, { status: 503 });
  }
}
