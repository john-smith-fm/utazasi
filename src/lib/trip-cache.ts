import { normalizeTripSlug } from "../domain/trip.ts";

const V2_CACHE_PREFIX = "utazasi:v2";

function safeTripSlug(tripSlug: string): string {
  const normalized = normalizeTripSlug(tripSlug);
  if (!normalized) throw new Error("Invalid Trip slug for cache key.");
  return normalized;
}

export function tripCacheNamespace(tripSlug: string): string {
  return `${V2_CACHE_PREFIX}:trip:${safeTripSlug(tripSlug)}`;
}

export function timelineDayCacheKey(tripSlug: string, date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Invalid Timeline date for cache key.");
  return `${tripCacheNamespace(tripSlug)}:timeline:day:${date}`;
}

export function tripTimelineCacheKey(tripSlug: string): string {
  return `${tripCacheNamespace(tripSlug)}:timeline:all`;
}

export function tripEventsDayCacheKey(tripSlug: string, date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Invalid Event date for cache key.");
  return `${tripCacheNamespace(tripSlug)}:events:day:${date}`;
}

export const ACTIVE_TRIP_CACHE_KEY = `${V2_CACHE_PREFIX}:active-trip`;
export const TRIP_LIST_CACHE_KEY = `${V2_CACHE_PREFIX}:trips`;
