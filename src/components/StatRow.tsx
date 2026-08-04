"use client";

import { useLiveData } from "@/hooks/useLiveData";
import { Icon } from "./Icon";

const GLASS_STYLE = {
  backgroundColor: "rgba(255,255,255,0.65)",
  borderColor: "rgba(255,255,255,0.55)",
  boxShadow: "0 8px 24px rgba(24,50,59,0.08)",
};

function StatCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div
      className="flex flex-col items-center gap-1 rounded-s border px-2 py-3 backdrop-blur-glass"
      style={GLASS_STYLE}
    >
      <Icon name={icon} size={16} className="text-turquoise" />
      <span className="font-mono text-[10px] uppercase tracking-wide text-neutral-700">{label}</span>
      <span className="font-mono text-[17px] font-semibold text-deep-sea">{value}</span>
    </div>
  );
}

export function StatRow() {
  const { weather, sea } = useLiveData();

  return (
    <div className="relative z-[2] -mt-[34px] mb-5 grid grid-cols-4 gap-2">
      <StatCard icon="thermometer-sun" label="Levegő" value={weather ? `${weather.temp}°` : "—"} />
      <StatCard icon="waves" label="Tenger" value={sea !== null ? `${sea}°` : "—"} />
      <StatCard icon="sun" label="UV" value={weather ? `${weather.uv}` : "—"} />
      <StatCard icon="wind" label="Szél" value={weather ? `${weather.wind} km/h` : "—"} />
    </div>
  );
}
