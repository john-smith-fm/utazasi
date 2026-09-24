import "server-only";

import { normalizeTripSlug, type TripRef } from "@/domain/trip";
import { serverDatabaseClient } from "@/lib/server-database";

// Compatibility default lives only at the application boundary. Domain and
// feature services receive an explicit Trip slug.
export const DEFAULT_TRIP_SLUG = "sardinia-family-2026";

export type TripServiceResult<T> = { data: T } | { error: string; status: number };

export function requestedTripSlug(value: unknown): TripServiceResult<string> {
  if (value === null || value === undefined || value === "") return { data: DEFAULT_TRIP_SLUG };
  const slug = normalizeTripSlug(value);
  return slug ? { data: slug } : { error: "Érvénytelen utazásazonosító.", status: 400 };
}

export async function resolveTripRef(slug: string): Promise<TripServiceResult<TripRef>> {
  const normalized = normalizeTripSlug(slug);
  if (!normalized) return { error: "Érvénytelen utazásazonosító.", status: 400 };
  const { data, error } = await serverDatabaseClient().from("trips").select("id, slug").eq("slug", normalized).maybeSingle();
  if (error) throw error;
  return data ? { data } : { error: "Az utazás nem található.", status: 404 };
}
