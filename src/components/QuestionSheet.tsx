"use client";

import { useMemo, useState } from "react";
import type { HomeDay } from "@/data/home-days";
import type { WeatherSnapshot } from "@/types";
import { Icon } from "./Icon";

const EXAMPLES = ["Melyik strandot válasszuk?", "Mi fér még bele délután?", "Hova menjünk gyerekkel?"] as const;
type Answer = { title: string; body: string; sources: string[] };

function answerFor(question: string, day: HomeDay, weather: WeatherSnapshot | null): Answer {
  const normalized = question.trim().toLocaleLowerCase("hu-HU");
  const afternoon = day.activities.filter((activity) => /^1[2-9]:|^2[0-3]:/.test(activity.time));
  if (normalized.includes("strand")) {
    const plannedBeach = day.activities.find((activity) => /strand/i.test(`${activity.title} ${activity.place}`));
    if (plannedBeach) {
      const weatherNote = weather?.precipitationState === "rain" ? "Eső várható, ezért indulás előtt érdemes újra ellenőrizni a körülményeket." : weather ? `${weather.temp}° és ${weather.wind} km/h szél várható.` : "Az időjárási adat most nem elérhető.";
      return { title: plannedBeach.place || plannedBeach.title, body: `A mai tervben ez szerepel ${plannedBeach.time}-kor. ${weatherNote}`, sources: ["Timeline", "Weather"] };
    }
    return { title: "Még nincs kiválasztott strand", body: "A mai napi tervben nincs strandszakasz. A helyekhez még nem áll rendelkezésre összehasonlítható, ellenőrzött menetidő- és körülményadat, ezért nem ajánlok találomra helyet.", sources: ["Timeline", "Place"] };
  }
  if (normalized.includes("délután") || normalized.includes("bele")) {
    if (afternoon.length === 0) return { title: "Szabad délután", body: "A kiválasztott naphoz még nincs délutáni program rögzítve.", sources: ["Timeline"] };
    const next = afternoon[0];
    return { title: `${next.time} · ${next.title}`, body: `Ez a következő délutáni programpont${next.place ? `: ${next.place}` : ""}. A többi lehetőséget a Timeline-ban, időrendben látod.`, sources: ["Timeline"] };
  }
  if (normalized.includes("gyerek")) return { title: "Még nem elég biztos az ajánláshoz", body: "A jelenlegi Place-adatok nem tartalmaznak minden helyhez ellenőrzött gyerekes alkalmassági információt. Ezt a rendszer nem találgatja meg; a következő kutatási kör ezt fogja bővíteni.", sources: ["Place"] };
  return { title: "Erre még nincs biztos válasz", body: "A Kérdezési jelenlegi verziója a három utazástervezési kérdésre ad magyarázható választ. Külső információt csak ellenőrzött kutatási forrásból fog használni.", sources: ["Timeline", "Place", "Weather"] };
}

export function QuestionSheet({ day, weather, onClose }: { day: HomeDay; weather: WeatherSnapshot | null; onClose: () => void }) {
  const [question, setQuestion] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const answer = useMemo(() => submitted ? answerFor(submitted, day, weather) : null, [day, submitted, weather]);
  function ask(value: string) { const next = value.trim(); if (!next) return; setQuestion(next); setSubmitted(next); }

  return <div className="fixed inset-0 z-[75] flex items-end bg-deep-sea/35 p-4" onClick={onClose}>
    <section role="dialog" aria-modal="true" aria-label="Kérdezési" onClick={(event) => event.stopPropagation()} className="mx-auto w-full max-w-[430px] rounded-[28px] bg-quartz p-5 pb-[calc(20px+env(safe-area-inset-bottom))] shadow-2xl">
      <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-deep-sea/15" />
      <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold text-deep-sea/55">A kiválasztott naphoz</p><h2 className="mt-1 text-xl font-bold text-deep-sea">Kérdezési?</h2></div><button type="button" onClick={onClose} aria-label="Bezárás" className="grid h-11 w-11 place-items-center rounded-full text-deep-sea/60"><Icon name="x" /></button></div>
      <form className="mt-5 flex gap-2" onSubmit={(event) => { event.preventDefault(); ask(question); }}><label className="sr-only" htmlFor="trip-question">Kérdés</label><input id="trip-question" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Írj egy kérdést" className="min-w-0 flex-1 rounded-ui-s border border-deep-sea/15 bg-white px-3 text-sm text-deep-sea outline-none placeholder:text-deep-sea/40 focus:border-turquoise-dark" /><button type="submit" className="min-h-11 rounded-ui-s border border-turquoise bg-turquoise/10 px-3 text-sm font-semibold text-deep-sea">Kérdez</button></form>
      {!answer ? <div className="mt-5"><p className="text-[13px] leading-[18px] text-deep-sea/55">Például:</p><div className="mt-3 flex flex-wrap gap-2">{EXAMPLES.map((example) => <button key={example} type="button" onClick={() => ask(example)} className="min-h-11 rounded-full border border-deep-sea/10 px-3 text-left text-[13px] font-medium leading-[18px] text-deep-sea/75">{example}</button>)}</div></div> : <section className="mt-5 border-t border-deep-sea/10 pt-5" aria-live="polite"><h3 className="text-[17px] font-bold leading-[23px] text-deep-sea">{answer.title}</h3><p className="mt-2 text-sm leading-[21px] text-deep-sea/70">{answer.body}</p><p className="mt-4 text-[11px] font-semibold tracking-[.02em] text-deep-sea/45">Adatforrás · {answer.sources.join(" · ")}</p></section>}
    </section>
  </div>;
}
