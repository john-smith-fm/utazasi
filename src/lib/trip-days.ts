import type { HomeDay } from "../data/home-days.ts";
import type { TripSummary } from "../domain/trip.ts";

const WEEKDAYS: HomeDay["weekday"][] = ["Vas", "Hét", "Kedd", "Sze", "Csü", "Pén", "Szo"];

export function tripDayShells(trip: TripSummary): HomeDay[] {
  return trip.days.map((day) => {
    const date = new Date(`${day.date}T12:00:00Z`);
    return {
      date: day.date,
      day: date.getUTCDate(),
      weekday: WEEKDAYS[date.getUTCDay()],
      title: day.title,
      summary: day.subtitle ?? "",
      activities: [],
    };
  });
}
