"use client";

import { useEffect, useState } from "react";
import type { HomeActivity, HomeDay } from "@/data/home-days";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const TRIP_SLUG = "sardinia-family-2026";

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
 * Reads the selected day from Supabase without mutating it. A static fallback
 * keeps the existing Picker days usable until each day has been seeded.
 */
export function useTimelineDay(selectedDate: string, fallback: HomeDay) {
  const [remoteDay, setRemoteDay] = useState<HomeDay | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: trip, error: tripError } = await supabase
          .from("trips")
          .select("id")
          .eq("slug", TRIP_SLUG)
          .maybeSingle();

        if (tripError) throw tripError;
        if (!trip) {
          if (active) setRemoteDay(null);
          return;
        }

        const { data: day, error: dayError } = await supabase
          .from("days")
          .select("id, date, title, subtitle")
          .eq("trip_id", trip.id)
          .eq("date", selectedDate)
          .maybeSingle();

        if (dayError) throw dayError;
        if (!day) {
          if (active) setRemoteDay(null);
          return;
        }

        const { data: activities, error: activitiesError } = await supabase
          .from("timeline_activities")
          .select("start_time, title, location_name")
          .eq("day_id", day.id)
          .order("start_time", { ascending: true })
          .order("created_at", { ascending: true });

        if (activitiesError) throw activitiesError;
        if (active) {
          setRemoteDay(toHomeDay({ ...day, activities: activities ?? [] }, fallback));
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
