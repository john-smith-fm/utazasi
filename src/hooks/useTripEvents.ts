"use client";

import { useEffect, useState } from "react";
import { eventOccursOnDate } from "@/lib/event-date";
import { storageGet, storageSet } from "@/lib/storage";
import type { TripEvent } from "@/lib/event-types";

type ApiEvent = { id: string; title: string; starts_at: string; ends_at: string | null; status: TripEvent["status"]; place_slug: string | null; source_url: string; last_verified_at: string | null; accepted?: boolean };
function toTripEvent(event: ApiEvent): TripEvent { return { id: event.id, title: event.title, startsAt: event.starts_at, endsAt: event.ends_at, status: event.status, placeSlug: event.place_slug, sourceUrl: event.source_url, lastVerifiedAt: event.last_verified_at, accepted: Boolean(event.accepted) }; }

/** Reads selected-day Events through the same PIN-protected server boundary as Timeline. */
export function useTripEvents(date: string) {
  const [loaded, setLoaded] = useState<{ date: string; events: TripEvent[] }>({ date: "", events: [] });
  useEffect(() => {
    let active = true;
    const key = `utazasi-events-v1:${date}`;
    const cached = storageGet<TripEvent[]>(key, []);
    // Older app versions cached every preceding one-time Event under the
    // selected day. Revalidate the local cache before it reaches the UI.
    const cachedForDate = cached.filter((event) => eventOccursOnDate({ starts_at: event.startsAt, ends_at: event.endsAt }, date));
    if (cachedForDate.length !== cached.length) storageSet(key, cachedForDate);
    setLoaded({ date, events: cachedForDate });
    void fetch(`/api/events?date=${encodeURIComponent(date)}`, { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() as Promise<{ events: ApiEvent[] }> : { events: [] })
      .then(({ events: remote }) => { if (active) { const next = remote.map(toTripEvent); storageSet(key, next); setLoaded({ date, events: next }); } })
      .catch(() => { /* Offline retains the last known Event list. */ });
    return () => { active = false; };
  }, [date]);
  // React renders once before an effect can load the newly selected day. Do
  // not let the previous day's Event cards flash during that render.
  return loaded.date === date ? loaded.events : [];
}
