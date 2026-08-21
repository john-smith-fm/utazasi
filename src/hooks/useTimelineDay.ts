"use client";

import { useCallback, useEffect, useState } from "react";
import type { HomeActivity, HomeDay } from "@/data/home-days";
import { storageGet, storageSet } from "@/lib/storage";

export type TimelineLoadState = "loading" | "success" | "empty" | "offline" | "error";

export type TimelineActivityResult = {
  id: string;
  start_time: string;
  start_time_precision: "exact" | "approximate" | "period";
  time_label: "Reggel" | "Délelőtt" | "Délután" | "Este" | null;
  duration_minutes: number;
  title: string;
  description: string | null;
  location_name: string | null;
  place_slug: string | null;
  source_event_id: string | null;
  kind: "plan" | "travel";
  is_system_generated: boolean;
  created_at: string;
};

export type TimelineDayResult = {
  date: string;
  title: string;
  subtitle: string | null;
  activities: TimelineActivityResult[];
};

type TimelineDayState = {
  day: HomeDay;
  status: TimelineLoadState;
  hasRemoteDay: boolean;
};

export function timelineDayToHomeDay(remote: TimelineDayResult, fallback: HomeDay): HomeDay {
  const activities: HomeActivity[] = [...remote.activities]
    .sort((left, right) => left.start_time.localeCompare(right.start_time) || left.created_at.localeCompare(right.created_at))
    .map((activity) => ({
      id: activity.id,
      time: activity.start_time.slice(0, 5),
      title: activity.title,
      place: activity.location_name ?? "",
      placeSlug: activity.place_slug,
      sourceEventId: activity.source_event_id,
      description: activity.description ?? undefined,
      durationMinutes: activity.duration_minutes,
      kind: activity.kind,
      isSystemGenerated: activity.is_system_generated,
    }));

  return { ...fallback, title: remote.title, summary: remote.subtitle ?? "", activities };
}

function emptyDay(fallback: HomeDay): HomeDay {
  return { ...fallback, activities: [] };
}

/**
 * Reads Timeline data through the PIN-protected server API. A successful
 * response is cached per date so an installed PWA can show its last known
 * schedule while offline. There is deliberately no mutation path in v1A.
 */
export function useTimelineDay(selectedDate: string, fallback: HomeDay) {
  const [state, setState] = useState<TimelineDayState>({ day: emptyDay(fallback), status: "loading", hasRemoteDay: false });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    const cacheKey = `utazasi-timeline-v1:${selectedDate}`;
    const cached = storageGet<TimelineDayResult | null>(cacheKey, null);

    setState({ day: cached ? timelineDayToHomeDay(cached, fallback) : emptyDay(fallback), status: "loading", hasRemoteDay: Boolean(cached) });

    async function load() {
      try {
        const response = await fetch(`/api/timeline?date=${encodeURIComponent(selectedDate)}`, { cache: "no-store" });
        if (!response.ok) throw new Error(`Timeline request failed: ${response.status}`);
        const { day } = await response.json() as { day: TimelineDayResult | null };
        if (!active) return;

        if (!day) {
          setState({ day: emptyDay(fallback), status: "empty", hasRemoteDay: false });
          return;
        }

        storageSet(cacheKey, day);
        setState({ day: timelineDayToHomeDay(day, fallback), status: day.activities.length ? "success" : "empty", hasRemoteDay: true });
      } catch (error) {
        if (!active) return;
        const offline = typeof navigator !== "undefined" && !navigator.onLine;
        // Trip-core provides only the title/day shell. It must never restore
        // prototype activities when this specific canonical day was never
        // successfully fetched and cached on the device.
        const knownDay = cached ? timelineDayToHomeDay(cached, fallback) : emptyDay(fallback);
        console.error("Unable to load Timeline data from Supabase.", error);
        setState({ day: knownDay, status: offline ? "offline" : "error", hasRemoteDay: Boolean(cached) });
      }
    }

    void load();
    return () => { active = false; };
  }, [attempt, fallback, selectedDate]);

  return { ...state, canWrite: state.hasRemoteDay && state.status !== "offline" && state.status !== "error", retry };
}

/**
 * Read-only full-trip context for natural questions. The visible Timeline
 * remains a single day, while a concrete program or travel question can look
 * up a scheduled fact elsewhere in the canonical family plan.
 */
export function useTripTimeline(fallbackDays: readonly HomeDay[]) {
  const [days, setDays] = useState<readonly HomeDay[]>([]);
  const [status, setStatus] = useState<TimelineLoadState>("loading");
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    const cacheKey = "utazasi-timeline-v1:trip";
    const cached = storageGet<TimelineDayResult[] | null>(cacheKey, null);
    const project = (remoteDays: readonly TimelineDayResult[]) => remoteDays.map((remote) => {
      const fallback = fallbackDays.find((day) => day.date === remote.date);
      return fallback ? timelineDayToHomeDay(remote, fallback) : null;
    }).filter((day): day is HomeDay => day !== null);

    if (cached) {
      setDays(project(cached));
      setStatus("success");
    } else {
      setDays([]);
      setStatus("loading");
    }

    async function load() {
      try {
        const response = await fetch("/api/timeline?scope=trip", { cache: "no-store" });
        if (!response.ok) throw new Error(`Trip Timeline request failed: ${response.status}`);
        const payload = await response.json() as { days?: TimelineDayResult[] };
        const remoteDays = payload.days ?? [];
        if (!active) return;
        storageSet(cacheKey, remoteDays);
        setDays(project(remoteDays));
        setStatus("success");
      } catch (error) {
        if (!active) return;
        console.error("Unable to load full Timeline context from Supabase.", error);
        if (!cached) setStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error");
      }
    }

    void load();
    return () => { active = false; };
  }, [attempt, fallbackDays]);

  return { days, status, retry };
}
