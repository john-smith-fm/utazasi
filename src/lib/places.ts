import beachesJson from "../../knowledge/places/beaches.json";
import type { BeachPlace, Place, PlaceType } from "@/types/places";

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

const places = Object.freeze(validateBeaches(beachesJson));

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
