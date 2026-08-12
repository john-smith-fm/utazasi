import type { HomeActivity, HomeDay } from "@/data/home-days";
import type { WeatherSnapshot } from "@/types";
import type { WatchChange } from "@/lib/event-watch-service";

function todayInTripTimezone(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function currentTimeInTripTimezone(): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date());
}

function nextActivity(activities: HomeActivity[]): HomeActivity | undefined {
  const now = currentTimeInTripTimezone();
  return activities.find((activity) => /^\d{2}:\d{2}$/.test(activity.time) && activity.time >= now);
}

function watchChangeSummary(change: WatchChange): string {
  if (change.kind === "status_changed") return `Fontos változás: ${change.eventTitle} állapota megváltozott.`;
  if (change.kind === "start_time_changed") return `Fontos változás: ${change.eventTitle} időpontja módosult.`;
  return `Fontos változás: ${change.eventTitle} helyszíne módosult.`;
}

export function smartStatusSummary(day: HomeDay, weather: WeatherSnapshot | null, watchChange: WatchChange | null = null): string {
  // A Watch change is not a global Home banner. It belongs only to the
  // Timeline date(s) where that Event was explicitly accepted.
  if (watchChange?.timelineDates.includes(day.date)) return watchChangeSummary(watchChange);
  if (day.date === todayInTripTimezone()) {
    const next = nextActivity(day.activities);
    if (next) return `Következő: ${next.title}${next.place ? ` · ${next.place}` : ""}.`;
  }
  if (weather?.precipitationState === "rain") return "Csapadék várható. Érdemes rugalmas tartalékprogramot hagyni.";
  if (weather?.stale) return `${day.summary} · Korábbi időjárási adat.`;
  return day.summary;
}
