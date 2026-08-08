import tripCoreJson from "../../knowledge/trip/trip.public.json";
import type { HomeDay } from "./home-days";

type TripCoreDay = Omit<HomeDay, "activities" | "summary"> & { subtitle: string };
type TripCore = { slug: string; days: TripCoreDay[] };

export const TRIP_CORE = tripCoreJson as TripCore;
export const TRIP_CORE_DAYS: HomeDay[] = TRIP_CORE.days.map(({ subtitle, ...day }) => ({ ...day, summary: subtitle, activities: [] }));
