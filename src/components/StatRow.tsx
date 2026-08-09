"use client";

import { useState } from "react";
import type { HomeDay } from "@/data/home-days";
import type { WeatherSnapshot } from "@/types";
import { Icon } from "./Icon";
import { QuestionSheet } from "./QuestionSheet";

const glass = { background: "rgba(255,255,255,.78)", borderColor: "rgba(255,255,255,.82)", boxShadow: "0 18px 44px rgba(43,41,38,.12),0 2px 8px rgba(43,41,38,.05)", backdropFilter: "blur(20px) saturate(1.08)", WebkitBackdropFilter: "blur(20px) saturate(1.08)" };
function Metric({ icon, value, bordered = false }: { icon: string; value: string; bordered?: boolean }) { return <span className={`flex min-w-0 items-center justify-center gap-1.5 py-2 ${bordered ? "border-l border-deep-sea/10" : ""}`}><Icon name={icon} size={18} strokeWidth={1.8} className="shrink-0 text-turquoise-dark" /><strong className="whitespace-nowrap text-sm tracking-[-.02em]">{value}</strong></span>; }

export function StatRow({ weather, sea, day }: { weather: WeatherSnapshot | null; sea: number | null; day: HomeDay }) {
  const [mode, setMode] = useState<"weather" | "questions">("weather");
  const condition = weather?.precipitationState === "rain" ? "Esős" : weather ? "Napos" : "—";
  const questionMode = mode === "questions";

  return <section aria-label="Időjárás és utazási segítség">
    <button type="button" aria-label={questionMode ? "Vissza az időjáráshoz" : "Kérdezési megnyitása"} aria-pressed={questionMode} onClick={() => setMode(questionMode ? "weather" : "questions")} className="relative z-[2] grid w-full grid-cols-4 rounded-[22px] border py-2 pl-1.5 pr-8 text-left" style={glass}>
      {questionMode ? <span className="col-span-4 flex min-h-6 items-center justify-center gap-2"><Icon name="message-circle" size={19} strokeWidth={1.8} className="text-turquoise-dark" /><strong className="text-sm tracking-[-.02em] text-deep-sea">Kérdezési?</strong></span> : <><Metric icon="sun" value={weather ? `${weather.temp}°` : "—"} /><Metric icon="waves" value={sea !== null ? `${sea}°` : "—"} bordered /><Metric icon="wind" value={weather ? `${weather.wind} km/h` : "—"} bordered /><Metric icon="cloud-sun" value={condition} bordered /></>}
      <Icon aria-hidden="true" name="circle-help" size={18} strokeWidth={1.8} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-deep-sea/45" />
    </button>
    {questionMode && <QuestionSheet day={day} weather={weather} />}
  </section>;
}
