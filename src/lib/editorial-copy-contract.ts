import type { DaySignal, DayTheme, TripPhase } from "./day-display-context";

export type EditorialPlaceFact = {
  name: string;
  type: string;
  facts: readonly string[];
};

export type RecentEditorialCopy = { title: string; subtitle: string };

/** A deliberately compact, public trip-level map. It is enough to recognise
 * first visits, returns and contrasts without exposing other days' text. */
export type TripEditorialBeat = {
  dayNumber: number;
  phase: TripPhase;
  signals: readonly DaySignal[];
  mainActivityType: DayTheme | null;
  mainPlaceName: string | null;
  placeOccurrence: "first" | "return" | "consecutive_return" | null;
};

/**
 * This is the only context that crosses into the copywriter. It contains
 * deterministic trip facts and public canonical Place facts, never raw
 * Notebook data, private accommodation details or another day's Timeline.
 */
export type EditorialCopyInput = {
  date: string;
  day: { number: number; total: number; phase: TripPhase };
  /** Short, privacy-safe programme facts for natural copy; never raw notes. */
  dayFacts: readonly string[];
  signals: readonly DaySignal[];
  mainActivity: { type: DayTheme; placeName: string | null } | null;
  secondaryShape: "relaxed" | "event_evening" | "busy" | "open" | "simple";
  verifiedEvent: { title: string; time: string | null } | null;
  placeFacts: readonly EditorialPlaceFact[];
  recentEditorialCopy: readonly RecentEditorialCopy[];
  tripEditorialSummary: readonly TripEditorialBeat[];
};

export type EditorialCopy = { title: string; subtitle: string };

type EditorialCopyPayload = EditorialCopy & { grounding?: unknown };

export class EditorialCopyContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EditorialCopyContractError";
  }
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("hu-HU").replace(/\s+/g, " ").trim();
}

function words(value: string) {
  return normalize(value).split(/[^a-z0-9]+/).filter(Boolean);
}

function hasEmoji(value: string) {
  return /[\p{Extended_Pictographic}\uFE0F]/u.test(value);
}

function saneText(value: unknown, maxLength: number) {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= maxLength;
}

function knownGrounding(input: EditorialCopyInput) {
  return new Set([
    ...input.dayFacts,
    ...input.signals.map((signal) => `signal:${signal}`),
    ...(input.mainActivity?.placeName ? [input.mainActivity.placeName] : []),
    ...(input.verifiedEvent ? [input.verifiedEvent.title, ...(input.verifiedEvent.time ? [input.verifiedEvent.time] : [])] : []),
    ...input.placeFacts.flatMap((place) => [place.name, ...place.facts]),
  ].map(normalize));
}

function isSignal(value: unknown): value is DaySignal {
  return typeof value === "string" && ["empty_day", "arrival_day", "departure_day", "beach_day", "excursion_day", "relaxed_day", "busy_day", "special_event", "evening_event", "new_place", "returning_place", "shopping_day", "mostly_local", "trip_midpoint", "last_full_day"].includes(value);
}

/** Rejects malformed or oversized browser input before it reaches the model. */
export function sanitizeEditorialCopyInput(value: unknown): EditorialCopyInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Partial<EditorialCopyInput>;
  const day = candidate.day;
  if (typeof candidate.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(candidate.date)
    || !day || !Number.isInteger(day.number) || !Number.isInteger(day.total) || day.number! < 1 || day.total! < day.number!
    || !["arrival", "early", "middle", "late", "last_full_day", "departure"].includes(day.phase as string)
    || !Array.isArray(candidate.dayFacts) || !candidate.dayFacts.every((fact) => saneText(fact, 160)) || candidate.dayFacts.length > 5
    || !Array.isArray(candidate.signals) || !candidate.signals.every(isSignal)
    || !["relaxed", "event_evening", "busy", "open", "simple"].includes(candidate.secondaryShape as string)
    || !Array.isArray(candidate.placeFacts) || !Array.isArray(candidate.recentEditorialCopy) || !Array.isArray(candidate.tripEditorialSummary)) return null;
  const mainActivity = candidate.mainActivity === null ? null : candidate.mainActivity;
  if (mainActivity && (typeof mainActivity !== "object" || !["travel", "beach", "family", "explore", "shopping", "food", "rest", "event", "general"].includes(mainActivity.type) || (mainActivity.placeName !== null && !saneText(mainActivity.placeName, 100)))) return null;
  const verifiedEvent = candidate.verifiedEvent === null ? null : candidate.verifiedEvent;
  if (verifiedEvent && (typeof verifiedEvent !== "object" || !saneText(verifiedEvent.title, 120) || (verifiedEvent.time !== null && !saneText(verifiedEvent.time, 20)))) return null;
  const placeFacts = candidate.placeFacts.flatMap((place) => {
    if (!place || typeof place !== "object" || !saneText(place.name, 120) || !saneText(place.type, 50) || !Array.isArray(place.facts)) return [];
    if (!place.facts.every((fact: unknown) => saneText(fact, 160))) return [];
    const facts = place.facts.filter((fact: unknown): fact is string => saneText(fact, 160)).slice(0, 4);
    return [{ name: place.name.trim(), type: place.type.trim(), facts }];
  }).slice(0, 2);
  if (placeFacts.length !== candidate.placeFacts.length) return null;
  const recentEditorialCopy = candidate.recentEditorialCopy.flatMap((copy) => {
    if (!copy || typeof copy !== "object" || !saneText(copy.title, 62) || !saneText(copy.subtitle, 280)) return [];
    return [{ title: copy.title.trim(), subtitle: copy.subtitle.trim() }];
  }).slice(-4);
  if (recentEditorialCopy.length !== candidate.recentEditorialCopy.length) return null;
  const tripEditorialSummary: TripEditorialBeat[] = candidate.tripEditorialSummary.flatMap((rawBeat): TripEditorialBeat[] => {
    if (!rawBeat || typeof rawBeat !== "object") return [];
    const beat = rawBeat as Record<string, unknown>;
    const { dayNumber, phase, signals, mainActivityType, mainPlaceName, placeOccurrence } = beat;
    const allowedTheme = mainActivityType === null || (typeof mainActivityType === "string" && ["travel", "beach", "family", "explore", "shopping", "food", "rest", "event", "general"].includes(mainActivityType));
    const allowedOccurrence = placeOccurrence === null || placeOccurrence === "first" || placeOccurrence === "return" || placeOccurrence === "consecutive_return";
    if (typeof dayNumber !== "number" || !Number.isInteger(dayNumber) || dayNumber < 1
      || typeof phase !== "string" || !["arrival", "early", "middle", "late", "last_full_day", "departure"].includes(phase)
      || !Array.isArray(signals) || !signals.every(isSignal)
      || !allowedTheme
      || (mainPlaceName !== null && !saneText(mainPlaceName, 100))
      || !allowedOccurrence) return [];
    return [{
      dayNumber,
      phase: phase as TripPhase,
      signals: [...new Set(signals)],
      mainActivityType: mainActivityType as DayTheme | null,
      mainPlaceName: mainPlaceName as string | null,
      placeOccurrence: placeOccurrence as TripEditorialBeat["placeOccurrence"],
    }];
  }).slice(0, 16);
  if (tripEditorialSummary.length !== candidate.tripEditorialSummary.length) return null;
  return {
    date: candidate.date, day: { number: day.number!, total: day.total!, phase: day.phase as TripPhase }, dayFacts: [...new Set(candidate.dayFacts.map((fact) => fact.trim()))], signals: [...new Set(candidate.signals)],
    mainActivity: mainActivity ? { type: mainActivity.type, placeName: mainActivity.placeName } : null,
    secondaryShape: candidate.secondaryShape as EditorialCopyInput["secondaryShape"], verifiedEvent: verifiedEvent ? { title: verifiedEvent.title.trim(), time: verifiedEvent.time } : null,
    placeFacts, recentEditorialCopy, tripEditorialSummary,
  };
}

