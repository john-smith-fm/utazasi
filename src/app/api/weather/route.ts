import { NextRequest, NextResponse } from "next/server";
import { TRIP_RUNTIME } from "@/data/trip-core";
import { formatProviderTime, precipitationStateForMillimeters, type WeatherContext } from "@/lib/weather-context";

export const revalidate = 900;

const WEATHER_ATTRIBUTION = "Weather data by Open-Meteo.com" as const;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const COORDINATE_PATTERN = /^-?\d{1,3}(?:\.\d+)?$/;

type ForecastResponse = {
  current?: { temperature_2m?: number; wind_speed_10m?: number; precipitation?: number };
  daily?: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    wind_speed_10m_max: number[];
    sunrise: string[];
    sunset: string[];
  };
};

type MarineResponse = { current?: { sea_surface_temperature?: number } };

function todayInTripTimezone(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TRIP_RUNTIME.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

async function providerFetch<T>(url: string): Promise<T> {
  const response = await fetch(url, { next: { revalidate: 900 } });
  if (!response.ok) throw new Error(`Open-Meteo response: ${response.status}`);
  return response.json() as Promise<T>;
}

export async function GET(request: NextRequest) {
  const requestedDate = request.nextUrl.searchParams.get("date") ?? todayInTripTimezone();
  if (!DATE_PATTERN.test(requestedDate)) {
    return NextResponse.json({ error: "Érvénytelen dátum." }, { status: 400 });
  }

  const requestedLat = request.nextUrl.searchParams.get("lat");
  const requestedLon = request.nextUrl.searchParams.get("lon");
  if ((requestedLat && !COORDINATE_PATTERN.test(requestedLat)) || (requestedLon && !COORDINATE_PATTERN.test(requestedLon))) {
    return NextResponse.json({ error: "Érvénytelen helykoordináta." }, { status: 400 });
  }
  const lat = requestedLat ? Number(requestedLat) : TRIP_RUNTIME.coords.lat;
  const lon = requestedLon ? Number(requestedLon) : TRIP_RUNTIME.coords.lon;
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return NextResponse.json({ error: "Érvénytelen helykoordináta." }, { status: 400 });
  }
  const shared = `latitude=${lat}&longitude=${lon}&timezone=${encodeURIComponent(TRIP_RUNTIME.timezone)}`;
  const forecastUrl = `https://api.open-meteo.com/v1/forecast?${shared}&start_date=${requestedDate}&end_date=${requestedDate}&current=temperature_2m,wind_speed_10m,precipitation&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,sunrise,sunset`;
  const marineUrl = `https://marine-api.open-meteo.com/v1/marine?${shared}&current=sea_surface_temperature`;

  try {
    const [forecast, marine] = await Promise.all([
      providerFetch<ForecastResponse>(forecastUrl),
      providerFetch<MarineResponse>(marineUrl).catch(() => null),
    ]);
    const daily = forecast.daily;
    const index = daily?.time.indexOf(requestedDate) ?? -1;
    if (!daily || index < 0) throw new Error("A kiválasztott naphoz nincs előrejelzés.");

    const isToday = requestedDate === todayInTripTimezone();
    const dailyTemperature = Math.round((daily.temperature_2m_min[index] + daily.temperature_2m_max[index]) / 2);
    const context: WeatherContext = {
      date: requestedDate,
      airTemperature: Math.round(isToday ? forecast.current?.temperature_2m ?? dailyTemperature : dailyTemperature),
      windKmh: Math.round(isToday ? forecast.current?.wind_speed_10m ?? daily.wind_speed_10m_max[index] : daily.wind_speed_10m_max[index]),
      precipitationState: precipitationStateForMillimeters(isToday ? forecast.current?.precipitation ?? daily.precipitation_sum[index] : daily.precipitation_sum[index]),
      seaTemperature: typeof marine?.current?.sea_surface_temperature === "number" ? Math.round(marine.current.sea_surface_temperature) : null,
      sunrise: formatProviderTime(daily.sunrise[index]),
      sunset: formatProviderTime(daily.sunset[index]),
      fetchedAt: new Date().toISOString(),
      stale: false,
      attribution: WEATHER_ATTRIBUTION,
    };

    return NextResponse.json(context, {
      headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600" },
    });
  } catch {
    return NextResponse.json(
      { error: "Az időjárási adat átmenetileg nem elérhető.", attribution: WEATHER_ATTRIBUTION },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
