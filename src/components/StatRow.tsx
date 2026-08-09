"use client";

import { useState } from "react";
import type { HomeDay } from "@/data/home-days";
import type { WeatherSnapshot } from "@/types";
import { Icon } from "./Icon";
import { QuestionSheet } from "./QuestionSheet";

const glass = { background: "rgba(255,255,255,.78)", borderColor: "rgba(255,255,255,.82)", boxShadow: "0 18px 44px rgba(43,41,38,.12),0 2px 8px rgba(43,41,38,.05)", backdropFilter: "blur(20px) saturate(1.08)", WebkitBackdropFilter: "blur(20px) saturate(1.08)" };
function Metric({ icon, value, bordered = false }: { icon: string; value: string; bordered?: boolean }) { return <span className={`flex min-w-0 items-center justify-center gap-1.5 py-2 ${bordered ? "border-l border-deep-sea/10" : ""}`}><Icon name={icon} size={18} strokeWidth={1.8} className="shrink-0 text-turquoise-dark" /><strong className="whitespace-nowrap text-sm tracking-[-.02em]">{value}</strong></span>; }

export function StatRow({ weather, sea, day }: { weather: WeatherSnapshot | null; sea: number | null; day: HomeDay }) {
  const [open, setOpen] = useState<"weather" | "questions" | null>(null);
  const condition = weather?.precipitationState === "rain" ? "Esős" : weather ? "Napos" : "—";
  return <>
    <button type="button" aria-label="Időjárás Villasimiusban" onClick={() => setOpen("weather")} className="relative z-[2] grid w-full grid-cols-4 rounded-[22px] border px-1.5 py-2 text-left" style={glass}><Metric icon="sun" value={weather ? `${weather.temp}°` : "—"} /><Metric icon="waves" value={sea !== null ? `${sea}°` : "—"} bordered /><Metric icon="wind" value={weather ? `${weather.wind} km/h` : "—"} bordered /><Metric icon="cloud-sun" value={condition} bordered /></button>
    {open === "weather" && <div className="fixed inset-0 z-[70] flex items-end bg-deep-sea/35 p-4" onClick={() => setOpen(null)}><section role="dialog" aria-modal="true" aria-label="Időjárás részletei" onClick={(event) => event.stopPropagation()} className="mx-auto w-full max-w-[430px] rounded-[28px] bg-quartz p-5 pb-[calc(20px+env(safe-area-inset-bottom))] shadow-2xl"><div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-deep-sea/15" /><div className="flex items-start justify-between"><div><p className="text-xs font-semibold text-deep-sea/55">Villasimius{weather?.stale ? " · korábbi adat" : ""}</p><h2 className="mt-1 text-xl font-bold">Időjárás</h2></div><button type="button" onClick={() => setOpen(null)} className="grid h-11 w-11 place-items-center rounded-full text-deep-sea/60"><Icon name="x" /></button></div><dl className="mt-5 divide-y divide-deep-sea/10 text-sm"><div className="flex justify-between py-3"><dt>Levegő</dt><dd className="font-semibold">{weather ? `${weather.temp}°` : "—"}</dd></div><div className="flex justify-between py-3"><dt>Tenger</dt><dd className="font-semibold">{sea !== null ? `${sea}°` : "—"}</dd></div><div className="flex justify-between py-3"><dt>Szél</dt><dd className="font-semibold">{weather ? `${weather.wind} km/h` : "—"}</dd></div><div className="flex justify-between py-3"><dt>Csapadék</dt><dd className="font-semibold">{condition}</dd></div></dl><button type="button" onClick={() => setOpen("questions")} className="mt-5 inline-flex min-h-11 items-center rounded-ui-s border border-turquoise bg-turquoise/10 px-4 text-sm font-semibold text-deep-sea">Kérdezési?</button><p className="mt-4 text-[11px] text-deep-sea/45">Időjárási adat: Open-Meteo</p></section></div>}
    {open === "questions" && <QuestionSheet day={day} weather={weather} onClose={() => setOpen(null)} />}
  </>;
}