/** A deterministic compact key. It is a cache identity, never a security hash. */
export function editorialFingerprint(input: EditorialCopyInput): string {
  const stable = JSON.stringify({
    copywriterPromptVersion: 2,
    date: input.date,
    day: input.day,
    dayFacts: [...input.dayFacts],
    signals: [...input.signals].sort(),
    mainActivity: input.mainActivity,
    secondaryShape: input.secondaryShape,
    verifiedEvent: input.verifiedEvent,
    placeFacts: input.placeFacts.map((place) => ({ ...place, facts: [...place.facts] })),
    recentEditorialCopy: input.recentEditorialCopy.map((copy) => ({ title: copy.title, subtitle: copy.subtitle })),
    tripEditorialSummary: input.tripEditorialSummary.map((beat) => ({ ...beat, signals: [...beat.signals].sort() })),
  });
  let hash = 2_166_136_261;
  for (let index = 0; index < stable.length; index += 1) {
    hash ^= stable.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return `v2-${(hash >>> 0).toString(36)}`;
}

export function parseEditorialCopy(value: string, input: EditorialCopyInput): EditorialCopy {
  let parsed: EditorialCopyPayload;
  try {
    parsed = JSON.parse(value.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")) as EditorialCopyPayload;
  } catch {
    throw new EditorialCopyContractError("A napi szerkesztői szöveg nem feldolgozható JSON.");
  }
  const title = typeof parsed.title === "string" ? parsed.title.trim() : "";
  const subtitle = typeof parsed.subtitle === "string" ? parsed.subtitle.trim() : "";
  const grounding = Array.isArray(parsed.grounding) && parsed.grounding.every((item) => typeof item === "string") ? parsed.grounding : [];
  if (!saneText(title, 62) || !saneText(subtitle, 280)) throw new EditorialCopyContractError("A napi szerkesztői szöveg hossza nem megfelelő.");
  if (/\r|\n/.test(title) || hasEmoji(title) || /[.!?…]$/.test(title)) throw new EditorialCopyContractError("A napi cím formátuma nem megfelelő.");
  if (/\r|\n{2,}|^[•*-]\s/m.test(subtitle) || hasEmoji(subtitle)) throw new EditorialCopyContractError("A napi alcím formátuma nem megfelelő.");

  const normalizedTitle = normalize(title);
  const recentTitles = input.recentEditorialCopy.map((copy) => normalize(copy.title));
  if (recentTitles.includes(normalizedTitle)) throw new EditorialCopyContractError("A napi cím ismétli egy friss cím szövegét.");

  const titleWords = words(title);
  const titlePrefix = titleWords.slice(0, 2).join(" ");
  if (titleWords.length < 2 || titleWords.length > 6 || (titlePrefix && input.recentEditorialCopy.some((copy) => words(copy.title).slice(0, 2).join(" ") === titlePrefix))) throw new EditorialCopyContractError("A napi cím nem elég önálló.");
  const allowedGrounding = knownGrounding(input);
  if (!grounding.length || grounding.length > 4 || grounding.some((fact) => !allowedGrounding.has(normalize(fact)))) throw new EditorialCopyContractError("A napi szöveg nem kapcsolható kizárólag az ellenőrzött nap-adatokhoz.");
  return { title, subtitle };
}

export function isEditorialCopyInput(value: unknown): value is EditorialCopyInput {
  return sanitizeEditorialCopyInput(value) !== null;
}
