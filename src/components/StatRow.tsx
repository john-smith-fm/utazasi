"use client";

import { useLiveData } from "@/hooks/useLiveData";
import { useLiveClock } from "@/hooks/useLiveClock";
import { Icon } from "./Icon";

const GLASS_STYLE = {
  background: "rgba(255, 255, 255, 0.58)",
  borderColor: "rgba(255, 255, 255, 0.72)",
  boxShadow: "0 10px 28px rgba(24, 50, 59, 0.12)",
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
};

function WeatherMetric({
  icon,
  label,
  value,
  bordered = false,
}: {
  icon: string;
  label: string;
  value: string;
  bordered?: boolean;
}) {
  return (
    <div className={`flex min-w-0 flex-col items-center gap-1 px-1 ${bordered ? "border-l border-deep-sea/10" : ""}`}>
      <Icon name={icon} size={16} strokeWidth={1.8} className="text-turquoise-dark" />
      <span className="text-[10px] font-medium tracking-[0.01em] text-deep-sea/60">{label}</span>
      <span className="whitespace-nowrap text-[15px] font-semibold tracking-[-0.02em] text-deep-sea">{value}</span>
    </div>
  );
}

export function StatRow() {
  const { weather, sea } = useLiveData();
  const now = useLiveClock();
  const weekday = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: "Europe/Rome",
  }).format(new Date(`${now.dateStr}T12:00:00`));

  return (
    <section
      aria-label="Current weather in Villasimius"
      className="relative z-[2] -mt-8 mb-6 grid grid-cols-4 rounded-[16px] border px-2 py-4"
      style={GLASS_STYLE}
    >
      <WeatherMetric icon="sun" label="Air" value={weather ? `${weather.temp}°` : "—"} />
      <WeatherMetric icon="waves" label="Water" value={sea !== null ? `${sea}°` : "—"} bordered />
      <WeatherMetric icon="calendar-days" label="Day" value={weekday} bordered />
      <WeatherMetric icon="wind" label="Wind" value={weather ? `${weather.wind} km/h` : "—"} bordered />
    </section>
  );
}
