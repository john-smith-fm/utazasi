type EventInterval = {
  starts_at: string;
  ends_at: string | null;
};

/**
 * An Event is visible only when its concrete time interval overlaps the
 * selected local calendar day. A null end is a point-in-time Event, not an
 * Event that stays active forever.
 */
export function eventOverlapsRange(event: EventInterval, start: string, end: string) {
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  const eventStart = new Date(event.starts_at).getTime();
  const eventEnd = event.ends_at ? new Date(event.ends_at).getTime() : eventStart;

  return Number.isFinite(eventStart)
    && Number.isFinite(eventEnd)
    && eventStart < endTime
    && eventEnd >= startTime;
}
