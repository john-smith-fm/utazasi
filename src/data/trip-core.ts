import tripCoreJson from "../../knowledge/trip/trip.public.json";
import type { HomeDay } from "./home-days";

type TripCoreDay = Omit<HomeDay, "activities" | "summary"> & { subtitle: string };
type TripCore = {
  slug: string;
  destination: { name: string; country: string; region: string; latitude: number; longitude: number };
  dates: { start: string; end: string; timezone: string };
  days: TripCoreDay[];
};

export const TRIP_CORE = tripCoreJson as TripCore;
export const TRIP_CORE_DAYS: HomeDay[] = TRIP_CORE.days.map(({ subtitle, ...day }) => ({ ...day, summary: subtitle, activities: [] }));

/**
 * Small runtime projection for time, weather and current-location fallbacks.
 * It intentionally derives from the versioned canonical Trip file rather than
 * maintaining a second hand-written Trip configuration.
 */
export const TRIP_RUNTIME = Object.freeze({
  startDate: TRIP_CORE.dates.start,
  endDate: TRIP_CORE.dates.end,
  timezone: TRIP_CORE.dates.timezone,
  coords: { lat: TRIP_CORE.destination.latitude, lon: TRIP_CORE.destination.longitude },
});
