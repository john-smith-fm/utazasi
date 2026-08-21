"use client";

import { useState } from "react";
import type { HomeDay } from "@/data/home-days";
import type { WeatherSnapshot } from "@/types";
import type { TripEvent } from "@/lib/event-types";
import { Icon } from "./Icon";
import { QuestionSheet } from "./QuestionSheet";

const glass = { background: "rgba(255,255,255,.78)", borderColor: "rgba(255,255,255,.82)", boxShadow: "0 18px 44px rgba(43,41,38,.12),0 2px 8px rgba(43,41,38,.05)", backdropFilter: "blur(20px) saturate(1.08)", WebkitBackdropFilter: "blur(20px) saturate(1.08)" };
function Metric({ icon, value, bordered = false }: { icon: string; value: string; bordered?: boolean }) { return <span className={`flex min-w-0 items-center justify-center gap-1.5 py-2 ${bordered ? "border-l border-deep-sea/10" : ""}`}><Icon name={icon} size={18} strokeWidth={1.8} className="shrink-0 text-turquoise-dark" /><strong className="whitespace-nowrap text-sm tracking-[-.02em]">{value}</strong></span>; }

export function StatRow({ weather, sea, day, events = [], tripDays = [], tripStatus = "success", onOpenDay }: { weather: WeatherSnapshot | null; sea: number | null; day: HomeDay; events?: TripEvent[]; tripDays?: readonly HomeDay[]; tripStatus?: "loading" | "success" | "empty" | "offline" | "error"; onOpenDay?: (date: string) => void }) {
  const [mode, setMode] = useState<"weather" | "questions">("weather");
  const condition = weather?.precipitationState === "rain" ? "Esős" : weather ? "Napos" : "—";
  const questionMode = mode === "questions";

  return <section aria-label="Időjárás és utazási segítség">
    {questionMode ? <section className="relative z-[2] w-full overflow-hidden rounded-[22px] border" style={glass}>
      <button type="button" aria-label="Vissza az időjáráshoz" aria-expanded="true" onClick={() => setMode("weather")} className="flex min-h-[52px] w-full items-center justify-center px-5 text-left"><strong className="text-sm tracking-[-.02em] text-deep-sea">Kérdezési</strong></button>
      <QuestionSheet day={day} weather={weather} events={events} tripDays={tripDays} tripStatus={tripStatus} onOpenDay={onOpenDay} />
    </section> : <button type="button" aria-label="Kérdezési megnyitása" aria-expanded="false" onClick={() => setMode("questions")} className="relative z-[2] flex w-full items-stretch rounded-[22px] border py-2 pl-1.5 text-left" style={glass}>
      <span className={`grid min-w-0 flex-1 ${sea !== null ? "grid-cols-4" : "grid-cols-3"}`}>
        <Metric icon="sun" value={weather ? `${weather.temp}°` : "—"} />
        {sea !== null && <Metric icon="waves" value={`${sea}°`} bordered />}
        <Metric icon="wind" value={weather ? `${weather.wind} km/h` : "—"} bordered />
        <Metric icon="cloud-sun" value={condition} bordered />
      </span>
      <span aria-hidden="true" className="grid w-9 shrink-0 place-items-center text-deep-sea/45"><Icon name="circle-help" size={18} strokeWidth={1.8} /></span>
    </button>}
  </section>;
}
