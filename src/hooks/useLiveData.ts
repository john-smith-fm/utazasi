"use client";

import { useEffect, useState } from "react";
import { fetchFxRate, fetchWeather } from "@/lib/weather";
import type { WeatherSnapshot } from "@/types";
import type { CurrentLocationContext } from "@/hooks/useCurrentLocationContext";

interface LiveData {
  weather: WeatherSnapshot | null;
  sea: number | null;
  fx: number | null;
  loading: boolean;
}

/** Élő adatok (időjárás, tenger, árfolyam), 15 percenként frissítve.
 *  Offline esetén a lib/weather.ts a legutóbbi localStorage-cache-elt értéket adja vissza. */
function localToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function useLiveData(location?: CurrentLocationContext, refreshMs = 15 * 60 * 1000): LiveData {
  const [state, setState] = useState<LiveData>({ weather: null, sea: null, fx: null, loading: true });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [weather, fx] = await Promise.allSettled([
        fetchWeather(localToday(), location),
        fetchFxRate(),
      ]);
      if (cancelled) return;
      setState({
        weather: weather.status === "fulfilled" ? weather.value : null,
        sea: weather.status === "fulfilled" ? weather.value.seaTemperature : null,
        fx: fx.status === "fulfilled" ? fx.value : null,
        loading: false,
      });
    }

    load();
    const id = setInterval(load, refreshMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [location?.latitude, location?.longitude, location?.seaRelevant, refreshMs]);

  return state;
}
