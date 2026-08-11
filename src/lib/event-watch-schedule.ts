import "server-only";

export const EVENT_WATCH_CHECKPOINTS_MINUTES = [60, 120, 360] as const;
const RETRY_COOLDOWN_MINUTES = 15;

export type WatchScheduleState = {
  startsAt: string;
  lastCheckedAt: string | null;
  lastSuccessAt: string | null;
};

function validTime(value: string | null | undefined) {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

/**
 * A Watch is intentionally quiet until one of the three travel-relevant
 * checkpoints. The most recent passed checkpoint wins, so a delayed runner
 * catches up once without replaying earlier checks.
 */
export function watchIsDue(state: WatchScheduleState, now = new Date()) {
  const startsAt = validTime(state.startsAt);
  const nowMs = now.getTime();
  if (!startsAt || startsAt <= nowMs) return false;

  const checkpoint = EVENT_WATCH_CHECKPOINTS_MINUTES.find((minutes) => startsAt - minutes * 60_000 <= nowMs);
  if (!checkpoint) return false;

  const lastCheckedAt = validTime(state.lastCheckedAt);
  if (lastCheckedAt && nowMs - lastCheckedAt < RETRY_COOLDOWN_MINUTES * 60_000) return false;

  const lastSuccessAt = validTime(state.lastSuccessAt);
  const checkpointAt = startsAt - checkpoint * 60_000;
  return !lastSuccessAt || lastSuccessAt < checkpointAt;
}
