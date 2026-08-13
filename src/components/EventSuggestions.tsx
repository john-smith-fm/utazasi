"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import type { TripEvent } from "@/lib/event-types";

function timeRange(event: TripEvent) {
  const format = (value: string) => new Intl.DateTimeFormat("hu-HU", {
    timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(new Date(value));
  return event.endsAt ? `${format(event.startsAt)}–${format(event.endsAt)}` : format(event.startsAt);
}

export function EventSuggestions({ date, events, onAccepted }: { date: string; events: TripEvent[]; onAccepted: () => void }) {
  if (events.length === 0) return null;
  return <section className="mt-6" aria-label="Programjavaslatok">
    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[.06em] text-deep-sea/45">Programjavaslat</p>
    <div className="space-y-2.5">
      {events.map((event) => <EventSuggestion key={event.id} date={date} event={event} onAccepted={onAccepted} />)}
    </div>
  </section>;
}

function EventSuggestion({ date, event, onAccepted }: { date: string; event: TripEvent; onAccepted: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(Boolean(event.accepted));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setAccepted(Boolean(event.accepted)); }, [event.accepted, event.id]);

  const eventLabel = event.status === "cancelled"
    ? "Hivatalos esemény · törölve"
    : event.status === "changed"
      ? "Hivatalos esemény · módosult"
      : "Hivatalos esemény";
  const eventExplanation = event.status === "cancelled"
    ? "A szervező az eseményt töröltként jelölte. Nem adható hozzá a napi tervhez."
    : event.status === "changed"
      ? "A szervező hivatalos programja módosult. A részleteket elfogadás előtt ellenőrizd a forrásnál."
      : "A szervező hivatalos programja alapján. Elfogadás után szerkeszthető Timeline-programként jelenik meg.";

  async function accept() {
    setAccepting(true);
    setError(null);
    try {
      const response = await fetch(`/api/events/${event.id}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Az esemény hozzáadása nem sikerült.");
      setAccepted(true);
      onAccepted();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Az esemény hozzáadása nem sikerült.");
    } finally {
      setAccepting(false);
    }
  }

  return <article className="rounded-ui-s border border-coral/25 bg-coral/10 px-4 py-3.5">
    <button type="button" onClick={() => setExpanded((value) => !value)} className="flex min-h-11 w-full items-start justify-between gap-3 text-left">
      <span>
        <span className="block text-[11px] font-semibold uppercase tracking-[.05em] text-coral">{eventLabel}</span>
        <span className="mt-0.5 block text-[16px] font-bold leading-[22px] text-deep-sea">{event.title}</span>
        <span className="mt-1 block text-[13px] leading-[19px] text-deep-sea/65">{timeRange(event)}</span>
      </span>
      <Icon name={expanded ? "chevron-up" : "chevron-right"} size={19} className="mt-2 shrink-0 text-coral" aria-hidden="true" />
    </button>
    {expanded ? <div className="mt-3 border-t border-coral/20 pt-3">
      <p className="text-[13px] leading-[19px] text-deep-sea/70">{eventExplanation}</p>
      <a href={event.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-11 items-center gap-1 text-[13px] font-semibold text-turquoise-dark">Hivatalos forrás <Icon name="arrow-up-right" size={15} /></a>
      {accepted ? <p className="mt-3 text-[13px] font-semibold text-turquoise-dark">Hozzáadva a napi tervhez.</p> : <button type="button" disabled={accepting || event.status === "cancelled"} onClick={() => void accept()} className="mt-3 min-h-11 rounded-ui-s border border-coral bg-coral/15 px-4 text-[13px] font-semibold text-deep-sea disabled:opacity-50">{accepting ? "Hozzáadás…" : "Elfogadás"}</button>}
      {error ? <p className="mt-2 text-[12px] leading-[18px] text-coral" role="alert">{error}</p> : null}
    </div> : null}
  </article>;
}
