import type { HomeActivity, HomeDay } from "../data/home-days";
import type { TripEvent } from "./event-types.ts";
import type { WeatherSnapshot } from "../types";
import type { Place } from "../types/places";

export type QuestionCapability =
  | "timeline"
  | "scheduled-timeline"
  | "beach"
  | "shopping"
  | "event"
  | "trip-base"
  | "weather";

export type ContextPlace = {
  activity: HomeActivity;
  place: Place;
  relation: "explicit" | "unique-name";
};

export type QuestionContext = {
  day: HomeDay;
  weather: WeatherSnapshot | null;
  events: readonly TripEvent[];
  linkedPlaces: readonly ContextPlace[];
  unresolvedActivities: readonly HomeActivity[];
  capabilities: ReadonlySet<QuestionCapability>;
};

function normalized(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("hu-HU").trim();
}

function isTimed(activity: HomeActivity) {
  return /^\d{1,2}:\d{2}$/.test(activity.time);
}

function isTripBaseActivity(activity: HomeActivity) {
  const text = normalized(`${activity.title} ${activity.place}`);
  return activity.placeSlug === "trip-base" || /\bszallas\b|apartman|ollastu/.test(text);
}

function isShoppingActivity(activity: HomeActivity) {
  return /bevasar|bolt|market|elelmiszer|uzlet/.test(normalized(`${activity.title} ${activity.place}`));
}

/**
 * A name-only link is allowed only for a single exact canonical Place name.
 * Partial names (for example just "Porto") deliberately remain unresolved;
 * a later resolver can then ask the family to choose instead of guessing.
 */
function uniquePlaceForName(name: string, places: readonly Place[]) {
  const target = normalized(name);
  if (!target) return undefined;
  const matches = places.filter((place) => normalized(place.name) === target);
  return matches.length === 1 ? matches[0] : undefined;
}

export type QuestionContextPlaceSource = {
  getPlaceBySlug?: (slug: string) => Place | undefined;
  places?: readonly Place[];
};

export function buildQuestionContext(
  day: HomeDay,
  weather: WeatherSnapshot | null,
  events: readonly TripEvent[] = [],
  placeSource: QuestionContextPlaceSource = {},
): QuestionContext {
  const linkedPlaces: ContextPlace[] = [];
  const unresolvedActivities: HomeActivity[] = [];
  const capabilities = new Set<QuestionCapability>();

  if (day.activities.length) capabilities.add("timeline");
  if (day.activities.some(isTimed)) capabilities.add("scheduled-timeline");
  if (events.length) capabilities.add("event");
  if (weather) capabilities.add("weather");

  for (const activity of day.activities) {
    const activityText = normalized(`${activity.title} ${activity.place}`);
    if (/strand|beach|tenger/.test(activityText)) capabilities.add("beach");
    const explicitPlace = activity.placeSlug ? placeSource.getPlaceBySlug?.(activity.placeSlug) : undefined;
    const uniqueNamePlace = explicitPlace ? undefined : uniquePlaceForName(activity.place, placeSource.places ?? []);
    const place = explicitPlace ?? uniqueNamePlace;
    if (!place) {
      unresolvedActivities.push(activity);
      if (isTripBaseActivity(activity)) capabilities.add("trip-base");
      if (isShoppingActivity(activity)) capabilities.add("shopping");
      continue;
    }
    linkedPlaces.push({ activity, place, relation: explicitPlace ? "explicit" : "unique-name" });
    if (place.type === "beach") capabilities.add("beach");
    if (place.type === "shop" || isShoppingActivity(activity)) capabilities.add("shopping");
  }

  return { day, weather, events, linkedPlaces, unresolvedActivities, capabilities };
}

/** At most three questions, generated from real capabilities of the selected day. */
export function questionPromptsForContext(context: QuestionContext) {
  const prompts: string[] = [];
  const activityText = context.day.activities.map((activity) => normalized(`${activity.title} ${activity.place}`)).join(" ");
  const add = (prompt: string) => {
    if (prompts.length < 3 && !prompts.includes(prompt)) prompts.push(prompt);
  };

  if (/repulo|jarat|flight/.test(activityText)) add("Mikor indul a repülő?");
  if (context.capabilities.has("event")) add("Mikor kezdődik a mai esemény?");
  if (context.capabilities.has("shopping")) add("Hova menjünk bevásárolni?");
  if (context.capabilities.has("beach")) add("Van még értelme strandolni?");
  if (context.capabilities.has("trip-base")) add("Hol van a szállásunk?");
  if (context.capabilities.has("scheduled-timeline")) add("Mi a következő program?");
  if (context.capabilities.has("timeline")) add("Mi fér még bele ma?");

  return prompts;
}
