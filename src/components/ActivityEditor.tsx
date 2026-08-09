"use client";

import { useMemo, useRef, useState } from "react";
import type { HomeActivity } from "@/data/home-days";
import type { TimelineActivityInput } from "@/lib/timeline-types";
import { getPlaces } from "@/lib/places";
import type { Place, PlaceType } from "@/types/places";
import { FORM_CONTROL, FORM_TEXTAREA } from "@/components/formStyles";

type ActionState = "idle" | "saving" | "deleting";

function initialInput(activity?: HomeActivity): TimelineActivityInput {
  return {
    title: activity?.title ?? "",
    startTime: activity?.time || "09:00",
    durationMinutes: activity?.durationMinutes ?? 60,
    locationName: activity?.place ?? "",
    placeSlug: activity?.placeSlug ?? null,
    description: activity?.description ?? "",
  };
}

const PLACE_TYPE_LABEL: Record<PlaceType, string> = {
  beach: "Strand",
  restaurant: "Étterem",
  cafe: "Kávézó",
  playground: "Játszótér",
  shop: "Bolt",
  sight: "Látnivaló",
  parking: "Parkolás",
  other: "Hely",
};

function normalizedSearchValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("hu");
}

function matchingPlaces(query: string): readonly Place[] {
  const normalizedQuery = normalizedSearchValue(query.trim());
  if (!normalizedQuery) return [];
  return getPlaces().filter((place) => [place.name, place.slug, place.location?.locality]
    .filter((value): value is string => Boolean(value))
    .some((value) => normalizedSearchValue(value).includes(normalizedQuery)));
}

export function ActivityEditor({ activity, onClose, onSave, onDelete }: {
  activity?: HomeActivity;
  onClose: () => void;
  onSave: (input: TimelineActivityInput, requestId?: string) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [input, setInput] = useState(() => initialInput(activity));
  const [action, setAction] = useState<ActionState>("idle");
  const [error, setError] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const editing = Boolean(activity?.id);
  const createRequestId = useRef<string | null>(null);
  const suggestions = useMemo(() => matchingPlaces(input.locationName), [input.locationName]);

  function update<Key extends keyof TimelineActivityInput>(key: Key, value: TimelineActivityInput[Key]) {
    setInput((current) => ({ ...current, [key]: value }));
    setError("");
  }

  function updateLocationName(locationName: string) {
    setInput((current) => ({ ...current, locationName, placeSlug: null }));
    setError("");
    setShowSuggestions(true);
  }

  function selectPlace(place: Place) {
    setInput((current) => ({ ...current, locationName: place.name, placeSlug: place.slug }));
    setError("");
    setShowSuggestions(false);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (action !== "idle") return;
    setAction("saving");
    try {
      if (!editing && !createRequestId.current) createRequestId.current = crypto.randomUUID();
      await onSave(input, createRequestId.current ?? undefined);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "A mentés nem sikerült.");
      setAction("idle");
    }
  }

  async function remove() {
    if (!onDelete || action !== "idle") return;
    setAction("deleting");
    try {
      await onDelete();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "A törlés nem sikerült.");
      setAction("idle");
    }
  }

  return <section role="dialog" aria-modal="true" aria-label={editing ? "Program szerkesztése" : "Új program"} className="fixed inset-0 z-[70] overflow-y-auto bg-quartz text-deep-sea">
    <form onSubmit={(event) => void submit(event)} className="mx-auto flex min-h-dvh max-w-[430px] flex-col px-5 pb-[calc(28px+env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)]">
      <header className="flex min-h-14 items-center justify-between">
        <button type="button" onClick={onClose} disabled={action !== "idle"} className="min-h-11 min-w-11 rounded-ui-s px-2 text-left text-[15px] font-semibold disabled:opacity-45">Vissza</button>
        <h1 className="text-xl font-bold tracking-[-.02em]">{editing ? "Program" : "Új program"}</h1>
        <button type="submit" disabled={action !== "idle"} className="min-h-11 min-w-11 rounded-ui-s px-2 text-right text-[15px] font-semibold text-turquoise-dark disabled:opacity-45">{action === "saving" ? "…" : "Mentés"}</button>
      </header>
      <div className="mt-8 space-y-5">
        <Field label="Program"><input autoFocus required maxLength={120} value={input.title} onChange={(event) => update("title", event.target.value)} className={`${FORM_CONTROL} w-full px-4`} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Kezdés"><input required type="time" value={input.startTime} onChange={(event) => update("startTime", event.target.value)} className={`${FORM_CONTROL} w-full px-3`} /></Field>
          <Field label="Időtartam (perc)"><input required type="number" min="1" max="1440" inputMode="numeric" value={input.durationMinutes} onChange={(event) => update("durationMinutes", Number(event.target.value))} className={`${FORM_CONTROL} w-full px-3`} /></Field>
        </div>
        <Field label="Helyszín">
          <div className="relative">
            <input
              maxLength={160}
              value={input.locationName}
              onChange={(event) => updateLocationName(event.target.value)}
              onFocus={() => setShowSuggestions(true)}
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={showSuggestions && suggestions.length > 0}
              aria-controls="place-suggestions"
              className={`${FORM_CONTROL} w-full px-4`}
            />
            {showSuggestions && suggestions.length > 0 && <ul id="place-suggestions" role="listbox" className="absolute z-10 mt-2 max-h-56 w-full overflow-y-auto rounded-ui-s border border-deep-sea/10 bg-white py-1 shadow-[0_10px_24px_rgba(24,50,59,.12)]">
              {suggestions.map((place) => {
                const meta = [place.location?.locality, PLACE_TYPE_LABEL[place.type]].filter(Boolean).join(" · ");
                return <li key={place.slug} role="option" aria-selected={input.placeSlug === place.slug}>
                  <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => selectPlace(place)} className="min-h-11 w-full px-4 py-2 text-left outline-none transition-colors hover:bg-sand focus-visible:bg-sand">
                    <span className="block text-[15px] font-semibold leading-5 text-deep-sea">{place.name}</span>
                    {meta && <span className="mt-0.5 block text-[13px] leading-[18px] text-deep-sea/60">{meta}</span>}
                  </button>
                </li>;
              })}
            </ul>}
          </div>
        </Field>
        <Field label="Megjegyzés"><textarea maxLength={1000} value={input.description} onChange={(event) => update("description", event.target.value)} className={`${FORM_TEXTAREA} w-full px-4 py-3`} /></Field>
      </div>
      {error && <p className="mt-5 text-sm leading-[21px] text-error" role="alert">{error}</p>}
      {editing && <div className="mt-auto pt-10"><button type="button" onClick={() => void remove()} disabled={action !== "idle"} className="min-h-11 w-full rounded-ui-s border border-error/30 bg-error/10 px-4 text-[15px] font-semibold text-error disabled:opacity-45">{action === "deleting" ? "…" : "Program törlése"}</button></div>}
    </form>
  </section>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-[13px] font-semibold text-deep-sea/55">{label}</span>{children}</label>;
}
