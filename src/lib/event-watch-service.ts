import "server-only";

import { TIMELINE_TRIP_SLUG, timelineServerClient } from "@/lib/timeline-service";
import { watchIsDue } from "@/lib/event-watch-schedule";

export type WatchChange = {
  eventTitle: string;
  kind: "status_changed" | "start_time_changed" | "venue_changed";
  observedAt: string;
  /** A change is relevant only on the day(s) where the Event is in the Timeline. */
  timelineDates: string[];
};

export type BrowserPushSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

type EligibleWatch = {
  eventId: string;
  title: string;
  sourceUrl: string;
  status: "scheduled" | "changed" | "cancelled";
  startsAt: string;
  placeSlug: string | null;
  lastCheckedAt: string | null;
  lastSuccessAt: string | null;
};

export type ObservedEventState = Pick<EligibleWatch, "status" | "startsAt" | "placeSlug">;

async function currentTripId(): Promise<string | null> {
  const { data, error } = await timelineServerClient().from("trips").select("id").eq("slug", TIMELINE_TRIP_SLUG).maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

/**
 * Returns the most recent material change together with the Timeline day(s)
 * that accepted the Event. The UI must not surface a Sep 7 change while the
 * family is viewing Sep 2.
 */
export async function latestWatchChange(timelineDate?: string): Promise<WatchChange | null> {
  const tripId = await currentTripId();
  if (!tripId) return null;

  // On Home we ask for the selected day, rather than first choosing the most
  // recent change globally. Otherwise a newer Sep 7 change could hide an
  // older, still-relevant change on the Sep 2 day the family is viewing.
  let acceptedEventIds: string[] | null = null;
  if (timelineDate) {
    const { data: acceptedActivities, error: acceptedError } = await timelineServerClient()
      .from("timeline_activities")
      .select("source_event_id, days!inner(date)")
      .eq("days.date", timelineDate)
      .not("source_event_id", "is", null);
    if (acceptedError) throw acceptedError;
    acceptedEventIds = [...new Set((acceptedActivities ?? []).flatMap((activity) => activity.source_event_id ? [activity.source_event_id] : []))];
    if (acceptedEventIds.length === 0) return null;
  }

  let changeQuery = timelineServerClient()
    .from("event_change_log")
    .select("change_kind, observed_at, events!inner(id, title, trip_id)")
    .eq("events.trip_id", tripId)
    .order("observed_at", { ascending: false })
    .limit(1);
  if (acceptedEventIds) changeQuery = changeQuery.in("event_id", acceptedEventIds);
  const { data, error } = await changeQuery.maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const event = Array.isArray(data.events) ? data.events[0] : data.events;
  if (!event?.title || !event.id) return null;
  const { data: activities, error: activitiesError } = await timelineServerClient()
    .from("timeline_activities")
    .select("days!inner(date)")
    .eq("source_event_id", event.id);
  if (activitiesError) throw activitiesError;
  const timelineDates = [...new Set((activities ?? []).flatMap((activity) => {
    const day = Array.isArray(activity.days) ? activity.days[0] : activity.days;
    return day?.date ? [day.date] : [];
  }))].sort();
  return { eventTitle: event.title, kind: data.change_kind, observedAt: data.observed_at, timelineDates };
}

function isValidSubscription(value: unknown): value is BrowserPushSubscription {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<BrowserPushSubscription>;
  return typeof candidate.endpoint === "string" && candidate.endpoint.startsWith("https://")
    && typeof candidate.keys?.p256dh === "string" && candidate.keys.p256dh.length > 0
    && typeof candidate.keys?.auth === "string" && candidate.keys.auth.length > 0;
}

/** Server-only persistence; permission and PushManager calls remain client-side user actions. */
export async function savePushSubscription(value: unknown, userAgent: string | null) {
  if (!isValidSubscription(value)) return { error: "Érvénytelen értesítési feliratkozás.", status: 400 } as const;
  const tripId = await currentTripId();
  if (!tripId) return { error: "Az utazás nem található.", status: 404 } as const;
  const { error } = await timelineServerClient().from("push_subscriptions").upsert({
    trip_id: tripId,
    endpoint: value.endpoint,
    subscription: value,
    user_agent: userAgent,
    revoked_at: null,
  }, { onConflict: "endpoint" });
  if (error) throw error;
  return { data: { saved: true } } as const;
}

/**
 * A Watch runs only for a baseline-backed Event which the family has accepted
 * into its Timeline. `enabled` is set by that acceptance path; the Timeline
 * join is retained as a defensive check for old runtime data as well.
 */
export async function eligibleEventWatches(limit: number): Promise<EligibleWatch[]> {
  const { data, error } = await timelineServerClient()
    .from("event_watch_states")
    .select("baseline_status, baseline_starts_at, baseline_place_slug, last_checked_at, last_success_at, events!inner(id, title, source_url, status, starts_at, place_slug)")
    .eq("enabled", true)
    .not("baseline_status", "is", null)
    .not("baseline_starts_at", "is", null);
  if (error) throw error;
  const candidates = (data ?? []).flatMap((row) => {
    const event = Array.isArray(row.events) ? row.events[0] : row.events;
    if (!event || !row.baseline_status || !row.baseline_starts_at) return [];
    return [{
      eventId: event.id,
      title: event.title,
      sourceUrl: event.source_url,
      status: row.baseline_status,
      startsAt: row.baseline_starts_at,
      placeSlug: row.baseline_place_slug,
      lastCheckedAt: row.last_checked_at,
      lastSuccessAt: row.last_success_at,
    }];
  });
  if (candidates.length === 0) return [];

  const { data: acceptedActivities, error: acceptedError } = await timelineServerClient()
    .from("timeline_activities")
    .select("source_event_id")
    .in("source_event_id", candidates.map((candidate) => candidate.eventId));
  if (acceptedError) throw acceptedError;
  const acceptedIds = new Set((acceptedActivities ?? []).flatMap((activity) => activity.source_event_id ? [activity.source_event_id] : []));
  return candidates
    .filter((candidate) => acceptedIds.has(candidate.eventId))
    .filter((candidate) => watchIsDue(candidate))
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt))
    .slice(0, limit);
}


