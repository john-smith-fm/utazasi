import type { Place } from "@/types/places";
import {
  formatBeachLength,
  formatBeachLengthLabel,
  formatLandAccess,
  formatMarketSchedule,
  formatShoreType,
  getBeachAccessFacts,
  getBeachParkingFacts,
  getBeachPartFacts,
  getGenericAccessFacts,
  getPlaceFamilyFacts,
} from "./place-facts.ts";

/** A compact, source-backed fact that can safely cross the Place → Question
 * boundary. `id` is stable for this response only; no prose is inferred. */
export type PlaceQuestionFact = {
  id: string;
  key: string;
  label: string;
  value: string;
};

function facts(slug: string, key: string, label: string, values: readonly (string | undefined)[]) {
  return values.filter((value): value is string => Boolean(value)).map((value, index) => ({
    id: `place:${slug}:${key}${index ? `:${index}` : ""}`,
    key,
    label,
    value,
  }));
}

/**
 * This is deliberately a projection of the running Place model, not a second
 * cache or a text copy of destination_intelligence. Both deterministic answers
 * and the server-side AI context therefore see the same confirmed values.
 */
export function getPlaceQuestionFacts(place: Place): PlaceQuestionFact[] {
  if (place.details.kind === "beach") {
    const details = place.details;
    return [
      ...facts(place.slug, "shore", "Part", [formatShoreType(details.shoreType), details.shoreDescription]),
      ...facts(place.slug, "length", "Strandhossz", [formatBeachLength(details.lengthM) ?? formatBeachLengthLabel(details.lengthLabel)]),
      ...facts(place.slug, "access", "Megközelítés", [formatLandAccess(details.landAccess), ...getBeachAccessFacts(place)]),
      ...facts(place.slug, "water", "Víz", [details.waterEntry, details.shallowWater ? "Sekély víz" : undefined, details.windExposure]),
      ...facts(place.slug, "parking", "Parkolás", getBeachParkingFacts(place)),
      ...facts(place.slug, "service", "Szolgáltatás", details.confirmedServices ?? []),
      ...facts(place.slug, "family", "Családdal", [...getPlaceFamilyFacts(place), details.familyInsight]),
    ];
  }

  if (place.details.kind === "restaurant") {
    return [
      ...facts(place.slug, "food", "Kínálat", [...(place.details.mealProfiles ?? []), ...(place.details.cuisine ?? [])]),
      ...facts(place.slug, "service", "Szolgáltatás", place.details.confirmedServices ?? []),
      ...facts(place.slug, "opening", "Nyitvatartás", [place.details.openingHours, place.details.openingNote]),
    ];
  }

  return [
    ...facts(place.slug, "access", "Megközelítés", getGenericAccessFacts(place)),
    ...facts(place.slug, "parking", "Parkolás", [
      place.details.parking?.available ? "Parkoló elérhető" : undefined,
      place.details.parking?.paid === true ? "Fizetős" : place.details.parking?.paid === false ? "Ingyenes" : undefined,
      place.details.parking?.chargingWindow,
      place.details.parking?.price,
    ]),
    ...facts(place.slug, "food", "Kínálat", [...(place.details.food?.mealProfiles ?? []), ...(place.details.food?.cuisine ?? [])]),
    ...facts(place.slug, "service", "Szolgáltatás", [...(place.details.confirmedServices ?? []), ...(place.details.food?.confirmedServices ?? [])]),
    ...facts(place.slug, "opening", "Nyitvatartás", [place.details.openingHours?.join("; "), place.details.openingNote, place.details.food?.openingHours]),
    ...facts(place.slug, "market", "Piac", [formatMarketSchedule(place.details.market?.schedule), ...(place.details.market?.profiles ?? [])]),
    ...facts(place.slug, "family", "Családdal", [...getPlaceFamilyFacts(place), place.details.familyInsight]),
  ];
}
