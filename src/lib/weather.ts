import { TRIP } from "@/data/trip";
import type { WeatherSnapshot } from "@/types";
import { storageGet, storageSet } from "./storage";

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`bad response: ${res.status}`);
  return res.json() as Promise<T>;
}

/** Open-Meteo — időjárás, UV, szél, napkelte/napnyugta. API-kulcs nélkül. */
export async function fetchWeather(): Promise<WeatherSnapshot> {
  const { lat, lon } = TRIP.coords;
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,wind_speed_10m,uv_index&daily=sunrise,sunset,uv_index_max` +
    `&timezone=${encodeURIComponent(TRIP.timezone)}`;

  try {
    const data = await fetchJSON<{
      current: { temperature_2m: number; wind_speed_10m: number; uv_index?: number };
      daily: { sunrise: string[]; sunset: string[]; uv_index_max: number[] };
    }>(url);

    const snapshot: WeatherSnapshot = {
      temp: Math.round(data.current.temperature_2m),
      wind: Math.round(data.current.wind_speed_10m),
      uv: Math.round(data.current.uv_index ?? data.daily.uv_index_max[0]),
      sunrise: data.daily.sunrise[0].slice(11, 16),
      sunset: data.daily.sunset[0].slice(11, 16),
    };
    storageSet("weather-cache", snapshot);
    return snapshot;
  } catch {
    const cached = storageGet<WeatherSnapshot | null>("weather-cache", null);
    if (cached) return cached;
    throw new Error("no weather data available (offline, no cache)");
  }
}

/** Open-Meteo Marine API — tenger felszíni hőmérséklet. API-kulcs nélkül. */
export async function fetchSeaTemp(): Promise<number> {
  const { lat, lon } = TRIP.coords;
  const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&current=sea_surface_temperature&timezone=${encodeURIComponent(TRIP.timezone)}`;

  try {
    const data = await fetchJSON<{ current: { sea_surface_temperature: number } }>(url);
    const sea = Math.round(data.current.sea_surface_temperature);
    storageSet("sea-cache", sea);
    return sea;
  } catch {
    const cached = storageGet<number | null>("sea-cache", null);
    if (cached !== null) return cached;
    throw new Error("no sea temperature available (offline, no cache)");
  }
}

/** frankfurter.app — EUR → HUF árfolyam. API-kulcs nélkül. */
export async function fetchFxRate(): Promise<number> {
  const url = `https://api.frankfurter.app/latest?from=EUR&to=HUF`;
  try {
    const data = await fetchJSON<{ rates: { HUF: number } }>(url);
    const rate = Math.round(data.rates.HUF);
    storageSet("fx-cache", rate);
    return rate;
  } catch {
    const cached = storageGet<number | null>("fx-cache", null);
    if (cached !== null) return cached;
    throw new Error("no fx rate available (offline, no cache)");
  }
}
