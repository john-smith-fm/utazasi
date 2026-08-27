export type PrecipitationState = "dry" | "rain" | "unknown";
export type WeatherCondition = "clear" | "partly-cloudy" | "cloudy" | "rain" | "unknown";

export type WeatherContext = {
  date: string;
  airTemperature: number;
  windKmh: number;
  precipitationState: PrecipitationState;
  condition: WeatherCondition;
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

/** Open-Meteo WMO weather interpretation codes, grouped for the compact weather bar. */
export function weatherConditionForCode(value: number | null | undefined): WeatherCondition {
  if (typeof value !== "number" || !Number.isFinite(value)) return "unknown";
  if (value === 0 || value === 1) return "clear";
  if (value === 2) return "partly-cloudy";
  if (value === 3 || value === 45 || value === 48) return "cloudy";
  if ((value >= 51 && value <= 67) || (value >= 71 && value <= 77) || (value >= 80 && value <= 99)) return "rain";
  return "unknown";
}

export function formatProviderTime(value: string | undefined): string | null {
  return value?.slice(11, 16) ?? null;
}
