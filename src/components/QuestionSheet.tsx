"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import type { HomeDay } from "@/data/home-days";
import type { WeatherSnapshot } from "@/types";
import type { TripEvent } from "@/lib/event-types";
import { getShoppingAnswer } from "@/lib/shopping-intelligence";
import { buildQuestionContext, questionPromptsForContext } from "@/lib/question-context";
import { isAccommodationQuestion, resolveQuestionWithContext } from "@/lib/questioning-answer";
import { canResearch } from "@/lib/question-evidence";
import { getPlaceBySlug, getPlaces } from "@/lib/places";
import { Icon } from "./Icon";
import { FORM_CONTROL } from "@/components/formStyles";
import type { ResearchSource } from "@/lib/researched-question-contract";
import { isTimelineActionRequest, type TimelineProposal } from "@/lib/timeline-proposal";


/** Inline content for the Weather Bar's Kérdezési state — never a modal or sheet. */
export function QuestionSheet({ tripSlug, hasLegacyKnowledge = false, hasPrivateTripBase = false, day, weather, events = [], tripDays = [], tripStatus = "success", onOpenDay, onApplyTimelineProposal }: { tripSlug: string; hasLegacyKnowledge?: boolean; hasPrivateTripBase?: boolean; day: HomeDay; weather: WeatherSnapshot | null; events?: TripEvent[]; tripDays?: readonly HomeDay[]; tripStatus?: "loading" | "success" | "empty" | "offline" | "error"; onOpenDay?: (date: string) => void; onApplyTimelineProposal?: (proposal: TimelineProposal) => Promise<void> }) {
  const [question, setQuestion] = useState<string | null>(null);
  const [customQuestion, setCustomQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState<{ title: string; body: string; sources?: ResearchSource[] } | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [tripBase, setTripBase] = useState<{ address: string; mapUrl: string } | null>(null);
  const [tripBaseError, setTripBaseError] = useState<string | null>(null);
  const [isAsking, setIsAsking] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [proposal, setProposal] = useState<TimelineProposal | null>(null);
  const [isPlanning, setIsPlanning] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const context = useMemo(() => buildQuestionContext(day, weather, events, {
    getPlaceBySlug: hasLegacyKnowledge ? getPlaceBySlug : () => undefined,
    places: hasLegacyKnowledge ? getPlaces() : [],
  }), [day, events, hasLegacyKnowledge, weather]);
  const resolution = useMemo(() => question ? resolveQuestionWithContext(question, context, hasLegacyKnowledge ? getShoppingAnswer(question) : null, tripDays) : null, [context, hasLegacyKnowledge, question, tripDays]);
  const answer = resolution?.answer ?? null;
  const prompts = useMemo(() => questionPromptsForContext(context), [context]);

  async function ask(value: string) {
    setQuestion(value);
    setAiAnswer(null);
    setAiError(null);
    setTripBase(null);
    setTripBaseError(null);
    const localResolution = resolveQuestionWithContext(value, context, hasLegacyKnowledge ? getShoppingAnswer(value) : null, tripDays);
    if (isAccommodationQuestion(value)) {
      if (!hasPrivateTripBase) {
        setTripBaseError("Ehhez az utazáshoz még nincs rögzítve privát szálláscím.");
        return;
      }
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
    // Completeness is resolver data, never a display-title convention. A
    // partial deterministic answer remains visible while research fills only
    // its explicit, externally checkable fact gap.
    if (!canResearch(localResolution.assessment)) return;
    // Do not send a potentially cross-day factual question to AI while the
    // read-only canonical trip context is still arriving. The deterministic
    // resolver will answer once it is ready; AI never guesses missing plans.
    if (tripStatus === "loading") return;
    setIsAsking(true);
    try {
      const response = await fetch("/api/question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripSlug,
          question: value,
          date: day.date,
          researchRequirements: localResolution.assessment.researchableRequirements,
        }),
      });
      const payload = await response.json().catch(() => null) as { answer?: { title?: string; body?: string; sources?: ResearchSource[] } | null; error?: unknown } | null;
      if (response.ok && payload?.answer?.title && payload.answer.body) setAiAnswer({ title: payload.answer.title, body: payload.answer.body, sources: Array.isArray(payload.answer.sources) ? payload.answer.sources : undefined });
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
    if (!value) return;
    if (isTimelineActionRequest(value)) {
      setQuestion(null);
      setAiAnswer(null);
      setAiError(null);
      setProposal(null);
      setPendingAction(value);
      return;
    }
    setPendingAction(null);
    setProposal(null);
    void ask(value);
  }

  async function confirmAction() {
    if (!pendingAction) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setAiError("A keresésalapú Timeline-javaslathoz hálózati kapcsolat szükséges. A meglévő terv továbbra is olvasható.");
      return;
    }
    setIsPlanning(true);
    setAiError(null);
    try {
      const response = await fetch("/api/timeline/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripSlug, request: pendingAction, sourceDate: day.date, mutationConfirmed: true }),
      });
      const payload = await response.json().catch(() => null) as { proposal?: TimelineProposal; error?: unknown } | null;
      if (!response.ok || !payload?.proposal) throw new Error(typeof payload?.error === "string" ? payload.error : "A Timeline-javaslat most nem készíthető el.");
      setProposal(payload.proposal);
      setPendingAction(null);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "A Timeline-javaslat most nem készíthető el.");
    } finally {
      setIsPlanning(false);
    }
  }

  async function applyProposal() {
    if (!proposal || proposal.blockingReason || !onApplyTimelineProposal) return;
    setIsApplying(true);
    setAiError(null);
    try {
      await onApplyTimelineProposal(proposal);
      setProposal(null);
      setCustomQuestion("");
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "A Timeline-javaslat alkalmazása nem sikerült.");
    } finally {
      setIsApplying(false);
    }
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
    {pendingAction ? <section className="mt-4 rounded-ui-s border border-turquoise/30 bg-turquoise/5 p-4" aria-live="polite">
      <p className="text-sm font-semibold leading-[21px] text-deep-sea">Ez a kérés módosítaná a Timeline-t.</p>
      <p className="mt-1 text-[13px] leading-[19px] text-deep-sea/65">Elkészíthetem a konkrét változtatási javaslatot? A Timeline csak egy későbbi „Alkalmazás” után változik meg.</p>
      <div className="mt-3 flex gap-2">
        <button type="button" disabled={isPlanning} onClick={() => void confirmAction()} className="min-h-11 rounded-full bg-deep-sea px-4 text-sm font-semibold text-white disabled:opacity-50">{isPlanning ? "Keresés és tervezés…" : "Igen, készítsd el"}</button>
        <button type="button" disabled={isPlanning} onClick={() => setPendingAction(null)} className="min-h-11 rounded-full border border-deep-sea/15 px-4 text-sm font-semibold text-deep-sea disabled:opacity-50">Mégse</button>
      </div>
    </section> : null}
    {proposal ? <section className="mt-4 rounded-ui-s border border-deep-sea/10 bg-white/55 p-4" aria-live="polite">
      <p className="text-[11px] font-semibold tracking-[.04em] text-deep-sea/45">TIMELINE-JAVASLAT · {proposal.targetTitle.toUpperCase()}</p>
      <h3 className="mt-1 text-[17px] font-bold leading-[23px] text-deep-sea">{proposal.items.length} hozzáadás</h3>
      <p className="mt-1 text-[13px] leading-[19px] text-deep-sea/65">{proposal.summary}</p>
      <ol className="mt-4 space-y-3">
        {proposal.items.map((item) => <li key={item.id} className="flex gap-3 border-t border-deep-sea/10 pt-3 first:border-t-0 first:pt-0">
          <strong className="w-11 shrink-0 text-sm text-deep-sea">{item.activity.startTime}</strong>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-deep-sea">+ {item.activity.title}</p>
            {item.activity.locationName ? <p className="mt-0.5 text-[13px] font-medium leading-[19px] text-turquoise-dark">{item.activity.locationName}</p> : null}
            <p className="mt-0.5 text-[12px] leading-[18px] text-deep-sea/55">{item.rationale}</p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[.04em] text-deep-sea/40">{item.confidence === "verified" ? "Ellenőrzött" : item.confidence === "likely" ? "Valószínű" : "Nem ellenőrzött"}</p>
            {item.sources.length ? <ul className="mt-1.5 space-y-1">{item.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer" className="text-[12px] font-semibold leading-[18px] text-turquoise-dark underline decoration-turquoise/35 underline-offset-4">{source.title}</a></li>)}</ul> : null}
          </div>
        </li>)}
      </ol>
      {proposal.limitations.map((limitation) => <p key={limitation} className="mt-3 rounded-ui-s bg-sand/45 px-3 py-2 text-[12px] leading-[18px] text-deep-sea/65">Nem ellenőrzött · {limitation}</p>)}
      {proposal.blockingReason ? <p className="mt-3 rounded-ui-s border border-coral/25 bg-coral/5 px-3 py-2 text-[13px] leading-[19px] text-deep-sea/70">{proposal.blockingReason}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" disabled={Boolean(proposal.blockingReason) || isApplying || !onApplyTimelineProposal || tripStatus === "offline" || tripStatus === "error"} onClick={() => void applyProposal()} className="min-h-11 rounded-full bg-deep-sea px-4 text-sm font-semibold text-white disabled:opacity-40">{isApplying ? "Alkalmazás…" : "Alkalmazás"}</button>
        <button type="button" onClick={() => { setProposal(null); document.getElementById("custom-trip-question")?.focus(); }} className="min-h-11 rounded-full border border-deep-sea/15 px-4 text-sm font-semibold text-deep-sea">Finomítás</button>
        <button type="button" onClick={() => setProposal(null)} className="min-h-11 px-2 text-sm font-semibold text-deep-sea/60">Elvetés</button>
      </div>
    </section> : null}
    {aiError && !answer ? <div className="mt-4 rounded-ui-s border border-coral/25 bg-coral/5 p-3.5" role="status"><p className="text-[13px] leading-[19px] text-deep-sea/70">{aiError}</p></div> : null}
    {answer && <section className="mt-5 border-t border-deep-sea/10 pt-5" aria-live="polite">
      <h3 className="text-[17px] font-bold leading-[23px] text-deep-sea">{answer.title}</h3>
      <p className="mt-2 whitespace-pre-line text-sm leading-[21px] text-deep-sea/70">{answer.body}</p>
      {isAsking ? <p className="mt-3 text-[13px] leading-[19px] text-deep-sea/55">A hiányzó, ellenőrizhető információt kutatom…</p> : null}
      {aiAnswer ? <div className="mt-4 border-t border-deep-sea/10 pt-4">
        <p className="text-[11px] font-semibold tracking-[.04em] text-deep-sea/45">KUTATÁSI KIEGÉSZÍTÉS</p>
        <h4 className="mt-1 text-[16px] font-bold leading-[22px] text-deep-sea">{aiAnswer.title}</h4>
        <p className="mt-2 whitespace-pre-line text-sm leading-[21px] text-deep-sea/70">{aiAnswer.body}</p>
      </div> : null}
      {answer.openDayDate && answer.openDayDate !== day.date && onOpenDay ? <button type="button" onClick={() => onOpenDay(answer.openDayDate!)} className="mt-3 inline-flex min-h-11 items-center rounded-ui-s border border-turquoise bg-turquoise/10 px-3 text-sm font-semibold text-deep-sea">{new Intl.DateTimeFormat("hu-HU", { month: "short", day: "numeric", timeZone: "Europe/Rome" }).format(new Date(`${answer.openDayDate}T12:00:00Z`)).replace(".", ".")} megnyitása</button> : null}
      {aiError ? <div className="mt-4 flex items-center justify-between gap-3 rounded-ui-s border border-coral/25 bg-coral/5 p-3.5" role="status">
        <p className="text-[13px] leading-[19px] text-deep-sea/70">{aiError}</p>
        <button type="button" onClick={() => void ask(question!)} className="min-h-11 shrink-0 px-1 text-[13px] font-semibold text-deep-sea">Újrapróbálás</button>
      </div> : null}
      {aiAnswer?.sources?.length ? <div className="mt-4 rounded-ui-s border border-deep-sea/10 bg-white/50 p-3.5">
        <p className="text-[11px] font-semibold tracking-[.04em] text-deep-sea/45">KUTATÁSI FORRÁSOK</p>
        <ul className="mt-2 space-y-2">
          {aiAnswer.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer" className="text-[13px] font-semibold leading-[19px] text-turquoise-dark underline decoration-turquoise/35 underline-offset-4">{source.title}</a></li>)}
        </ul>
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
          <Link href={recommendation.placeDetailHref} className="group flex gap-3 rounded-ui-s border border-deep-sea/10 bg-white/50 p-3.5 outline-none transition-colors hover:bg-white/80 focus-visible:ring-2 focus-visible:ring-turquoise-dark">
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
          </Link>
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
