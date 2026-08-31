export type TripDateRange = {
  startDate: string;
  endDate: string;
  timezone: string;
};

function localCalendarDate(now: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "00";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

/**
 * Chooses an initial Timeline day in the trip's local calendar, not in the
 * viewer's device timezone or UTC. It is deliberately pure: after mount the
 * selected-day state belongs to the user and this function is not re-applied.
 */
export function initialTripDate(trip: TripDateRange, now = new Date()) {
  const today = localCalendarDate(now, trip.timezone);
  if (today < trip.startDate) return trip.startDate;
  if (today > trip.endDate) return trip.endDate;
  return today;
}
