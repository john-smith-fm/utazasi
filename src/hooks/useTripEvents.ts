"use client";

import { useEffect, useState } from "react";
import { storageGet, storageSet } from "@/lib/storage";
import type { TripEvent } from "@/lib/event-types";

type ApiEvent = { id: string; title: string; starts_at: string; ends_at: string | null; status: TripEvent["status"]; place_slug: string | null; source_url: string; last_verified_at: string | null };
function toTripEvent(event: ApiEvent): TripEvent { return { id: event.id, title: event.title, startsAt: event.starts_at, endsAt: event.ends_at, status: event.status, placeSlug: event.place_slug, sourceUrl: event.source_url, lastVerifiedAt: event.last_verified_at }; }

/** Reads selected-day Events through the same PIN-protected server boundary as Timeline. */
export function useTripEvents(date: string) {
  const [events, setEvents] = useState<TripEvent[]>([]);
  useEffect(() => {
    let active = true;
    const key = `utazasi-events-v1:${date}`;
    const cached = storageGet<TripEvent[]>(key, []);
    setEvents(cached);
    void fetch(`/api/events?date=${encodeURIComponent(date)}`, { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() as Promise<{ events: ApiEvent[] }> : { events: [] })
      .then(({ events: remote }) => { if (active) { const next = remote.map(toTripEvent); storageSet(key, next); setEvents(next); } })
      .catch(() => { /* Offline retains the last known Event list. */ });
    return () => { active = false; };
  }, [date]);
  return events;
}
