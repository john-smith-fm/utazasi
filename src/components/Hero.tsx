"use client";

import type { TripSummary } from "@/domain/trip";

function tripDateLabel(trip: TripSummary) {
  if (!trip.startDate || !trip.endDate) return "A dátum még nincs megadva";
  const format = (value: string) => new Intl.DateTimeFormat("hu-HU", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
  return `${format(trip.startDate)} – ${format(trip.endDate)}`;
}

export function Hero({ trip, trips, onSelectTrip }: { trip: TripSummary; trips: TripSummary[]; onSelectTrip: (slug: string) => void }) {

  return <header className="relative overflow-hidden bg-[#2f6970] pt-[env(safe-area-inset-top)] text-white" style={{ height: "calc(204px + env(safe-area-inset-top))", marginTop: "calc(-1 * env(safe-area-inset-top))" }}>
    <div aria-hidden="true" className="absolute inset-0 scale-[1.02] bg-cover" style={{ backgroundImage: 'linear-gradient(135deg,rgba(29,93,101,.08),rgba(255,138,91,.04)),url("/images/hero.jpg")', backgroundPosition: "58% 52%" }} />
    <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,42,47,.06)_0%,rgba(11,42,47,.12)_45%,rgba(11,42,47,.64)_100%)]" />
    <div className="relative flex h-full items-center justify-between gap-6 px-5">
      <img src="/images/utazasi-logo-white.svg" alt="Utazási" className="h-[116px] w-[116px] shrink-0 object-contain" />
      <div className="min-w-0 flex-1">
        <label className="block">
          <span className="sr-only">Aktív utazás</span>
          <select value={trip.slug} onChange={(event) => onSelectTrip(event.target.value)} className="max-w-full appearance-none border-0 bg-transparent p-0 pr-5 text-sm font-bold leading-[19px] text-white outline-none">
            {trips.map((item) => <option key={item.id} value={item.slug} className="text-deep-sea">{item.name}</option>)}
          </select>
        </label>
        <p className="mt-1 truncate text-sm font-medium leading-[19px] text-white/95">{trip.destinationLabel}</p>
        <p className="text-[12px] font-medium leading-[18px] text-white/80">{tripDateLabel(trip)}</p>
      </div>
    </div>
  </header>;
}
