"use client";

import { useEffect, useState } from "react";
import { fetchFxRate, fetchSeaTemp, fetchWeather } from "@/lib/weather";
import type { WeatherSnapshot } from "@/types";

interface LiveData {
  weather: WeatherSnapshot | null;
  sea: number | null;
  fx: number | null;
  loading: boolean;
}

/** Élő adatok (időjárás, tenger, árfolyam), 15 percenként frissítve.
 *  Offline esetén a lib/weather.ts a legutóbbi localStorage-cache-elt értéket adja vissza. */
export function useLiveData(refreshMs = 15 * 60 * 1000): LiveData {
  const [state, setState] = useState<LiveData>({ weather: null, sea: null, fx: null, loading: true });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [weather, sea, fx] = await Promise.allSettled([
        fetchWeather(),
        fetchSeaTemp(),
        fetchFxRate(),
      ]);
      if (cancelled) return;
      setState({
        weather: weather.status === "fulfilled" ? weather.value : null,
        sea: sea.status === "fulfilled" ? sea.value : null,
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
  }, [refreshMs]);

  return state;
}
