export type PrecipitationState = "dry" | "rain" | "unknown";

export type WeatherContext = {
  date: string;
  airTemperature: number;
  windKmh: number;
  precipitationState: PrecipitationState;
  seaTemperature: number | null;
  sunrise: string | null;
  sunset: string | null;
  fetchedAt: string;
  stale: boolean;
  attribution: "Weather data by Open-Meteo.com";
};

export function precipitationStateForMillimeters(value: number | null | undefined): PrecipitationState {
  if (typeof value !== "number" || !Number.isFinite(value)) return "unknown";
  return value >= 0.2 ? "rain" : "dry";
}

export function formatProviderTime(value: string | undefined): string | null {
  return value?.slice(11, 16) ?? null;
}
