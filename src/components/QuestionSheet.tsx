"use client";

import { useMemo, useState, type FormEvent } from "react";
import type { HomeDay } from "@/data/home-days";
import type { WeatherSnapshot } from "@/types";
import type { TripEvent } from "@/lib/event-types";
import { getShoppingAnswer } from "@/lib/shopping-intelligence";
import { buildQuestionContext, questionPromptsForContext } from "@/lib/question-context";
import { answerQuestionWithContext, isAccommodationQuestion } from "@/lib/questioning-answer";
import { getPlaceBySlug, getPlaces } from "@/lib/places";
import { Icon } from "./Icon";
import { FORM_CONTROL } from "@/components/formStyles";


/** Inline content for the Weather Bar's Kérdezési state — never a modal or sheet. */
export function QuestionSheet({ day, weather, events = [], tripDays = [], tripStatus = "success", onOpenDay }: { day: HomeDay; weather: WeatherSnapshot | null; events?: TripEvent[]; tripDays?: readonly HomeDay[]; tripStatus?: "loading" | "success" | "empty" | "offline" | "error"; onOpenDay?: (date: string) => void }) {
  const [question, setQuestion] = useState<string | null>(null);
  const [customQuestion, setCustomQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState<{ title: string; body: string } | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [tripBase, setTripBase] = useState<{ address: string; mapUrl: string } | null>(null);
  const [tripBaseError, setTripBaseError] = useState<string | null>(null);
  const [isAsking, setIsAsking] = useState(false);
  const context = useMemo(() => buildQuestionContext(day, weather, events, { getPlaceBySlug, places: getPlaces() }), [day, events, weather]);
  const answer = useMemo(() => question ? answerQuestionWithContext(question, context, getShoppingAnswer(question), tripDays) : null, [context, question, tripDays]);
  const prompts = useMemo(() => questionPromptsForContext(context), [context]);

  async function ask(value: string) {
    setQuestion(value);
    setAiAnswer(null);
    setAiError(null);
    setTripBase(null);
    setTripBaseError(null);
    const localAnswer = answerQuestionWithContext(value, context, getShoppingAnswer(value), tripDays);
    if (isAccommodationQuestion(value)) {
      setIsAsking(true);
      try {
        const response = await fetch("/api/trip-base", { cache: "no-store" });
        const payload = await response.json().catch(() => null) as { tripBase?: { address?: string; mapUrl?: string } } | null;
        if (response.ok && payload?.tripBase?.address && payload.tripBase.mapUrl) setTripBase({ address: payload.tripBase.address, mapUrl: payload.tripBase.mapUrl });
        else setTripBaseError("A szállás pontos címe most nem tölthető be.");
      } catch {
        setTripBaseError("A szállás pontos címe most nem tölthető be.");
      }
      finally { setIsAsking(false); }
      return;
    }
    // Verified local answers are the source of truth. Do not let a generative
    // summary replace an explicit Timeline, Place, Weather or Shopping answer.
    if (localAnswer.title !== "Erre még nincs biztos válasz") return;
    // Do not send a potentially cross-day factual question to AI while the
    // read-only canonical trip context is still arriving. The deterministic
    // resolver will answer once it is ready; AI never guesses missing plans.
    if (tripStatus === "loading") return;
    setIsAsking(true);
    try {
      const response = await fetch("/api/question", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: value, date: day.date }) });
      const payload = await response.json().catch(() => null) as { answer?: { title?: string; body?: string } | null; error?: unknown } | null;
      if (response.ok && payload?.answer?.title && payload.answer.body) setAiAnswer({ title: payload.answer.title, body: payload.answer.body });
      // An AI `insufficient_context` response is not an application error.
      // Keep the already-visible deterministic answer, which is intentionally
      // more useful than a second generic warning card.
      else if (response.ok && payload?.answer === null) return;
      else setAiError(typeof payload?.error === "string" ? payload.error : "Az AI-összefoglaló most nem érhető el.");
    } catch {
      setAiError("Az AI-összefoglaló most nem érhető el. Ellenőrizd az internetkapcsolatot, majd próbáld újra.");
    }
    finally { setIsAsking(false); }
  }

  function submitCustomQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = customQuestion.trim();
    if (value) void ask(value);
  }

  return <section className="px-5 pb-5 pt-2" aria-label="Kérdezési">
    <div className="flex flex-col gap-2">
      {prompts.map((example) => <button key={example} type="button" onClick={() => void ask(example)} className={`min-h-12 rounded-ui-s border px-3 text-left text-sm font-medium transition-colors ${question === example ? "border-turquoise bg-turquoise/10 text-deep-sea" : "border-deep-sea/10 bg-white/45 text-deep-sea/75"}`}>{example}</button>)}
      {!prompts.length && <p className="rounded-ui-s border border-deep-sea/10 bg-white/35 px-3 py-3 text-sm leading-[21px] text-deep-sea/65">Ehhez a naphoz még nincs elég rögzített adat. Adj hozzá egy programot vagy helyet a Timeline-hoz.</p>}
    </div>
    <form className="relative mt-5 border-t border-deep-sea/10 pt-5" onSubmit={submitCustomQuestion}>
      <label className="sr-only" htmlFor="custom-trip-question">Utazási kérdés</label>
      <input id="custom-trip-question" value={customQuestion} onChange={(event) => setCustomQuestion(event.target.value)} placeholder="Saját kérdés…" className={`${FORM_CONTROL} w-full border-deep-sea/15 bg-white/55 py-2 pl-3 pr-14`} />
      <button type="submit" disabled={!customQuestion.trim()} aria-label="Kérdés elküldése" className="absolute bottom-0.5 right-0.5 grid h-11 w-11 place-items-center rounded-full bg-turquoise/15 text-turquoise-dark transition-colors disabled:bg-transparent disabled:text-deep-sea/25"><Icon name="arrow-up" size={17} strokeWidth={2} /></button>
    </form>
    {answer && <section className="mt-5 border-t border-deep-sea/10 pt-5" aria-live="polite">
      <h3 className="text-[17px] font-bold leading-[23px] text-deep-sea">{aiAnswer?.title ?? answer.title}</h3>
      <p className="mt-2 text-sm leading-[21px] text-deep-sea/70">{isAsking ? "Ellenőrzött utazási kontextusból összefoglalom…" : aiAnswer?.body ?? answer.body}</p>
      {answer.openDayDate && answer.openDayDate !== day.date && onOpenDay ? <button type="button" onClick={() => onOpenDay(answer.openDayDate!)} className="mt-3 inline-flex min-h-11 items-center rounded-ui-s border border-turquoise bg-turquoise/10 px-3 text-sm font-semibold text-deep-sea">{new Intl.DateTimeFormat("hu-HU", { month: "short", day: "numeric", timeZone: "Europe/Rome" }).format(new Date(`${answer.openDayDate}T12:00:00Z`)).replace(".", ".")} megnyitása</button> : null}
      {aiError ? <div className="mt-4 flex items-center justify-between gap-3 rounded-ui-s border border-coral/25 bg-coral/5 p-3.5" role="status">
        <p className="text-[13px] leading-[19px] text-deep-sea/70">{aiError}</p>
        <button type="button" onClick={() => void ask(question!)} className="min-h-11 shrink-0 px-1 text-[13px] font-semibold text-deep-sea">Újrapróbálás</button>
      </div> : null}
      {tripBase ? <div className="mt-4 rounded-ui-s border border-deep-sea/10 bg-white/50 p-3.5">
        <p className="text-[11px] font-semibold tracking-[.04em] text-deep-sea/45">SZÁLLÁS CÍME</p>
        <p className="mt-1 text-sm leading-[21px] text-deep-sea">{tripBase.address}</p>
        <a href={tripBase.mapUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-11 items-center rounded-ui-s border border-turquoise bg-turquoise/10 px-3 text-sm font-semibold text-deep-sea">Navigáció megnyitása</a>
      </div> : null}
      {tripBaseError ? <div className="mt-4 flex items-center justify-between gap-3 rounded-ui-s border border-coral/25 bg-coral/5 p-3.5" role="status">
        <p className="text-[13px] leading-[19px] text-deep-sea/70">{tripBaseError}</p>
        <button type="button" onClick={() => void ask(question!)} className="min-h-11 shrink-0 px-1 text-[13px] font-semibold text-deep-sea">Újrapróbálás</button>
      </div> : null}
      {answer.recommendations?.length ? <ul className="mt-4 space-y-2.5" aria-label="Javasolt helyek">
        {answer.recommendations.map((recommendation) => {
          const place = getPlaceBySlug(recommendation.placeSlug);
          const imageSrc = place?.media?.[0]?.src ?? place?.intelligence?.coverImage?.assetUrl;
          const mapUrl = place?.navigation?.directionsUrl ?? place?.navigation?.mapsUrl;
          return <li key={recommendation.placeSlug}>
          <a href={recommendation.placeDetailHref} className="group flex gap-3 rounded-ui-s border border-deep-sea/10 bg-white/50 p-3.5 outline-none transition-colors hover:bg-white/80 focus-visible:ring-2 focus-visible:ring-turquoise-dark">
            {imageSrc ? <img src={imageSrc} alt="" loading="lazy" decoding="async" className="mt-0.5 h-[68px] w-[68px] shrink-0 rounded-ui-s object-cover" /> : null}
            <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold tracking-[.04em] text-deep-sea/45">JAVASOLT HELY</p>
                <p className="mt-0.5 text-[16px] font-bold leading-[22px] text-deep-sea">{recommendation.name}</p>
              </div>
              <Icon aria-hidden="true" name="chevron-right" size={18} className="mt-1 shrink-0 text-turquoise-dark transition-transform group-hover:translate-x-0.5" />
            </div>
            {recommendation.rationale ? <p className="mt-2 text-[13px] leading-[19px] text-deep-sea/70">{recommendation.rationale}</p> : null}
            {recommendation.confirmedFacts.length ? <p className="mt-2 text-[12px] leading-[18px] text-deep-sea/55">Megerősített · {recommendation.confirmedFacts.join(" · ")}</p> : null}
            {recommendation.uncertainty ? <p className="mt-2 text-[12px] leading-[18px] text-deep-sea/50">Korlát · {recommendation.uncertainty}</p> : null}
            </div>
          </a>
          {mapUrl ? <a href={mapUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex min-h-11 items-center gap-1.5 px-1 text-[13px] font-semibold text-turquoise-dark underline decoration-turquoise/35 underline-offset-4">
            <Icon aria-hidden="true" name="map-pin" size={16} />
            Navigáció megnyitása
          </a> : null}
        </li>;
        })}
      </ul> : null}
      <p className="mt-4 text-[11px] font-semibold tracking-[.02em] text-deep-sea/45">Adatforrás · {answer.sources.join(" · ")}</p>
    </section>}
  </section>;
}
