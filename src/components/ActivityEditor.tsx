"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { HomeActivity } from "@/data/home-days";
import type { TimelineActivityInput } from "@/lib/timeline-types";
import { getPlaceBySlug, getPlaces } from "@/lib/places";
import { contextualPlaceSuggestionsFor } from "@/lib/contextual-place-suggestions";
import { placeBrowseCategoryForType } from "@/lib/place-categories";
import { TRIP_BASE_NAME, TRIP_BASE_SLUG } from "@/lib/trip-base";
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

type LocationSuggestion = { slug: string; name: string; meta: string; rationale?: string };

function matchingLocations(query: string): readonly LocationSuggestion[] {
  const normalizedQuery = normalizedSearchValue(query.trim());
  if (!normalizedQuery) return [];
  const tripBase: LocationSuggestion[] = [TRIP_BASE_NAME, "szállás", "apartman"]
    .some((value) => normalizedSearchValue(value).includes(normalizedQuery))
    ? [{ slug: TRIP_BASE_SLUG, name: TRIP_BASE_NAME, meta: "Szállás" }]
    : [];
  return [
    ...tripBase,
    ...matchingPlaces(query).map((place) => ({
      slug: place.slug,
      name: place.name,
      meta: [place.location?.locality, PLACE_TYPE_LABEL[place.type]].filter(Boolean).join(" · "),
    })),
  ];
}

