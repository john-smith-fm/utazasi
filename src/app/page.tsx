"use client";

import { useState } from "react";
import { Hero } from "@/components/Hero";
import { StatRow } from "@/components/StatRow";
import { SunCard } from "@/components/SunCard";
import { TimelineCard } from "@/components/TimelineCard";
import { PlanList } from "@/components/PlanList";
import { Icon } from "@/components/Icon";
import { HOME_DAYS, type HomeActivity } from "@/data/home-days";
import { useLocalStorage } from "@/hooks/useLocalStorage";

const alternatives: Record<string, string[]> = { Strandolás: ["Campus", "Porto Giunco", "Simius", "Cala Pira"], "Könnyű vacsora": ["Sa Tankitta", "Le Pavoncelle", "Villasimius központ"] };

export default function HomePage() {
  const [selectedDate, setSelectedDate] = useState(HOME_DAYS[2].date);
  const [editing, setEditing] = useState<HomeActivity | null>(null);
  const { value: choices, setValue: setChoices } = useLocalStorage<Record<string, string>>("home-v8-choices", {});
  const day = HOME_DAYS.find((item) => item.date === selectedDate) ?? HOME_DAYS[0];
  const activities = day.activities.map((item) => ({ ...item, place: choices[`${day.date}-${item.time}-${item.title}`] ?? item.place }));
  const saveChoice = (place: string) => { if (!editing) return; setChoices((old) => ({ ...old, [`${day.date}-${editing.time}-${editing.title}`]: place })); setEditing(null); };
  return <><Hero /><main className="relative z-10 -mt-7 mx-auto max-w-[430px] pb-[126px]"><div className="px-5"><StatRow /></div><SunCard /><div className="px-5"><TimelineCard day={day} onSelect={setSelectedDate} /><section className="mt-8"><PlanList activities={activities} onEdit={setEditing} /></section></div></main><button type="button" aria-label="Program hozzáadása" onClick={() => setEditing({ time: "", title: "Új programpont", place: "" })} className="fixed bottom-[calc(88px+env(safe-area-inset-bottom))] right-5 z-[55] grid h-[54px] w-[54px] place-items-center rounded-full bg-coral text-deep-sea shadow-[0_12px_28px_rgba(217,99,57,.28)] transition-transform active:scale-95"><Icon name="plus" size={24} strokeWidth={2} /></button>
    {editing && <ActivitySheet activity={editing} onClose={() => setEditing(null)} onSave={saveChoice} />}</>;
}

function ActivitySheet({ activity, onClose, onSave }: { activity: HomeActivity; onClose: () => void; onSave: (place: string) => void }) {
  const options = alternatives[activity.title] ?? (activity.place ? [activity.place, "Döntés később"] : ["Döntés később"]);
  const [choice, setChoice] = useState(options[0]);
  return <div className="fixed inset-0 z-[80] flex items-end bg-deep-sea/35 p-0" onClick={onClose}><section role="dialog" aria-modal="true" aria-label="Program kiválasztása" onClick={(event) => event.stopPropagation()} className="mx-auto w-full max-w-[430px] rounded-t-[28px] bg-quartz pb-[calc(16px+env(safe-area-inset-bottom))] shadow-2xl"><div className="mx-auto my-3 h-1.5 w-10 rounded-full bg-deep-sea/15" /><header className="flex items-start justify-between border-b border-deep-sea/10 px-5 pb-4"><div><p className="text-xs font-semibold text-deep-sea/55">{activity.time || "Új program"}</p><h2 className="mt-1 text-xl font-bold">{activity.title}</h2></div><button onClick={onClose} className="rounded-full p-2 text-deep-sea/60"><Icon name="x" /></button></header><div className="p-5"><p className="mb-3 text-xs font-bold text-deep-sea/55">Ajánlott és további lehetőségek</p><div className="space-y-2">{options.map((option) => <label key={option} className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 ${choice === option ? "border-coral bg-coral/5" : "border-deep-sea/10"}`}><input type="radio" name="place" checked={choice === option} onChange={() => setChoice(option)} className="accent-coral" /><span className="text-sm font-semibold">{option}</span></label>)}</div></div><footer className="grid grid-cols-2 gap-3 border-t border-deep-sea/10 px-5 pt-3"><button onClick={onClose} className="h-11 rounded-xl border border-deep-sea/10 font-semibold">Mégse</button><button onClick={() => onSave(choice)} className="h-11 rounded-xl bg-coral font-semibold">Mentés</button></footer></section></div>;
}
