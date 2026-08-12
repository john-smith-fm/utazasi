import { getPlacesByType } from "./places";
import { getShoppingPlaceCandidates } from "./shopping-intelligence";
import type { Place, PlaceType } from "../types/places";

export type PlacePickerIntent = "shopping" | "playground" | "beach" | "restaurant" | "gelateria" | "cafe" | "sight";

export type ContextualPlaceSuggestion = {
  slug: string;
  name: string;
  meta: string;
  rationale?: string;
};

export type ContextualPlaceSuggestions = {
  intent: PlacePickerIntent | null;
  recommended: readonly ContextualPlaceSuggestion[];
  additional: readonly ContextualPlaceSuggestion[];
};

const TRIP_DESTINATION_LOCALITY = "Villasimius";

function normalized(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("hu-HU");
}

/** Intentionally small, deterministic 1.0 intent vocabulary. */
export function placePickerIntentFor(title: string): PlacePickerIntent | null {
  const value = normalized(title);
  if (/bevasar|vasarlas|elelmiszer|bolt|market|pelenk|baba|bebi|babatermek/.test(value)) return "shopping";
  if (/jatszoter|jatszohaz|gyerekprogram|gyerek/.test(value)) return "playground";
  if (/strand|furdes|tenger/.test(value)) return "beach";
  if (/ebed|vacsora|etterem/.test(value)) return "restaurant";
  if (/fagyi|fagyizo|gelato|gelateria/.test(value)) return "gelateria";
  if (/kave|kavezo|reggeli/.test(value)) return "cafe";
  if (/seta|latnivalo|kirandulas|muzeum/.test(value)) return "sight";
  return null;
}

function labelFor(type: PlaceType) {
  return ({ beach: "Strand", restaurant: "Étterem", cafe: "Kávézó", playground: "Játszótér", shop: "Bolt", sight: "Látnivaló", parking: "Parkolás", other: "Hely" } satisfies Record<PlaceType, string>)[type];
}

function toSuggestion(place: Place, rationale?: string): ContextualPlaceSuggestion {
  return {
    slug: place.slug,
    name: place.name,
    meta: [place.location?.locality, labelFor(place.type)].filter(Boolean).join(" · "),
    rationale,
  };
}

function uniqueByName(places: readonly Place[]) {
  const names = new Set<string>();
  return places.filter((place) => {
    const name = normalized(place.name);
    if (names.has(name)) return false;
    names.add(name);
    return true;
  });
}

function destinationFirst(places: readonly Place[]) {
  return [...places].sort((left, right) => {
    const leftLocal = left.location?.locality === TRIP_DESTINATION_LOCALITY ? 0 : 1;
    const rightLocal = right.location?.locality === TRIP_DESTINATION_LOCALITY ? 0 : 1;
    return leftLocal - rightLocal || left.name.localeCompare(right.name, "hu");
  });
}

function typeForIntent(intent: Exclude<PlacePickerIntent, "shopping" | "gelateria">): PlaceType {
  return ({ playground: "playground", beach: "beach", restaurant: "restaurant", cafe: "cafe", sight: "sight" } satisfies Record<Exclude<PlacePickerIntent, "shopping" | "gelateria">, PlaceType>)[intent];
}

function placesFor(intent: Exclude<PlacePickerIntent, "shopping">) {
  if (intent === "gelateria") {
    return destinationFirst(uniqueByName(getPlacesByType("cafe").filter((place) => /gelat|fagyi/i.test(place.name))));
  }
  return destinationFirst(uniqueByName(getPlacesByType(typeForIntent(intent))));
}

function genericSuggestions(intent: Exclude<PlacePickerIntent, "shopping">): ContextualPlaceSuggestions {
  const candidates = placesFor(intent).map((place) => toSuggestion(place));
  return { intent, recommended: candidates.slice(0, 5), additional: candidates.slice(5) };
}

function shoppingSuggestions(title: string): ContextualPlaceSuggestions {
  const result = getShoppingPlaceCandidates(title);
  if (!result) return { intent: "shopping", recommended: [], additional: [] };
  return {
    intent: "shopping",
    recommended: result.recommended.map(({ place, rationale }) => toSuggestion(place, rationale)),
    additional: result.additional.map(({ place, rationale }) => toSuggestion(place, rationale)),
  };
}

export function contextualPlaceSuggestionsFor(title: string): ContextualPlaceSuggestions {
  const intent = placePickerIntentFor(title);
  if (!intent) return { intent: null, recommended: [], additional: [] };
  if (intent === "shopping") return shoppingSuggestions(title);
  return genericSuggestions(intent);
}
