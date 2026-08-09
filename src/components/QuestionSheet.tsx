"use client";

import { useMemo, useState } from "react";
import type { HomeDay } from "@/data/home-days";
import type { WeatherSnapshot } from "@/types";

const EXAMPLES = ["Melyik strandot válasszuk?", "Mi fér még bele délután?", "Hova menjünk gyerekkel?"] as const;
type Answer = { title: string; body: string; sources: string[] };

function answerFor(question: string, day: HomeDay, weather: WeatherSnapshot | null): Answer {
  const normalized = question.toLocaleLowerCase("hu-HU");
  const afternoon = day.activities.filter((activity) => /^1[2-9]:|^2[0-3]:/.test(activity.time));

  if (normalized.includes("strand")) {
    const plannedBeach = day.activities.find((activity) => /strand/i.test(`${activity.title} ${activity.place}`));
    if (plannedBeach) {
      const weatherNote = weather?.precipitationState === "rain"
        ? "Eső várható, ezért indulás előtt érdemes újra ellenőrizni a körülményeket."
        : weather ? `${weather.temp}° és ${weather.wind} km/h szél várható.` : "Az időjárási adat most nem elérhető.";
      return { title: plannedBeach.place || plannedBeach.title, body: `A mai tervben ez szerepel ${plannedBeach.time}-kor. ${weatherNote}`, sources: ["Timeline", "Weather"] };
    }
    return { title: "Még nincs kiválasztott strand", body: "A mai napi tervben nincs strandszakasz. A helyekhez még nem áll rendelkezésre összehasonlítható, ellenőrzött menetidő- és körülményadat, ezért nem ajánlok találomra helyet.", sources: ["Timeline", "Place"] };
  }

  if (normalized.includes("délután") || normalized.includes("bele")) {
    if (afternoon.length === 0) return { title: "Szabad délután", body: "A kiválasztott naphoz még nincs délutáni program rögzítve.", sources: ["Timeline"] };
    const next = afternoon[0];
    return { title: `${next.time} · ${next.title}`, body: `Ez a következő délutáni programpont${next.place ? `: ${next.place}` : ""}. A többi lehetőséget a Timeline-ban, időrendben látod.`, sources: ["Timeline"] };
  }

  return { title: "Még nem elég biztos az ajánláshoz", body: "A jelenlegi Place-adatok nem tartalmaznak minden helyhez ellenőrzött gyerekes alkalmassági információt. Ezt a rendszer nem találgatja meg; a következő kutatási kör ezt fogja bővíteni.", sources: ["Place"] };
}

/** Inline content for the Weather Bar's Kérdezési state — never a modal or sheet. */
export function QuestionSheet({ day, weather }: { day: HomeDay; weather: WeatherSnapshot | null }) {
  const [question, setQuestion] = useState<(typeof EXAMPLES)[number] | null>(null);
  const answer = useMemo(() => question ? answerFor(question, day, weather) : null, [day, question, weather]);

  return <section className="px-5 pb-5 pt-2" aria-label="Kérdezési">
    <h2 className="text-[17px] font-bold leading-[23px] text-deep-sea">Miben segíthetek?</h2>
    <div className="mt-3 flex flex-col gap-2">
      {EXAMPLES.map((example) => <button key={example} type="button" onClick={() => setQuestion(example)} className={`min-h-11 rounded-ui-s border px-3 text-left text-sm font-medium transition-colors ${question === example ? "border-turquoise bg-turquoise/10 text-deep-sea" : "border-deep-sea/10 bg-white/45 text-deep-sea/75"}`}>{example}</button>)}
    </div>
    {answer && <section className="mt-5 border-t border-deep-sea/10 pt-5" aria-live="polite"><h3 className="text-[17px] font-bold leading-[23px] text-deep-sea">{answer.title}</h3><p className="mt-2 text-sm leading-[21px] text-deep-sea/70">{answer.body}</p><p className="mt-4 text-[11px] font-semibold tracking-[.02em] text-deep-sea/45">Adatforrás · {answer.sources.join(" · ")}</p></section>}
  </section>;
}
