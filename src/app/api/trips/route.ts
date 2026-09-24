import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE_NAME, hasValidAccessSession } from "@/lib/access";
import { serverDatabaseClient } from "@/lib/server-database";
import type { TripStatus, TripSummary } from "@/domain/trip";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!hasValidAccessSession(request.cookies.get(ACCESS_COOKIE_NAME)?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = serverDatabaseClient();
    const { data: trips, error: tripsError } = await supabase
      .from("trips")
      .select("id, slug, name, destination, start_date, end_date, timezone, status, version, created_at, updated_at")
      .order("start_date", { ascending: false });
    if (tripsError) throw tripsError;

    const tripRows = trips ?? [];
    const { data: days, error: daysError } = tripRows.length
      ? await supabase.from("days").select("id, trip_id, date, title, subtitle").in("trip_id", tripRows.map((trip) => trip.id)).order("date", { ascending: true })
      : { data: [], error: null };
    if (daysError) throw daysError;

    const payload: TripSummary[] = tripRows.map((trip) => ({
      id: trip.id,
      slug: trip.slug,
      name: trip.name,
      destinationLabel: trip.destination,
      startDate: trip.start_date,
      endDate: trip.end_date,
      timezone: trip.timezone,
      status: trip.status as TripStatus,
      version: trip.version,
      createdAt: trip.created_at,
      updatedAt: trip.updated_at,
      days: (days ?? []).filter((day) => day.trip_id === trip.id).map((day) => ({
        id: day.id,
        date: day.date,
        title: day.title,
        subtitle: day.subtitle,
      })),
    }));

    return NextResponse.json({ trips: payload }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Az utazások most nem érhetők el." }, { status: 503 });
  }
}
