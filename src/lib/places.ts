import beachesJson from "../../knowledge/places/beaches.json";
import restaurantsJson from "../../knowledge/places/restaurants.json";
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

    const location = isRecord(raw.location) && optionalString(raw.location.city) ? { locality: optionalString(raw.location.city) } : undefined;
    const verification = isRecord(raw.verification) ? optionalString(raw.verification.status) : undefined;

    return {
      sourceId,
      slug,
      name,
      type: "beach",
      location,
      provenance: verification ? { reviewStatus: verification } : undefined,
      details: { kind: "beach" },
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
    const verification = isRecord(raw.verification) ? raw.verification : undefined;
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
      provenance: verification ? {
        sourceUrls: optionalStringArray(verification.sources),
        reviewedAt: optionalString(verification.last_checked),
        reviewStatus: optionalString(verification.status),
      } : undefined,
      details: {
        kind: "restaurant",
        openingNote,
        contact: phones || website ? { phones, website } : undefined,
      },
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

const loadedPlaces = [...validateBeaches(beachesJson), ...validateRestaurants(restaurantsJson)];
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
