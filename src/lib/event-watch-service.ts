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
