"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { TripSummary } from "@/domain/trip";
import { storageGet, storageSet } from "@/lib/storage";
import { ACTIVE_TRIP_CACHE_KEY, TRIP_LIST_CACHE_KEY } from "@/lib/trip-cache";

type TripLoadStatus = "loading" | "success" | "offline" | "error";

type TripContextValue = {
  trips: TripSummary[];
  activeTrip: TripSummary | null;
  status: TripLoadStatus;
  selectTrip: (slug: string) => void;
  retry: () => void;
};

const TripContext = createContext<TripContextValue | null>(null);

function preferredTrip(trips: TripSummary[], selectedSlug: string | null): TripSummary | null {
  if (!trips.length) return null;
  return trips.find((trip) => trip.slug === selectedSlug)
    ?? trips.find((trip) => trip.status === "active")
    ?? trips.find((trip) => trip.status === "upcoming")
    ?? trips.find((trip) => trip.status === "draft")
    ?? trips[0];
}

export function TripProvider({ children }: { children: ReactNode }) {
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [status, setStatus] = useState<TripLoadStatus>("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    const cachedTrips = storageGet<TripSummary[]>(TRIP_LIST_CACHE_KEY, []);
    const cachedSlug = storageGet<string | null>(ACTIVE_TRIP_CACHE_KEY, null);
    const cachedSelection = preferredTrip(cachedTrips, cachedSlug);
    if (cachedSelection) {
      setTrips(cachedTrips);
      setActiveSlug(cachedSelection.slug);
    }
    void fetch("/api/trips", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Trips request failed: ${response.status}`);
        return response.json() as Promise<{ trips: TripSummary[] }>;
      })
      .then(({ trips: remoteTrips }) => {
        if (!active) return;
        const selected = preferredTrip(remoteTrips, cachedSlug);
        setTrips(remoteTrips);
        setActiveSlug(selected?.slug ?? null);
        storageSet(TRIP_LIST_CACHE_KEY, remoteTrips);
        if (selected) storageSet(ACTIVE_TRIP_CACHE_KEY, selected.slug);
        setStatus("success");
      })
      .catch(() => {
        if (!active) return;
        setStatus(cachedTrips.length && typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error");
      });
    return () => { active = false; };
  }, [attempt]);

  const selectTrip = useCallback((slug: string) => {
    setActiveSlug((current) => {
      if (!trips.some((trip) => trip.slug === slug)) return current;
      storageSet(ACTIVE_TRIP_CACHE_KEY, slug);
      return slug;
    });
  }, [trips]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  const activeTrip = useMemo(() => preferredTrip(trips, activeSlug), [activeSlug, trips]);
  const value = useMemo(() => ({ trips, activeTrip, status, selectTrip, retry }), [activeTrip, retry, selectTrip, status, trips]);

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
}

export function useActiveTrip(): TripContextValue {
  const context = useContext(TripContext);
  if (!context) throw new Error("useActiveTrip must be used inside TripProvider.");
  return context;
}
