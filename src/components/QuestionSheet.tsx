"use client";

import { useMemo, useState, type FormEvent } from "react";
import type { HomeDay } from "@/data/home-days";
import type { WeatherSnapshot } from "@/types";
import type { TripEvent } from "@/lib/event-types";
import { getShoppingAnswer, type ShoppingRecommendation } from "@/lib/shopping-intelligence";
import { Icon } from "./Icon";
import { FORM_CONTROL } from "@/components/formStyles";

const EXAMPLES = ["Melyik strandot válasszuk?", "Mi fér még bele délután?", "Hova menjünk gyerekkel?"] as const;
type Answer = { title: string; body: string; sources: string[]; recommendations?: ShoppingRecommendation[] };

function eventAnswer(question: string, events: TripEvent[]): Answer | null {
  const normalized = question.toLocaleLowerCase("hu-HU");
  const asksAdmission = /belépő|belepo|jegy|ár|ar/.test(normalized);
  const asksFireworks = /tűzijáték|tuzijatek/.test(normalized);
  const asksEventTime = /mikor|kezd|este|fesztivál|fesztival|esemény|esemeny/.test(normalized);
  if (!asksAdmission && !asksFireworks && !asksEventTime) return null;
  if (asksFireworks && !events.some((event) => /tűzijáték|tuzijatek/i.test(event.title))) return { title: "Nincs megerősített tűzijáték", body: "A kiválasztott naphoz nincs ellenőrzött tűzijáték-esemény rögzítve. Nem állítok időpontot vagy helyszínt forrás nélkül.", sources: ["Event"] };
  if (asksAdmission) return { title: "A belépőről nincs biztos adat", body: "A jelenlegi ellenőrzött Place- és Event-adatok nem tartalmaznak megbízható belépő- vagy jegyár-információt ehhez a kérdéshez. Nem találgatok.", sources: ["Place", "Event"] };
  const event = events[0];
  if (!event) return { title: "Nincs rögzített esemény", body: "A kiválasztott naphoz jelenleg nincs ellenőrzött, külső esemény rögzítve.", sources: ["Event"] };
  if (event.status === "cancelled") return { title: `${event.title} · törölve`, body: "Az esemény törölt állapotban van. Indulás előtt az eredeti szervezői forrást is ellenőrizd.", sources: ["Event"] };
  const spansWholeDay = Boolean(event.endsAt && new Date(event.startsAt).toDateString() !== new Date(event.endsAt).toDateString());
  if (spansWholeDay) return { title: event.title, body: "Az esemény a kiválasztott napot lefedi, de a részletes esti kezdési idő nincs ellenőrzött adatként rögzítve.", sources: ["Event"] };
  return { title: event.title, body: `Kezdés: ${new Intl.DateTimeFormat("hu-HU", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit" }).format(new Date(event.startsAt))}.`, sources: ["Event"] };
}

function answerFor(question: string, day: HomeDay, weather: WeatherSnapshot | null, events: TripEvent[]): Answer {
  const normalized = question.toLocaleLowerCase("hu-HU");
  const afternoon = day.activities.filter((activity) => /^1[2-9]:|^2[0-3]:/.test(activity.time));
  const eventResult = eventAnswer(question, events);
  const shoppingAnswer = getShoppingAnswer(question);
  if (eventResult) return eventResult;
  if (shoppingAnswer) return shoppingAnswer;

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

  if (normalized.includes("gyerek")) return { title: "Még nem elég biztos az ajánláshoz", body: "A jelenlegi Place-adatok nem tartalmaznak minden helyhez ellenőrzött gyerekes alkalmassági információt. Ezt a rendszer nem találgatja meg; a következő kutatási kör ezt fogja bővíteni.", sources: ["Place"] };
  return { title: "Erre még nincs biztos válasz", body: "A Kérdezési jelenlegi verziója a napi tervhez, a helyekhez és az időjáráshoz kapcsolódó, ellenőrzött kérdésekre tud válaszolni. Külső információt csak ellenőrzött kutatási forrásból fog használni.", sources: ["Timeline", "Place", "Weather"] };
}

/** Inline content for the Weather Bar's Kérdezési state — never a modal or sheet. */
export function QuestionSheet({ day, weather, events = [] }: { day: HomeDay; weather: WeatherSnapshot | null; events?: TripEvent[] }) {
  const [question, setQuestion] = useState<string | null>(null);
  const [customQuestion, setCustomQuestion] = useState("");
  const answer = useMemo(() => question ? answerFor(question, day, weather, events) : null, [day, events, question, weather]);

  function submitCustomQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = customQuestion.trim();
    if (value) setQuestion(value);
  }

  return <section className="px-5 pb-5 pt-2" aria-label="Kérdezési">
    <div className="flex flex-col gap-2">
      {EXAMPLES.map((example) => <button key={example} type="button" onClick={() => setQuestion(example)} className={`min-h-12 rounded-ui-s border px-3 text-left text-sm font-medium transition-colors ${question === example ? "border-turquoise bg-turquoise/10 text-deep-sea" : "border-deep-sea/10 bg-white/45 text-deep-sea/75"}`}>{example}</button>)}
    </div>
    <form className="relative mt-5 border-t border-deep-sea/10 pt-5" onSubmit={submitCustomQuestion}>
      <label className="sr-only" htmlFor="custom-trip-question">Utazási kérdés</label>
      <input id="custom-trip-question" value={customQuestion} onChange={(event) => setCustomQuestion(event.target.value)} placeholder="Saját kérdés…" className={`${FORM_CONTROL} w-full border-deep-sea/15 bg-white/55 py-2 pl-3 pr-14`} />
      <button type="submit" disabled={!customQuestion.trim()} aria-label="Kérdés elküldése" className="absolute bottom-0.5 right-0.5 grid h-11 w-11 place-items-center rounded-full bg-turquoise/15 text-turquoise-dark transition-colors disabled:bg-transparent disabled:text-deep-sea/25"><Icon name="arrow-up" size={17} strokeWidth={2} /></button>
    </form>
    {answer && <section className="mt-5 border-t border-deep-sea/10 pt-5" aria-live="polite"><h3 className="text-[17px] font-bold leading-[23px] text-deep-sea">{answer.title}</h3><p className="mt-2 text-sm leading-[21px] text-deep-sea/70">{answer.body}</p>{answer.recommendations?.length ? <ul className="mt-4 space-y-3" aria-label="Javasolt helyek">{answer.recommendations.map((recommendation) => <li key={recommendation.placeSlug} className="text-sm leading-[21px] text-deep-sea/75"><a className="font-semibold text-turquoise-dark underline underline-offset-4" href={recommendation.placeDetailHref}>{recommendation.name}</a>{recommendation.rationale ? <p className="mt-0.5">{recommendation.rationale}</p> : null}{recommendation.confirmedFacts.length ? <p className="mt-0.5 text-deep-sea/55">Megerősített: {recommendation.confirmedFacts.join(" · ")}</p> : null}{recommendation.uncertainty ? <p className="mt-0.5 text-deep-sea/50">Korlát: {recommendation.uncertainty}</p> : null}</li>)}</ul> : null}<p className="mt-4 text-[11px] font-semibold tracking-[.02em] text-deep-sea/45">Adatforrás · {answer.sources.join(" · ")}</p></section>}
  </section>;
}
