import type { HomeDay } from "../data/home-days.ts";
import { buildDayEditorialContext, dayDisplayContext, type DayEditorialTrip } from "./day-display-context.ts";
import { getPlaceBySlug } from "./places.ts";
import type { EditorialCopyInput, TripEditorialBeat } from "./editorial-copy-contract.ts";

function secondaryShape(context: ReturnType<typeof buildDayEditorialContext>): EditorialCopyInput["secondaryShape"] {
  if (context.signals.includes("evening_event")) return "event_evening";
  if (context.signals.includes("relaxed_day")) return "relaxed";
  if (context.signals.includes("busy_day")) return "busy";
  if (context.signals.includes("empty_day")) return "open";
  return "simple";
}

function publicMainPlace(context: ReturnType<typeof buildDayEditorialContext>) {
  return context.dominantActivity?.placeSlug ? getPlaceBySlug(context.dominantActivity.placeSlug) ?? null : null;
}

/** Builds a compact public-fact-only brief. It never serializes raw activity
 * descriptions, private addresses or another day's actual Timeline. */
export function buildEditorialCopyInput(day: HomeDay, trip: DayEditorialTrip, tripDays: readonly HomeDay[]): EditorialCopyInput {
  const context = buildDayEditorialContext(day, trip, tripDays);
  const event = context.timeline.find((activity) => activity.localEvent || activity.sourceEventId);
  const previousDays = tripDays.filter((item) => item.date < day.date).sort((left, right) => left.date.localeCompare(right.date)).slice(-4);
  // A Timeline activity may contain a free-text location (including the private
  // accommodation). Only surface a canonical public Place name to the model.
  const dominantPlace = publicMainPlace(context);
  const editorialDays = [...tripDays.filter((item) => item.date !== day.date), day].sort((left, right) => left.date.localeCompare(right.date));
  const seenPlaces = new Map<string, { lastIndex: number }>();
  const tripEditorialSummary = editorialDays.map((item, index) => {
    const itemContext = buildDayEditorialContext(item, trip, editorialDays);
    const itemPlace = publicMainPlace(itemContext);
    const previous = itemPlace ? seenPlaces.get(itemPlace.slug) : undefined;
    const placeOccurrence: TripEditorialBeat["placeOccurrence"] = !itemPlace ? null : !previous ? "first" : previous.lastIndex === index - 1 ? "consecutive_return" : "return";
    if (itemPlace) seenPlaces.set(itemPlace.slug, { lastIndex: index });
    return {
      dayNumber: itemContext.tripDayNumber,
      phase: itemContext.tripPhase,
      signals: itemContext.signals,
      mainActivityType: itemContext.dominantActivityType ?? null,
      mainPlaceName: itemPlace?.name ?? null,
      placeOccurrence,
    };
  });
  return {
    date: context.date,
    day: { number: context.tripDayNumber, total: context.tripDayCount, phase: context.tripPhase },
    signals: context.signals,
    mainActivity: context.dominantActivity
      ? { type: context.dominantActivityType ?? "general", placeName: dominantPlace?.name ?? null }
      : null,
    secondaryShape: secondaryShape(context),
    verifiedEvent: event ? { title: event.title, time: event.time || null } : null,
    // A Place adatlap felszereltsége nem napi programtény. A szerkesztői
    // fejléc csak a nap ívéről szólhat, ezért nem kap például parkolás-,
    // vasútállomás- vagy akadálymentességi háttéradatokat.
    placeFacts: [],
    // Stable deterministic previous copy is deliberately used as style context.
    // Previously generated LLM copy is not fed back in: opening days in a
    // different order must not create a new fingerprint or rewrite a day.
    recentEditorialCopy: previousDays.map((item) => {
      const copy = dayDisplayContext(item, trip, tripDays);
      return { title: copy.title, subtitle: copy.summary };
    }),
    tripEditorialSummary,
  };
}
