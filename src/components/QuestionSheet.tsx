"use client";

import { useMemo, useState, type FormEvent } from "react";
import type { HomeDay } from "@/data/home-days";
import type { WeatherSnapshot } from "@/types";
import type { TripEvent } from "@/lib/event-types";
import { getShoppingAnswer } from "@/lib/shopping-intelligence";
import { timelineQuestionPrompts } from "@/lib/timeline-questioning";
import { answerQuestion } from "@/lib/questioning-answer";
import { Icon } from "./Icon";
import { FORM_CONTROL } from "@/components/formStyles";


/** Inline content for the Weather Bar's Kérdezési state — never a modal or sheet. */
export function QuestionSheet({ day, weather, events = [] }: { day: HomeDay; weather: WeatherSnapshot | null; events?: TripEvent[] }) {
  const [question, setQuestion] = useState<string | null>(null);
  const [customQuestion, setCustomQuestion] = useState("");
  const answer = useMemo(() => question ? answerQuestion(question, day, weather, events, getShoppingAnswer(question)) : null, [day, events, question, weather]);
  const prompts = useMemo(() => timelineQuestionPrompts(day), [day]);

  function submitCustomQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = customQuestion.trim();
    if (value) setQuestion(value);
  }

  return <section className="px-5 pb-5 pt-2" aria-label="Kérdezési">
    <div className="flex flex-col gap-2">
      {prompts.map((example) => <button key={example} type="button" onClick={() => setQuestion(example)} className={`min-h-12 rounded-ui-s border px-3 text-left text-sm font-medium transition-colors ${question === example ? "border-turquoise bg-turquoise/10 text-deep-sea" : "border-deep-sea/10 bg-white/45 text-deep-sea/75"}`}>{example}</button>)}
    </div>
    <form className="relative mt-5 border-t border-deep-sea/10 pt-5" onSubmit={submitCustomQuestion}>
      <label className="sr-only" htmlFor="custom-trip-question">Utazási kérdés</label>
      <input id="custom-trip-question" value={customQuestion} onChange={(event) => setCustomQuestion(event.target.value)} placeholder="Saját kérdés…" className={`${FORM_CONTROL} w-full border-deep-sea/15 bg-white/55 py-2 pl-3 pr-14`} />
      <button type="submit" disabled={!customQuestion.trim()} aria-label="Kérdés elküldése" className="absolute bottom-0.5 right-0.5 grid h-11 w-11 place-items-center rounded-full bg-turquoise/15 text-turquoise-dark transition-colors disabled:bg-transparent disabled:text-deep-sea/25"><Icon name="arrow-up" size={17} strokeWidth={2} /></button>
    </form>
    {answer && <section className="mt-5 border-t border-deep-sea/10 pt-5" aria-live="polite">
      <h3 className="text-[17px] font-bold leading-[23px] text-deep-sea">{answer.title}</h3>
      <p className="mt-2 text-sm leading-[21px] text-deep-sea/70">{answer.body}</p>
      {answer.recommendations?.length ? <ul className="mt-4 space-y-2.5" aria-label="Javasolt helyek">
        {answer.recommendations.map((recommendation) => <li key={recommendation.placeSlug}>
          <a href={recommendation.placeDetailHref} className="group block rounded-ui-s border border-deep-sea/10 bg-white/50 p-3.5 outline-none transition-colors hover:bg-white/80 focus-visible:ring-2 focus-visible:ring-turquoise-dark">
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
          </a>
        </li>)}
      </ul> : null}
      <p className="mt-4 text-[11px] font-semibold tracking-[.02em] text-deep-sea/45">Adatforrás · {answer.sources.join(" · ")}</p>
    </section>}
  </section>;
}
