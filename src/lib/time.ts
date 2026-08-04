import { TRIP } from "@/data/trip";

export const HU_DOW = ["Vas", "Hét", "Kedd", "Sze", "Csüt", "Pén", "Szo"];
export const HU_DOW_LONG = [
  "vasárnap",
  "hétfő",
  "kedd",
  "szerda",
  "csütörtök",
  "péntek",
  "szombat",
];

export function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export interface TripNow {
  dateStr: string; // YYYY-MM-DD in trip timezone
  h: number;
  m: number;
  hm: number; // minutes since midnight
}

/** "Local" idő a desztináció időzónájában (Europe/Rome), függetlenül attól, honnan nézi a user. */
export function nowInTrip(): TripNow {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TRIP.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";

  const h = parseInt(get("hour"), 10);
  const m = parseInt(get("minute"), 10);

  return {
    dateStr: `${get("year")}-${get("month")}-${get("day")}`,
    h,
    m,
    hm: h * 60 + m,
  };
}

/** "16:30" vagy "13:00–15:00" (tartomány -> kezdés) vagy "10:00-ig" formátumból perc. */
export function timeToMinutes(t: string): number | null {
  const m = t.match(/(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

export function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}.`;
}

export function dayOfWeekShort(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return HU_DOW[d.getDay()];
}

export function dayOfWeekLong(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return HU_DOW_LONG[d.getDay()];
}

export function daysBetween(a: string, b: string): number {
  const A = new Date(a + "T00:00:00");
  const B = new Date(b + "T00:00:00");
  return Math.round((B.getTime() - A.getTime()) / 86400000);
}
