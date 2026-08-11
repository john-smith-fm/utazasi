import { DAYS } from "@/data/days";
import { TRIP_RUNTIME } from "@/data/trip-core";
import type { Day, DayType } from "@/types";
import { daysBetween, nowInTrip } from "./time";

export function findDay(dateStr: string): Day | undefined {
  return DAYS.find((d) => d.date === dateStr);
}

/** A mai nap, vagy ha az utazáson kívül vagyunk (tesztelés / hazaérkezés után),
 *  az első vagy utolsó nap — így a UI sosem marad üres. */
export function currentOrNearestDay(): Day {
  const today = nowInTrip().dateStr;
  const day = findDay(today);
  if (day) return day;
  if (today < TRIP_RUNTIME.startDate) return DAYS[0];
  return DAYS[DAYS.length - 1];
}

export function typeLabel(type: DayType): string {
  switch (type) {
    case "strand":
      return "Egész napos strandnap";
    case "apartman":
      return "Apartmanos nap";
    case "utazas-oda":
      return "Utazás — érkezés";
    case "utazas-vissza":
      return "Utazás — hazaút";
    default:
      return type;
  }
}

export function typeClass(type: DayType): "strand" | "apartman" | "utazas" {
  if (type === "strand") return "strand";
  if (type === "apartman") return "apartman";
  return "utazas";
}

export function dayIndexLabel(day: Day): string {
  const idx = daysBetween(TRIP_RUNTIME.startDate, day.date) + 1;
  return `${idx}. nap / ${DAYS.length}`;
}
