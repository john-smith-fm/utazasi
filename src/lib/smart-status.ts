import type { HomeActivity, HomeDay } from "@/data/home-days";
import type { WeatherSnapshot } from "@/types";
import type { WatchChange } from "@/lib/event-watch-service";

function todayInTripTimezone(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

function currentTimeInTripTimezone(now: Date): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now);
}

function nextActivity(activities: HomeActivity[], now: Date): HomeActivity | undefined {
  const currentTime = currentTimeInTripTimezone(now);
  return activities.find((activity) => /^\d{2}:\d{2}$/.test(activity.time) && activity.time >= currentTime);
}

function watchChangeSummary(change: WatchChange): string {
  if (change.kind === "status_changed") return `Fontos változás: ${change.eventTitle} állapota megváltozott.`;
  if (change.kind === "start_time_changed") return `Fontos változás: ${change.eventTitle} időpontja módosult.`;
  return `Fontos változás: ${change.eventTitle} helyszíne módosult.`;
}

export function smartStatusSummary(day: HomeDay, weather: WeatherSnapshot | null, watchChange: WatchChange | null = null, now = new Date()): string {
  // A Watch change is not a global Home banner. It belongs only to the
  // Timeline date(s) where that Event was explicitly accepted.
  if (watchChange?.timelineDates.includes(day.date)) return watchChangeSummary(watchChange);

  // The header weather is the family's live, current-location context. It
  // must not rewrite the status of a different selected Timeline day.
  if (day.date !== todayInTripTimezone(now)) return day.summary;

  const next = nextActivity(day.activities, now);
  if (next) return `Következő: ${next.title}${next.place ? ` · ${next.place}` : ""}.`;
  if (weather?.precipitationState === "rain") return "Csapadék várható. Érdemes rugalmas tartalékprogramot hagyni.";
  if (weather?.stale) return `${day.summary} · Korábbi időjárási adat.`;
  return day.summary;
}
