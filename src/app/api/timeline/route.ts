import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ACCESS_COOKIE_NAME, hasValidAccessSession } from "@/lib/access";
import type { Database } from "@/types/database";

export const dynamic = "force-dynamic";

const TRIP_SLUG = "sardinia-family-2026";

function serverClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Timeline data is not configured.");
  return createClient<Database>(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function GET(request: NextRequest) {
  if (!hasValidAccessSession(request.cookies.get(ACCESS_COOKIE_NAME)?.value)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const date = request.nextUrl.searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: "Invalid date" }, { status: 400 });

  try {
    const supabase = serverClient();
    const { data: trip, error: tripError } = await supabase.from("trips").select("id").eq("slug", TRIP_SLUG).maybeSingle();
    if (tripError) throw tripError;
    if (!trip) return NextResponse.json({ day: null }, { headers: { "Cache-Control": "no-store" } });

    const { data: day, error: dayError } = await supabase.from("days").select("id, date, title, subtitle").eq("trip_id", trip.id).eq("date", date).maybeSingle();
    if (dayError) throw dayError;
    if (!day) return NextResponse.json({ day: null }, { headers: { "Cache-Control": "no-store" } });

    const { data: activities, error: activitiesError } = await supabase
      .from("timeline_activities")
      .select("start_time, duration_minutes, title, description, location_name, kind, is_system_generated, created_at")
      .eq("day_id", day.id)
      .order("start_time", { ascending: true })
      .order("created_at", { ascending: true });
    if (activitiesError) throw activitiesError;
    return NextResponse.json({ day: { ...day, activities: activities ?? [] } }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Timeline unavailable" }, { status: 503 });
  }
}
