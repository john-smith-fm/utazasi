import type { WeatherSnapshot } from "@/types";
import { storageGet, storageSet } from "./storage";

type WeatherResponse = {
  airTemperature: number;
  windKmh: number;
  precipitationState: WeatherSnapshot["precipitationState"];
  condition: WeatherSnapshot["condition"];
  seaTemperature: number | null;
  sunrise: string | null;
  sunset: string | null;
  fetchedAt: string;
  stale: boolean;
};

export type WeatherLocation = { latitude: number; longitude: number; seaRelevant: boolean };

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`bad response: ${res.status}`);
  return res.json() as Promise<T>;
}

/** Szerveroldali, 15 perces Open-Meteo cache. Offline esetben a kliens a legutóbbi sikeres napot mutatja. */
export async function fetchWeather(date: string, location?: WeatherLocation): Promise<WeatherSnapshot> {
  const lat = location?.latitude;
  const lon = location?.longitude;
  const cacheKey = `weather-cache:${date}:${lat ?? "trip"}:${lon ?? "trip"}`;
  try {
    const search = new URLSearchParams({ date });
    if (typeof lat === "number" && typeof lon === "number") {
      search.set("lat", String(lat));
      search.set("lon", String(lon));
    }
    const data = await fetchJSON<WeatherResponse>(`/api/weather?${search.toString()}`);
    const snapshot: WeatherSnapshot = {
      temp: data.airTemperature,
      wind: data.windKmh,
      uv: 0,
      sunrise: data.sunrise ?? "—",
      sunset: data.sunset ?? "—",
      precipitationState: data.precipitationState,
      condition: data.condition,
      seaTemperature: location?.seaRelevant === false ? null : data.seaTemperature,
      fetchedAt: data.fetchedAt,
      stale: data.stale,
    };
    storageSet(cacheKey, snapshot);
    return snapshot;
  } catch {
    const cached = storageGet<WeatherSnapshot | null>(cacheKey, null);
    if (cached) return { ...cached, stale: true };
    throw new Error("no weather data available (offline, no cache)");
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
