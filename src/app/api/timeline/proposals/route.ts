import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE_NAME, hasValidAccessSession } from "@/lib/access";
import { checkQuestionResearchRateLimit } from "@/lib/question-ai-rate-limit";
import { isTimelineActionRequest, timelineProposalTargetDates, type TimelineProposal } from "@/lib/timeline-proposal";
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
    const sourceDay = days![sourceIndex];
    const targetDates = timelineProposalTargetDates(instruction, sourceDay.date, days!);
    const targetDays = days!.filter((day) => targetDates.includes(day.date));
    if (!targetDays.length) return NextResponse.json({ error: "A kéréshez nem található érintett nap az utazásban." }, { status: 409 });
    if (targetDays.length > 14) return NextResponse.json({ error: "Egyszerre legfeljebb 14 nap tervezhető újra." }, { status: 400 });
    const { data: activities, error: activitiesError } = await database.from("timeline_activities")
      .select("id, day_id, start_time, duration_minutes, title, location_name, description")
      .in("day_id", [...new Set([sourceDay.id, ...targetDays.map((day) => day.id)])])
      .order("start_time", { ascending: true });
    if (activitiesError) throw activitiesError;
    const sourceActivities = (activities ?? []).filter((item) => item.day_id === sourceDay.id);
    if (!sourceActivities.length && /\b(hasonlo|ilyen|ugyanilyen)\b/.test(normalized(instruction))) {
      return NextResponse.json({ error: "A kiinduló nap üres, ezért nincs felismerhető napi ritmus." }, { status: 409 });
    }
    const activity = (item: typeof sourceActivities[number]) => ({ id: item.id, startTime: item.start_time.slice(0, 5), durationMinutes: item.duration_minutes, title: item.title, locationName: item.location_name ?? "", description: item.description ?? "" });
    const researchTargetDays = targetDays.map((day) => ({ date: day.date, title: day.title, version: day.version, activities: (activities ?? []).filter((item) => item.day_id === day.id).map(activity) }));
    const researched = await researchTimelineProposal({
      request: instruction,
      trip: { destination: trip.destination, timezone: trip.timezone },
      sourceDay: { date: sourceDay.date, title: sourceDay.title, activities: sourceActivities.map(activity) },
      targetDays: researchTargetDays,
    });
    if (!researched) return NextResponse.json({ error: "Nem találtam elég megbízható adatot egy alkalmazható tervhez." }, { status: 422 });
    const proposal: TimelineProposal = {
      request: instruction,
      sourceDate: sourceDay.date,
      summary: researched.summary,
      days: researched.days,
      limitations: researched.limitations,
      blockingReason: null,
    };
    return NextResponse.json({ proposal }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Az AI Planner most nem érhető el.";
    return NextResponse.json({ error: message }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
