import routesJson from "../../knowledge/mobility/routes.json";
import { getPlaceBySlug } from "@/lib/places";
import type { MobilityMode, RouteEstimate } from "@/types/mobility";

type UnknownRecord = Record<string, unknown>;
const TRIP_BASE_SLUG = "trip-base";

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, label: string) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Érvénytelen kanonikus útvonaladat: ${label}`);
  }
  return value;
}

function requiredPositiveNumber(value: unknown, label: string) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error(`Érvénytelen kanonikus útvonaladat: ${label}`);
  }
  return value;
}

function isKnownEndpoint(slug: string) {
  return slug === TRIP_BASE_SLUG || Boolean(getPlaceBySlug(slug));
}

function validateRoutes(source: unknown): RouteEstimate[] {
  if (!isRecord(source) || !Array.isArray(source.routes)) {
    throw new Error("Érvénytelen kanonikus útvonaladatfájl.");
  }

  const keys = new Set<string>();
  return source.routes.map((raw, index) => {
    if (!isRecord(raw)) throw new Error(`Érvénytelen kanonikus útvonalrekord: ${index + 1}.`);

    const fromSlug = requiredString(raw.from_slug, `routes[${index}].from_slug`);
    const toSlug = requiredString(raw.to_slug, `routes[${index}].to_slug`);
    const mode = requiredString(raw.mode, `routes[${index}].mode`);
    const sourceUrl = requiredString(raw.source_url, `routes[${index}].source_url`);
    const checkedAt = requiredString(raw.checked_at, `routes[${index}].checked_at`);

    if (fromSlug === toSlug) throw new Error(`Az útvonal kiinduló- és célhelye azonos: ${fromSlug}.`);
    if (!isKnownEndpoint(fromSlug) || !isKnownEndpoint(toSlug)) {
      throw new Error(`Ismeretlen kanonikus útvonal-végpont: ${fromSlug} → ${toSlug}.`);
    }
    if (mode !== "driving" && mode !== "walking") {
      throw new Error(`Érvénytelen útvonal közlekedési mód: ${mode}.`);
    }
    try {
      new URL(sourceUrl);
    } catch {
      throw new Error(`Érvénytelen útvonal-forrás URL: ${sourceUrl}.`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(checkedAt)) {
      throw new Error(`Érvénytelen útvonal ellenőrzési dátum: ${checkedAt}.`);
    }

    const key = `${fromSlug}:${toSlug}:${mode}`;
    if (keys.has(key)) throw new Error(`Duplikált kanonikus útvonal: ${key}.`);
    keys.add(key);

    return {
      fromSlug,
      toSlug,
      mode: mode as MobilityMode,
      distanceKm: requiredPositiveNumber(raw.distance_km, `routes[${index}].distance_km`),
      durationMinutes: requiredPositiveNumber(raw.duration_minutes, `routes[${index}].duration_minutes`),
      sourceUrl,
      checkedAt,
    };
  });
}

const routes = Object.freeze(validateRoutes(routesJson));

export function getRouteEstimates(): readonly RouteEstimate[] {
  return routes;
}

/** Returns only an explicitly approved directional route; missing data stays unavailable. */
export function getRouteEstimate(fromSlug: string, toSlug: string, mode: MobilityMode = "driving"): RouteEstimate | undefined {
  return routes.find((route) => route.fromSlug === fromSlug && route.toSlug === toSlug && route.mode === mode);
}

export { TRIP_BASE_SLUG };