function fingerprint(eventId: string, kind: string, previous: unknown, next: unknown) {
  // Dynamic import keeps Node crypto out of the client bundle; this module is server-only.
  return `${eventId}:${kind}:${JSON.stringify(previous)}:${JSON.stringify(next)}`;
}

/**
 * Persists a successful observation. It never edits the Event or Timeline: a
 * later human decision can use the change log as evidence before doing so.
 */
export async function recordWatchObservation(watch: EligibleWatch, observed: ObservedEventState, checkedAt = new Date().toISOString()) {
  const previous = { status: watch.status, startsAt: watch.startsAt, placeSlug: watch.placeSlug };
  const changes: Array<{ kind: "status_changed" | "start_time_changed" | "venue_changed"; previous: Record<string, string | null>; next: Record<string, string | null> }> = [];
  if (previous.status !== observed.status) changes.push({ kind: "status_changed", previous: { status: previous.status }, next: { status: observed.status } });
  if (previous.startsAt !== observed.startsAt) changes.push({ kind: "start_time_changed", previous: { startsAt: previous.startsAt }, next: { startsAt: observed.startsAt } });
  if (previous.placeSlug !== observed.placeSlug) changes.push({ kind: "venue_changed", previous: { placeSlug: previous.placeSlug }, next: { placeSlug: observed.placeSlug } });

  const supabase = timelineServerClient();
  for (const change of changes) {
    const { error } = await supabase.from("event_change_log").upsert({
      event_id: watch.eventId,
      change_kind: change.kind,
      change_fingerprint: fingerprint(watch.eventId, change.kind, change.previous, change.next),
      previous_snapshot: change.previous,
      next_snapshot: change.next,
      observed_at: checkedAt,
    }, { onConflict: "change_fingerprint", ignoreDuplicates: true });
    if (error) throw error;
  }
  const { error } = await supabase.from("event_watch_states").update({
    baseline_status: observed.status,
    baseline_starts_at: observed.startsAt,
    baseline_place_slug: observed.placeSlug,
    last_checked_at: checkedAt,
    last_success_at: checkedAt,
    last_error: null,
  }).eq("event_id", watch.eventId);
  if (error) throw error;
  return { changed: changes.length };
}

export async function recordWatchFailure(eventId: string, message: string, checkedAt = new Date().toISOString()) {
  const { error } = await timelineServerClient().from("event_watch_states").update({
    last_checked_at: checkedAt,
    last_error: message.slice(0, 500),
  }).eq("event_id", eventId);
  if (error) throw error;
}
