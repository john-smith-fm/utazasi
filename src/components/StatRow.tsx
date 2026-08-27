"use client";

import { useEffect, useRef, useState } from "react";
import type { HomeDay } from "@/data/home-days";
import type { WeatherSnapshot } from "@/types";
import type { TripEvent } from "@/lib/event-types";
import { Icon } from "./Icon";
import { QuestionSheet } from "./QuestionSheet";

const glass = { background: "rgba(255,255,255,.78)", borderColor: "rgba(255,255,255,.82)", boxShadow: "0 18px 44px rgba(43,41,38,.12),0 2px 8px rgba(43,41,38,.05)", backdropFilter: "blur(20px) saturate(1.08)", WebkitBackdropFilter: "blur(20px) saturate(1.08)" };
function Metric({ icon, value, bordered = false }: { icon: string; value: string; bordered?: boolean }) { return <span className={`flex min-w-0 items-center justify-center gap-1.5 py-2 ${bordered ? "border-l border-deep-sea/10" : ""}`}><Icon name={icon} size={18} strokeWidth={1.8} className="shrink-0 text-turquoise-dark" /><strong className="whitespace-nowrap text-sm tracking-[-.02em]">{value}</strong></span>; }

export function StatRow({ weather, sea, day, events = [], tripDays = [], tripStatus = "success", onOpenDay }: { weather: WeatherSnapshot | null; sea: number | null; day: HomeDay; events?: TripEvent[]; tripDays?: readonly HomeDay[]; tripStatus?: "loading" | "success" | "empty" | "offline" | "error"; onOpenDay?: (date: string) => void }) {
  const [mode, setMode] = useState<"weather" | "questions">("weather");
  const questionPanelRef = useRef<HTMLElement>(null);
  const weatherIcon = weather?.condition === "clear" ? "sun"
    : weather?.condition === "partly-cloudy" ? "cloud-sun"
      : weather?.condition === "cloudy" ? "cloud"
        : weather?.condition === "rain" || weather?.precipitationState === "rain" ? "cloud-rain"
          : "cloud-sun";
  const questionMode = mode === "questions";

  useEffect(() => {
    if (!questionMode) return;

    function closeWhenOutside(event: PointerEvent) {
      if (!questionPanelRef.current?.contains(event.target as Node)) setMode("weather");
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMode("weather");
    }

    document.addEventListener("pointerdown", closeWhenOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeWhenOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [questionMode]);

  return <section aria-label="Időjárás és utazási segítség">
    {questionMode ? <section ref={questionPanelRef} className="relative z-[2] w-full overflow-hidden rounded-[22px] border" style={glass}>
      <div className="relative flex min-h-[52px] items-center justify-center px-14">
        <button type="button" aria-label="Kérdezési bezárása" onClick={() => setMode("weather")} className="absolute right-3 grid h-9 w-9 place-items-center rounded-full border border-deep-sea/15 bg-white/60 text-deep-sea transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-turquoise-dark"><Icon name="x" size={17} aria-hidden="true" /></button>
        <strong className="text-sm tracking-[-.02em] text-deep-sea">Kérdezési</strong>
      </div>
      <QuestionSheet day={day} weather={weather} events={events} tripDays={tripDays} tripStatus={tripStatus} onOpenDay={onOpenDay} />
    </section> : <button type="button" aria-label="Kérdezési megnyitása" aria-expanded="false" onClick={() => setMode("questions")} className="group relative z-[2] flex w-full items-stretch rounded-[22px] border py-2 pl-1.5 text-left focus-visible:ring-2 focus-visible:ring-turquoise-dark" style={glass}>
      <span className={`grid min-w-0 flex-1 pr-12 ${sea !== null ? "grid-cols-3" : "grid-cols-2"}`}>
        <Metric icon={weatherIcon} value={weather ? `${weather.temp}°` : "—"} />
        {sea !== null && <Metric icon="waves" value={`${sea}°`} bordered />}
        <Metric icon="wind" value={weather ? `${weather.wind} km/h` : "—"} bordered />
      </span>
      <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-deep-sea/15 bg-white/60 text-[19px] font-semibold leading-none text-deep-sea transition-colors group-hover:bg-white group-hover:text-turquoise-dark">?</span>
    </button>}
  </section>;
}
