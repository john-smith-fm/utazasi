import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE_NAME, hasValidAccessSession } from "@/lib/access";
import type { GroundedQuestionContext } from "@/lib/grounded-questioning";
import { answerResearchedQuestion } from "@/lib/live-question-research";
import { getPlaceBySlug } from "@/lib/places";
import { getPlaceQuestionFacts } from "@/lib/place-question-facts";
import { checkQuestionResearchRateLimit } from "@/lib/question-ai-rate-limit";
import { TIMELINE_TRIP_SLUG, timelineServerClient } from "@/lib/timeline-service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isDate(value: unknown): value is string { return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value); }

function dayBounds(date: string) {
  const start = new Date(`${date}T00:00:00+02:00`);
  return { start: start.toISOString(), end: new Date(start.getTime() + 24 * 60 * 60 * 1000).toISOString() };
}

export async function POST(request: NextRequest) {
  const accessSession = request.cookies.get(ACCESS_COOKIE_NAME)?.value;
  if (!hasValidAccessSession(accessSession)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { question?: unknown; date?: unknown } | null;
  const question = typeof body?.question === "string" ? body.question.trim() : "";
  if (!question || question.length > 500 || !isDate(body?.date)) return NextResponse.json({ error: "Érvénytelen kérdés vagy nap." }, { status: 400 });
  const rateLimit = checkQuestionResearchRateLimit(accessSession!);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Az AI-kutatás óránkénti kerete most betelt. A biztos, helyi válaszok ettől még működnek." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds), "Cache-Control": "no-store" } },
    );
  }

  try {
    const supabase = timelineServerClient();
    const { data: trip, error: tripError } = await supabase.from("trips").select("id").eq("slug", TIMELINE_TRIP_SLUG).maybeSingle();
    if (tripError) throw tripError;
    if (!trip) return NextResponse.json({ error: "Az utazás nem található." }, { status: 404 });
    const { data: day, error: dayError } = await supabase.from("days").select("id, date, title").eq("trip_id", trip.id).eq("date", body.date).maybeSingle();
    if (dayError) throw dayError;
    if (!day) return NextResponse.json({ error: "A kiválasztott nap nem található." }, { status: 404 });
    const { data: activities, error: activitiesError } = await supabase.from("timeline_activities").select("id, start_time, title, location_name, place_slug").eq("day_id", day.id).order("start_time").limit(30);
    if (activitiesError) throw activitiesError;
    const { start, end } = dayBounds(body.date);
    const { data: events, error: eventsError } = await supabase.from("events").select("id, title, starts_at, ends_at, status, place_slug").eq("trip_id", trip.id).lt("starts_at", end).or(`ends_at.is.null,ends_at.gte.${start}`).order("starts_at").limit(12);
    if (eventsError) throw eventsError;
    const placeSlugs = new Set([...(activities ?? []).map((item) => item.place_slug), ...(events ?? []).map((item) => item.place_slug)].filter((value): value is string => Boolean(value)));
    const context: GroundedQuestionContext = {
      date: day.date,
      dayTitle: day.title,
      activities: (activities ?? []).map((item) => ({ id: item.id, time: item.start_time.slice(0, 5), title: item.title, locationName: item.location_name, placeSlug: item.place_slug })),
      events: (events ?? []).map((item) => ({ id: item.id, title: item.title, startsAt: item.starts_at, endsAt: item.ends_at, status: item.status, placeSlug: item.place_slug })),
      places: [...placeSlugs].flatMap((slug) => {
        const place = getPlaceBySlug(slug);
        if (!place) return [];
        const note = place.provenance?.uncertaintyNote ?? place.provenance?.reviewStatus ?? null;
        return [{ slug: place.slug, name: place.name, type: place.type, locality: place.location?.locality ?? null, verifiedNote: note, facts: getPlaceQuestionFacts(place) }];
      }),
    };
    const answer = await answerResearchedQuestion(question, context);
    return NextResponse.json({ answer }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Az AI válasz most nem elérhető.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
