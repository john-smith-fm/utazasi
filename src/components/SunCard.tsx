"use client";

import type { DeviceLocationState } from "@/hooks/useCurrentLocationContext";
import type { WeatherSnapshot } from "@/types";
import { Icon } from "./Icon";

export function SunCard({ weather, locationLabel, deviceState, onRequestDeviceLocation }: { weather: WeatherSnapshot | null; locationLabel: string; deviceState: DeviceLocationState; onRequestDeviceLocation: () => void }) {
  const canRequest = deviceState === "prompt" || deviceState === "unavailable" || deviceState === "locating";
  const denied = deviceState === "denied";

  return <section aria-label={`Napkelte és napnyugta ${locationLabel} helyén`} className="mx-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-deep-sea/10 px-[3px] pb-2.5 pt-3">
    <div className="flex items-center gap-2 text-sm font-semibold"><Icon name="sunrise" size={19} className="text-coral" /><span>{weather?.sunrise ?? "—"}</span></div>
    <div className="min-w-0 text-center">
      <p className="text-[11px] font-semibold tracking-[.02em] text-deep-sea/55">{locationLabel}</p>
      {canRequest ? <button type="button" onClick={onRequestDeviceLocation} disabled={deviceState === "locating"} className="mt-0.5 min-h-6 text-[11px] font-semibold text-turquoise-dark underline underline-offset-2 disabled:opacity-50">{deviceState === "locating" ? "Hely keresése…" : "Aktuális hely használata"}</button> : null}
      {denied ? <p className="mt-0.5 max-w-[108px] text-[10px] leading-[13px] text-deep-sea/45">A készülékhely a böngésző beállításaiban engedélyezhető.</p> : null}
    </div>
    <div className="flex items-center justify-end gap-2 text-sm font-semibold"><Icon name="sunset" size={19} className="text-coral" /><span>{weather?.sunset ?? "—"}</span></div>
  </section>;
}
