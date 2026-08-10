import beachesJson from "../../knowledge/places/beaches.json";
import restaurantsJson from "../../knowledge/places/restaurants.json";
import sightsJson from "../../knowledge/places/sights.json";
import playgroundsJson from "../../knowledge/places/playgrounds.json";
import cafesJson from "../../knowledge/places/cafes.json";
import shopsJson from "../../knowledge/places/shops.json";
import otherJson from "../../knowledge/places/other.json";
import parkingJson from "../../knowledge/places/parking.json";
import type { BeachPlace, Place, PlaceType, RestaurantPlace } from "@/types/places";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, label: string) {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`Érvénytelen kanonikus place adat: ${label}`);
  return value;
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

function optionalStringArray(value: unknown) {
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value.filter((item) => item.trim() !== "") : undefined;
}

function optionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function optionalBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function optionalNavigation(value: unknown) {
  if (!isRecord(value)) return undefined;
  const mapsUrl = optionalString(value.maps_url);
  const directionsUrl = optionalString(value.directions_url);
  return mapsUrl || directionsUrl ? { mapsUrl, directionsUrl } : undefined;
}

/** A Maps search hand-off is derived only from an already-approved place name
 * and locality. It deliberately does not claim a route, coordinate or duration. */
function mapsSearchNavigation(name: string, location?: { locality?: string; address?: string }) {
  const query = [name, location?.address ?? location?.locality].filter(Boolean).join(", ");
  return query ? { mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` } : undefined;
}

function navigationFor(raw: UnknownRecord, name: string, location?: { locality?: string; address?: string }) {
  return optionalNavigation(raw.google_maps) ?? mapsSearchNavigation(name, location);
}

function provenanceFor(value: unknown) {
  if (Array.isArray(value)) {
    const entries = value.filter(isRecord);
    const sourceUrls = entries.map((entry) => optionalString(entry.url)).filter((url): url is string => Boolean(url));
    const reviewedAt = entries.map((entry) => optionalString(entry.checked_at)).find(Boolean);
    return sourceUrls.length || reviewedAt ? { sourceUrls, reviewedAt } : undefined;
  }
  if (!isRecord(value)) return undefined;
  const sourceUrls = optionalStringArray(value.sources);
  const reviewedAt = optionalString(value.last_checked);
  const reviewStatus = optionalString(value.status);
  const uncertaintyNote = optionalString(value.uncertainty_note);
  return sourceUrls || reviewedAt || reviewStatus || uncertaintyNote
    ? { sourceUrls, reviewedAt, reviewStatus, uncertaintyNote }
    : undefined;
}

function intelligenceFor(raw: UnknownRecord) {
  const coverage = isRecord(raw.coverage)
    ? Object.fromEntries(Object.entries(raw.coverage).filter((entry): entry is [string, string] => typeof entry[1] === "string"))
    : undefined;
  const openQuestions = optionalStringArray(raw.open_questions);
  const cover = isRecord(raw.cover_image) ? raw.cover_image : undefined;
  const evidence = Array.isArray(raw.provenance)
    ? raw.provenance.filter(isRecord).map((entry) => ({
      sourceType: optionalString(entry.source_type),
      url: optionalString(entry.url),
      supports: optionalStringArray(entry.supports),
      checkedAt: optionalString(entry.checked_at),
    }))
    : undefined;
  const details = isRecord(raw.destination_intelligence) ? raw.destination_intelligence : undefined;
  const coverImage = cover ? {
    assetUrl: optionalString(cover.asset_url),
    sourceUrl: optionalString(cover.source_url),
    sourceType: optionalString(cover.source_type),
    license: optionalString(cover.license),
    attribution: optionalString(cover.attribution),
    checkedAt: optionalString(cover.checked_at),
  } : undefined;
  const checkedAt = optionalString(raw.checked_at);

  return coverage || openQuestions || coverImage || evidence || details || checkedAt
    ? { coverage, openQuestions, coverImage, evidence, details, checkedAt }
    : undefined;
}

function validateBeaches(source: unknown): BeachPlace[] {
  if (!isRecord(source) || !Array.isArray(source.places)) throw new Error("Érvénytelen kanonikus beach adatfájl.");
  const slugs = new Set<string>();

  return source.places.map((raw, index) => {
    if (!isRecord(raw)) throw new Error(`Érvénytelen kanonikus beach rekord: ${index + 1}.`);
    const sourceId = requiredString(raw.id, `places[${index}].id`);
    const slug = requiredString(raw.slug, `places[${index}].slug`);
    const name = requiredString(raw.name, `places[${index}].name`);
    if (raw.category !== "beach") throw new Error(`Érvénytelen beach kategória: ${slug}.`);
    if (slugs.has(slug)) throw new Error(`Duplikált place slug: ${slug}.`);
    slugs.add(slug);

    const rawLocation = isRecord(raw.location) ? raw.location : undefined;
    const location = rawLocation ? {
      locality: optionalString(rawLocation.city),
      address: optionalString(rawLocation.address),
      latitude: optionalNumber(rawLocation.latitude),
      longitude: optionalNumber(rawLocation.longitude),
    } : undefined;
    const rawAccess = isRecord(raw.access) ? raw.access : undefined;
    const access = rawAccess ? {
      characteristics: optionalStringArray(rawAccess.characteristics),
      serpentineRoad: optionalBoolean(rawAccess.serpentineRoad),
      dirtRoad: optionalBoolean(rawAccess.dirtRoad),
      mainRoad: optionalBoolean(rawAccess.mainRoad),
      coastalRoad: optionalBoolean(rawAccess.coastalRoad),
      parkingNotes: optionalString(rawAccess.parkingNotes),
      notes: optionalString(rawAccess.notes),
    } : undefined;

    return {
      sourceId,
      slug,
      name,
      type: "beach",
      location,
      navigation: navigationFor(raw, name, location),
      provenance: provenanceFor(raw.provenance ?? raw.verification),
      intelligence: intelligenceFor(raw),
      details: { kind: "beach", access },
    };
  });
}

function validateRestaurants(source: unknown): RestaurantPlace[] {
  if (!isRecord(source) || !Array.isArray(source.places)) throw new Error("Érvénytelen kanonikus restaurant adatfájl.");
  const slugs = new Set<string>();

  return source.places.map((raw, index) => {
    if (!isRecord(raw)) throw new Error(`Érvénytelen kanonikus restaurant rekord: ${index + 1}.`);
    const sourceId = requiredString(raw.id, `places[${index}].id`);
    const slug = requiredString(raw.slug, `places[${index}].slug`);
    const name = requiredString(raw.name, `places[${index}].name`);
    const subcategory = optionalString(raw.subcategory);
    if (raw.category !== "food" || !subcategory?.startsWith("restaurant")) throw new Error(`Érvénytelen restaurant kategória: ${slug}.`);
    if (slugs.has(slug)) throw new Error(`Duplikált place slug: ${slug}.`);
    slugs.add(slug);

    const rawLocation = isRecord(raw.location) ? raw.location : undefined;
    const location = rawLocation ? {
      locality: optionalString(rawLocation.city),
      address: optionalString(rawLocation.address),
      latitude: optionalNumber(rawLocation.latitude),
      longitude: optionalNumber(rawLocation.longitude),
    } : undefined;
    const openingHours = isRecord(raw.opening_hours) ? raw.opening_hours : undefined;
    const contact = isRecord(raw.contact) ? raw.contact : undefined;
    const phones = contact ? optionalStringArray(contact.phone) : undefined;
    const website = contact ? optionalString(contact.website) : undefined;
    const openingNote = openingHours ? optionalString(openingHours.seasonal_or_exception_note) : undefined;

    return {
      sourceId,
      slug,
      name,
      type: "restaurant",
      location,
      navigation: navigationFor(raw, name, location),
      provenance: provenanceFor(raw.provenance ?? raw.verification),
      intelligence: intelligenceFor(raw),
      details: {
        kind: "restaurant",
        openingNote,
        contact: phones || website ? { phones, website } : undefined,
      },
    };
  });
}

type GenericPlaceType = Exclude<PlaceType, "beach" | "restaurant">;

function validateGenericPlaces(source: unknown, type: GenericPlaceType, category: string, label: string): Place[] {
  if (!isRecord(source) || !Array.isArray(source.places)) throw new Error(`Érvénytelen kanonikus ${label} adatfájl.`);
  const slugs = new Set<string>();

  return source.places.map((raw, index) => {
    if (!isRecord(raw)) throw new Error(`Érvénytelen kanonikus ${label} rekord: ${index + 1}.`);
    const sourceId = requiredString(raw.id, `places[${index}].id`);
    const slug = requiredString(raw.slug, `places[${index}].slug`);
    const name = requiredString(raw.name, `places[${index}].name`);
    if (raw.category !== category) throw new Error(`Érvénytelen ${label} kategória: ${slug}.`);
    if (slugs.has(slug)) throw new Error(`Duplikált ${label} slug: ${slug}.`);
    slugs.add(slug);

    const rawLocation = isRecord(raw.location) ? raw.location : undefined;
    const location = rawLocation ? {
      locality: optionalString(rawLocation.city),
      address: optionalString(rawLocation.address),
      latitude: optionalNumber(rawLocation.latitude),
      longitude: optionalNumber(rawLocation.longitude),
    } : undefined;

    return {
      sourceId,
      slug,
      name,
      type,
      location,
      navigation: navigationFor(raw, name, location),
      provenance: provenanceFor(raw.provenance ?? raw.verification),
      intelligence: intelligenceFor(raw),
      details: { kind: type },
    };
  });
}

function assertUniqueSlugs(records: readonly Place[]) {
  const slugs = new Set<string>();
  records.forEach((place) => {
    if (slugs.has(place.slug)) throw new Error(`Duplikált place slug: ${place.slug}.`);
    slugs.add(place.slug);
  });
}

const loadedPlaces = [
  ...validateBeaches(beachesJson),
  ...validateRestaurants(restaurantsJson),
  ...validateGenericPlaces(sightsJson, "sight", "sight", "sight"),
  ...validateGenericPlaces(playgroundsJson, "playground", "playground", "playground"),
  ...validateGenericPlaces(cafesJson, "cafe", "cafe", "cafe"),
  ...validateGenericPlaces(shopsJson, "shop", "shop", "shop"),
  ...validateGenericPlaces(parkingJson, "parking", "parking", "parking"),
  ...validateGenericPlaces(otherJson, "other", "other", "other"),
];
assertUniqueSlugs(loadedPlaces);
const places = Object.freeze(loadedPlaces);

export function getPlaces(): readonly Place[] {
  return places;
}

export function getPlacesByType(type: PlaceType): readonly Place[] {
  return places.filter((place) => place.type === type);
}

export function getPlaceBySlug(slug: string): Place | undefined {
  return places.find((place) => place.slug === slug);
}

export function toPlaceSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
