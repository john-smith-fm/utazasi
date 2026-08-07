"use client";

import { useEffect, useState } from "react";
import type { HomeActivity, HomeDay } from "@/data/home-days";

type TimelineDayResult = {
  date: string;
  title: string;
  subtitle: string | null;
  activities: Array<{
    start_time: string;
    title: string;
    location_name: string | null;
  }>;
};

function toHomeDay(remote: TimelineDayResult, fallback: HomeDay): HomeDay {
  const activities: HomeActivity[] = remote.activities.map((activity) => ({
    time: activity.start_time.slice(0, 5),
    title: activity.title,
    place: activity.location_name ?? "",
  }));

  return {
    ...fallback,
    title: remote.title,
    summary: remote.subtitle ?? "",
    activities,
  };
}

/**
 * Reads the selected day through the PIN-protected server API. A static fallback
 * keeps the existing Picker days usable until each day has been seeded or when
 * the installed PWA is offline.
 */
export function useTimelineDay(selectedDate: string, fallback: HomeDay) {
  const [remoteDay, setRemoteDay] = useState<HomeDay | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await fetch(`/api/timeline?date=${encodeURIComponent(selectedDate)}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Timeline request failed.");
        const { day } = await response.json() as { day: TimelineDayResult | null };
        if (!day) {
          if (active) setRemoteDay(null);
          return;
        }
        if (active) {
          setRemoteDay(toHomeDay(day, fallback));
        }
      } catch (error) {
        // RLS/configuration failures must not break the existing Home surface.
        console.error("Unable to load Timeline data from Supabase.", error);
        if (active) setRemoteDay(null);
      }
    }

    setRemoteDay(null);
    void load();

    return () => {
      active = false;
    };
  }, [fallback, selectedDate]);

  return remoteDay ?? fallback;
}