export function ActivityEditor({ activity, onClose, onSave, onDelete }: {
  activity?: HomeActivity;
  onClose: () => void;
  onSave: (input: TimelineActivityInput, requestId?: string) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const router = useRouter();
  const [input, setInput] = useState(() => initialInput(activity));
  const [action, setAction] = useState<ActionState>("idle");
  const [error, setError] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const editing = Boolean(activity?.id);
  const createRequestId = useRef<string | null>(null);
  const suggestions = useMemo(() => matchingLocations(input.locationName), [input.locationName]);
  const contextualSuggestions = useMemo(() => contextualPlaceSuggestionsFor(input.title), [input.title]);
  const shouldShowContextualSuggestions = showSuggestions && !input.locationName.trim() && Boolean(contextualSuggestions.intent);

  function update<Key extends keyof TimelineActivityInput>(key: Key, value: TimelineActivityInput[Key]) {
    setInput((current) => ({ ...current, [key]: value }));
    setError("");
  }

  function updateLocationName(locationName: string) {
    setInput((current) => ({ ...current, locationName, placeSlug: null }));
    setError("");
    setShowSuggestions(true);
  }

  function selectPlace(place: LocationSuggestion) {
    setInput((current) => ({ ...current, locationName: place.name, placeSlug: place.slug }));
    setError("");
    setShowSuggestions(false);
  }

  function openPlaceDetails(slug: string) {
    const place = getPlaceBySlug(slug);
    if (!place) return;
    setShowSuggestions(false);
    router.push(`/places/${place.slug}?category=${placeBrowseCategoryForType(place.type)}`);
  }

  function suggestionButton(place: LocationSuggestion) {
    const canonicalPlace = getPlaceBySlug(place.slug);
    return <li key={place.slug} role="option" aria-selected={input.placeSlug === place.slug} className="flex min-h-11 items-stretch">
      <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => selectPlace(place)} className="min-h-11 min-w-0 flex-1 px-4 py-2 text-left outline-none transition-colors hover:bg-sand focus-visible:bg-sand">
        <span className="block text-[15px] font-semibold leading-5 text-deep-sea">{place.name}</span>
        {place.rationale ? <span className="mt-0.5 block text-[13px] leading-[18px] text-deep-sea/60">{place.rationale}</span> : place.meta && <span className="mt-0.5 block text-[13px] leading-[18px] text-deep-sea/60">{place.meta}</span>}
      </button>
      {canonicalPlace && <button
        type="button"
        aria-label={`${canonicalPlace.name} adatlapjának megnyitása`}
        title="Hely adatlapjának megnyitása"
        onMouseDown={(event) => event.preventDefault()}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          openPlaceDetails(canonicalPlace.slug);
        }}
        className="my-2 mr-3 flex size-8 shrink-0 items-center justify-center rounded-full border border-turquoise/45 text-[14px] font-bold leading-none text-turquoise-dark transition-colors hover:bg-turquoise hover:text-white focus-visible:bg-turquoise focus-visible:text-white"
      >i</button>}
    </li>;
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

  return <section role="dialog" aria-modal="true" aria-label={editing ? "Program szerkesztése" : "Új program"} className="fixed inset-0 z-[70] overflow-y-auto bg-quartz px-2 py-2 text-deep-sea">
    <form onSubmit={(event) => void submit(event)} className="editor-soft-sheet mx-auto flex min-h-[calc(100dvh-16px)] max-w-[430px] flex-col rounded-m px-5 pb-[calc(28px+env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)]">
      <header className="flex min-h-14 items-center justify-between">
        <button type="button" onClick={onClose} disabled={action !== "idle"} className="min-h-11 min-w-11 rounded-ui-s px-2 text-left text-[15px] font-semibold disabled:opacity-45">Vissza</button>
        <h1 className="text-xl font-bold tracking-[-.02em]">{editing ? "Program" : "Új program"}</h1>
        <button type="submit" disabled={action !== "idle"} className="min-h-11 min-w-11 rounded-ui-s px-2 text-right text-[15px] font-semibold text-turquoise-dark disabled:opacity-45">{action === "saving" ? "…" : "Mentés"}</button>
      </header>
      <div className="mt-8 space-y-5">
        <Field label="Program"><input autoFocus required maxLength={120} value={input.title} onChange={(event) => update("title", event.target.value)} className={`${FORM_CONTROL} w-full px-4`} /></Field>
        <div className="flex gap-[10%]">
          <div className="w-[38%] min-w-0"><Field label="Kezdés">
            <input required type="time" value={input.startTime} onChange={(event) => update("startTime", event.target.value)} className={`${FORM_CONTROL} h-12 min-h-0 min-w-0 w-full px-3`} aria-label="Kezdés" />
          </Field></div>
          <div className="w-[52%] min-w-0"><Field label="Időtartam (perc)"><input required type="number" min="1" max="1440" inputMode="numeric" value={input.durationMinutes} onChange={(event) => update("durationMinutes", Number(event.target.value))} className={`${FORM_CONTROL} h-12 min-h-0 min-w-0 w-full px-3`} /></Field></div>
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
              aria-expanded={showSuggestions && (suggestions.length > 0 || shouldShowContextualSuggestions)}
              aria-controls="place-suggestions"
              className={`${FORM_CONTROL} w-full px-4`}
            />
            {showSuggestions && (suggestions.length > 0 || shouldShowContextualSuggestions) && <div id="place-suggestions" role="listbox" className="glass-surface contextual-place-suggestions subtle-reveal absolute z-10 mt-2 max-h-64 w-full overflow-y-auto rounded-ui-s border py-1">
              {shouldShowContextualSuggestions && <>
                {contextualSuggestions.recommended.length > 0 ? <>
                  <p className="px-4 pb-1 pt-2 text-[12px] font-semibold uppercase tracking-[.08em] text-deep-sea/45">Ajánlott helyek</p>
                  <ul>{contextualSuggestions.recommended.map(suggestionButton)}</ul>
                  {contextualSuggestions.additional.length > 0 && <><div className="mx-4 my-1 border-t border-deep-sea/10" /><p className="px-4 pb-1 pt-2 text-[12px] font-semibold uppercase tracking-[.08em] text-deep-sea/45">További helyek</p><ul>{contextualSuggestions.additional.map(suggestionButton)}</ul></>}
                </> : <p className="px-4 py-3 text-[14px] leading-5 text-deep-sea/60">Ehhez még nincs ajánlott helyünk. Keress rá egy másik helyre, vagy írj be szabad szöveges helyszínt.</p>}
              </>}
              {suggestions.length > 0 && <>
                {shouldShowContextualSuggestions && <div className="mx-4 my-1 border-t border-deep-sea/10" />}
                <p className="px-4 pb-1 pt-2 text-[12px] font-semibold uppercase tracking-[.08em] text-deep-sea/45">Keresési találatok</p>
                <ul>{suggestions.map(suggestionButton)}</ul>
              </>}
            </div>}
          </div>
        </Field>
        <Field label="Megjegyzés"><textarea maxLength={1000} value={input.description} onChange={(event) => update("description", event.target.value)} className={`${FORM_TEXTAREA} w-full px-4 py-3`} /></Field>
      </div>
      {error && <p className="mt-5 text-sm leading-[21px] text-error" role="alert">{error}</p>}
      {editing && <div className="mt-auto pt-10"><button type="button" onClick={() => void remove()} disabled={action !== "idle"} className="min-h-11 w-full rounded-full bg-error px-4 text-[15px] font-semibold text-white disabled:opacity-45">{action === "deleting" ? "…" : "Program törlése"}</button></div>}
    </form>
  </section>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-[13px] font-semibold text-deep-sea/55">{label}</span>{children}</label>;
}
