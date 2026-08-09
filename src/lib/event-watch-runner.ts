import "server-only";

import { eligibleEventWatches, recordWatchFailure, recordWatchObservation } from "@/lib/event-watch-service";
import { researchEventState } from "@/lib/event-watch-research";

function runLimit() {
  const configured = Number(process.env.WATCH_MAX_EVENTS_PER_RUN ?? 2);
  return Number.isInteger(configured) ? Math.min(Math.max(configured, 1), 3) : 2;
}

/** One safe scheduled pass; errors remain per-event and never trigger notifications. */
export async function runEventWatchPass() {
  const watches = await eligibleEventWatches(runLimit());
  let changed = 0;
  let failed = 0;
  for (const watch of watches) {
    try {
      const observed = await researchEventState(watch);
      const result = await recordWatchObservation(watch, observed);
      changed += result.changed;
    } catch (error) {
      failed += 1;
      await recordWatchFailure(watch.eventId, error instanceof Error ? error.message : "Ismeretlen Watch hiba.");
    }
  }
  return { checked: watches.length, changed, failed, limit: runLimit() };
}
