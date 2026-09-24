import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE_NAME, hasValidAccessSession } from "@/lib/access";
import { checkQuestionResearchRateLimit } from "@/lib/question-ai-rate-limit";
import { isTimelineActionRequest, type TimelineProposal } from "@/lib/timeline-proposal";
import { researchTimelineProposal } from "@/lib/timeline-proposal-research";
import { serverDatabaseClient } from "@/lib/server-database";
import { requestedTripSlug } from "@/lib/trip-service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function normalized(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export async function POST(request: NextRequest) {
  const accessSession = request.cookies.get(ACCESS_COOKIE_NAME)?.value;
  if (!hasValidAccessSession(accessSession)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { tripSlug?: unknown; request?: unknown; sourceDate?: unknown; mutationConfirmed?: unknown } | null;
  const instruction = typeof body?.request === "string" ? body.request.trim() : "";
  const tripSlug = requestedTripSlug(body?.tripSlug);
  if ("error" in tripSlug) return NextResponse.json({ error: tripSlug.error }, { status: tripSlug.status });
  if (!instruction || instruction.length > 500 || !isDate(body?.sourceDate) || !isTimelineActionRequest(instruction)) {
    return NextResponse.json({ error: "Érvénytelen Timeline-kérés." }, { status: 400 });
  }
  if (body?.mutationConfirmed !== true) {
    return NextResponse.json({ error: "A Timeline-javaslat elkészítéséhez előbb beleegyezés szükséges.", requiresConfirmation: true }, { status: 409 });
  }
  const rateLimit = checkQuestionResearchRateLimit(accessSession!);
  if (!rateLimit.allowed) return NextResponse.json({ error: "Az AI Planner óránkénti kerete most betelt." }, { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds), "Cache-Control": "no-store" } });

  try {
    const database = serverDatabaseClient();
    const { data: trip, error: tripError } = await database.from("trips").select("id, slug, destination, timezone").eq("slug", tripSlug.data).maybeSingle();
    if (tripError) throw tripError;
    if (!trip) return NextResponse.json({ error: "Az utazás nem található." }, { status: 404 });
    const { data: days, error: daysError } = await database.from("days").select("id, date, title, version").eq("trip_id", trip.id).order("date", { ascending: true });
    if (daysError) throw daysError;
    const sourceIndex = (days ?? []).findIndex((day) => day.date === body.sourceDate);
    if (sourceIndex < 0) return NextResponse.json({ error: "A kiinduló nap nem található." }, { status: 404 });
    const wantsTomorrow = /\bholnap\b/.test(normalized(instruction));
    const wantsStructuralPlan = /\b(hasonlo|ilyen|ugyanilyen|tervezz|tervezd|alakitsd|modositsd|csereld|legyen)\b/.test(normalized(instruction));
    const sourceDay = days![sourceIndex];
    const targetDay = wantsTomorrow ? days![sourceIndex + 1] : sourceDay;
    if (!targetDay) return NextResponse.json({ error: "Az utazásban nincs következő nap." }, { status: 409 });
    const { data: activities, error: activitiesError } = await database.from("timeline_activities")
      .select("day_id, start_time, duration_minutes, title, location_name, description")
      .in("day_id", [...new Set([sourceDay.id, targetDay.id])])
      .order("start_time", { ascending: true });
    if (activitiesError) throw activitiesError;
    const sourceActivities = (activities ?? []).filter((item) => item.day_id === sourceDay.id);
    const targetActivities = (activities ?? []).filter((item) => item.day_id === targetDay.id);
    if (!sourceActivities.length && /\b(hasonlo|ilyen|ugyanilyen)\b/.test(normalized(instruction))) {
      return NextResponse.json({ error: "A kiinduló nap üres, ezért nincs felismerhető napi ritmus." }, { status: 409 });
    }
    if (targetDay.id !== sourceDay.id && targetActivities.length && wantsStructuralPlan) {
      return NextResponse.json({ error: "A célnapon már vannak programok. A biztonságos csere-diff még készül, ezért ezt a napot most nem írom felül." }, { status: 409 });
    }
    const researched = await researchTimelineProposal({
      request: instruction,
      trip: { destination: trip.destination, timezone: trip.timezone },
      sourceDay: { date: sourceDay.date, title: sourceDay.title, activities: sourceActivities.map((item) => ({ startTime: item.start_time.slice(0, 5), durationMinutes: item.duration_minutes, title: item.title, locationName: item.location_name, description: item.description })) },
      targetDay: { date: targetDay.date, title: targetDay.title, activities: targetActivities.map((item) => ({ startTime: item.start_time.slice(0, 5), durationMinutes: item.duration_minutes, title: item.title, locationName: item.location_name })) },
    });
    if (!researched) return NextResponse.json({ error: "Nem találtam elég megbízható adatot egy alkalmazható tervhez." }, { status: 422 });
    const proposal: TimelineProposal = {
      request: instruction,
      sourceDate: sourceDay.date,
      targetDate: targetDay.date,
      targetTitle: targetDay.title,
      targetVersion: targetDay.version,
      summary: researched.summary,
      items: researched.items,
      limitations: researched.limitations,
      blockingReason: null,
    };
    return NextResponse.json({ proposal }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Az AI Planner most nem érhető el.";
    return NextResponse.json({ error: message }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
