import "server-only";

import { TIMELINE_TRIP_SLUG, timelineServerClient } from "@/lib/timeline-service";

export type WatchChange = {
  eventTitle: string;
  kind: "status_changed" | "start_time_changed" | "venue_changed";
  observedAt: string;
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
};

export type ObservedEventState = Pick<EligibleWatch, "status" | "startsAt" | "placeSlug">;

async function currentTripId(): Promise<string | null> {
  const { data, error } = await timelineServerClient().from("trips").select("id").eq("slug", TIMELINE_TRIP_SLUG).maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

/** Returns only the one most recent material change for the selected family trip. */
export async function latestWatchChange(): Promise<WatchChange | null> {
  const tripId = await currentTripId();
  if (!tripId) return null;
  const { data, error } = await timelineServerClient()
    .from("event_change_log")
    .select("change_kind, observed_at, events!inner(title, trip_id)")
    .eq("events.trip_id", tripId)
    .order("observed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const event = Array.isArray(data.events) ? data.events[0] : data.events;
  if (!event?.title) return null;
  return { eventTitle: event.title, kind: data.change_kind, observedAt: data.observed_at };
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

/** A Watch only runs for an explicitly enabled Event that already has a baseline. */
export async function eligibleEventWatches(limit: number): Promise<EligibleWatch[]> {
  const { data, error } = await timelineServerClient()
    .from("event_watch_states")
    .select("baseline_status, baseline_starts_at, baseline_place_slug, events!inner(id, title, source_url, status, starts_at, place_slug)")
    .eq("enabled", true)
    .not("baseline_status", "is", null)
    .not("baseline_starts_at", "is", null)
    .order("last_checked_at", { ascending: true, nullsFirst: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).flatMap((row) => {
    const event = Array.isArray(row.events) ? row.events[0] : row.events;
    if (!event || !row.baseline_status || !row.baseline_starts_at) return [];
    return [{ eventId: event.id, title: event.title, sourceUrl: event.source_url, status: row.baseline_status, startsAt: row.baseline_starts_at, placeSlug: row.baseline_place_slug }];
  });
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
