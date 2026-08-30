import type { HomeDay } from "../data/home-days";
import type { WeatherSnapshot } from "../types";
import type { TripEvent } from "./event-types";
import { getTimelineQuestionAnswer, getTripTimelineQuestionAnswer } from "./timeline-questioning.ts";
import { TRIP_BASE_NAME } from "./trip-base.ts";
import { buildQuestionContext, type QuestionContext } from "./question-context.ts";
import type { Place } from "@/types/places";
import { getPlaceQuestionFacts } from "./place-question-facts.ts";
import {
  completeAssessment,
  incompleteAssessment,
  type AnswerRequirement,
  type QuestionAssessment,
} from "./question-evidence.ts";

export type QuestionRecommendation = {
  placeSlug: string;
  name: string;
  rationale?: string;
  confirmedFacts: string[];
  uncertainty?: string;
  placeDetailHref: string;
};

export type QuestionAnswer = {
  title: string;
  body: string;
  sources: string[];
  recommendations?: QuestionRecommendation[];
  /** A cross-day Timeline answer may offer this explicit navigation action. */
  openDayDate?: string;
};

export type QuestionResolution = {
  answer: QuestionAnswer;
  assessment: QuestionAssessment;
};

type ShoppingAnswer = QuestionAnswer | null;

function normalized(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("hu-HU");
}

export function isAccommodationQuestion(question: string) {
  return /(hol.*szallas|szallas.*hol|apartman.*hol)/.test(normalized(question));
}

function eventAnswer(question: string, events: readonly TripEvent[]): QuestionAnswer | null {
  const value = normalized(question);
  // These must be full words. A loose /ar/ match incorrectly classified
  // questions such as "Hol tudunk gyorsan bevásárolni?" as admission queries.
  const asksAdmission = /\b(belepo|jegy|jegyar|ar)\b/.test(value);
  const asksFireworks = /tuzijatek/.test(value);
  // A bare "mikor" is not an Event question: it can just as easily mean the
  // family's own Timeline plan (for example, a scheduled flight home).
  // Only named external-event concepts should enter the Event branch.
  const eventTerms = ["fesztival", "koncert", "felvonulas", "kiallitas", "hajokirandulas", "muzeum"];
  // Hungarian questions naturally carry suffixes ("koncertre", "fesztiválon").
  // Treat those as the same named event without widening matching to unrelated
  // substrings.
  const namedEventTerms = eventTerms.filter((term) => new RegExp(`\\b${term}[a-z]*\\b`).test(value));
  const asksEventTime = /\besemeny\b/.test(value) || namedEventTerms.length > 0;
  if (!asksAdmission && !asksFireworks && !asksEventTime) return null;
  if (asksFireworks && !events.some((event) => /tűzijáték|tuzijatek/i.test(event.title))) {
    return { title: "Nincs megerősített tűzijáték", body: "A kiválasztott naphoz nincs ellenőrzött tűzijáték-esemény rögzítve. Nem állítok időpontot vagy helyszínt forrás nélkül.", sources: ["Event"] };
  }
  if (asksAdmission) {
    return { title: "A belépőről nincs biztos adat", body: "A jelenlegi ellenőrzött Place- és Event-adatok nem tartalmaznak megbízható belépő- vagy jegyár-információt ehhez a kérdéshez. Nem találgatok.", sources: ["Place", "Event"] };
  }
  const activeEvents = events.filter((event) => event.status !== "cancelled");
  const candidates = namedEventTerms.length
    // A specifically named cancelled Event remains a useful, grounded answer
    // ("X · törölve"). Only an unspecified generic event question hides it.
    ? events.filter((event) => namedEventTerms.some((term) => normalized(event.title).includes(term)))
    : activeEvents;
  if (candidates.length > 1) {
    return {
      title: "Több rögzített esemény",
      body: `A kiválasztott naphoz több ellenőrzött esemény tartozik: ${candidates.slice(0, 3).map((event) => event.title).join(", ")}. Írd be, melyikre gondolsz, és nem választok találgatással közülük.`,
      sources: ["Event"],
    };
  }
  const event = candidates[0];
  if (!event) return { title: "Nincs rögzített esemény", body: "A kiválasztott naphoz jelenleg nincs ellenőrzött, külső esemény rögzítve.", sources: ["Event"] };
  if (event.status === "cancelled") return { title: `${event.title} · törölve`, body: "Az esemény törölt állapotban van. Indulás előtt az eredeti szervezői forrást is ellenőrizd.", sources: ["Event"] };
  const spansWholeDay = Boolean(event.endsAt && new Date(event.startsAt).toDateString() !== new Date(event.endsAt).toDateString());
  if (spansWholeDay) return { title: event.title, body: "Az esemény a kiválasztott napot lefedi, de a részletes esti kezdési idő nincs ellenőrzött adatként rögzítve.", sources: ["Event"] };
  return { title: event.title, body: `Kezdés: ${new Intl.DateTimeFormat("hu-HU", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit" }).format(new Date(event.startsAt))}.`, sources: ["Event"] };
}

function placeParkingNote(place: Place) {
  if (place.details.kind === "beach") return place.details.access?.parkingNotes;
  const details = place.intelligence?.details;
  if (!details || typeof details !== "object" || Array.isArray(details)) return undefined;
  const access = (details as Record<string, unknown>).access;
  if (!access || typeof access !== "object" || Array.isArray(access)) return undefined;
  const parking = (access as Record<string, unknown>).parking_notes ?? (access as Record<string, unknown>).parking;
  return typeof parking === "string" && parking.trim() ? parking : undefined;
}

const PLACE_QUERY_STOP_WORDS = new Set([
  "a", "az", "a", "milyen", "mi", "van", "hol", "hogyan", "merre", "parkolas", "parkolo",
  "milyen", "oda", "itt", "ott", "es", "meg", "a", "strand", "beach", "spiaggia",
]);

function placeNameTokens(place: Place) {
  return normalized(place.name)
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 3 && !["spiaggia", "beach"].includes(word));
}

function questionPlaceTokens(question: string) {
  return normalized(question)
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 3 && !PLACE_QUERY_STOP_WORDS.has(word));
}

function sameOrHungarianSuffix(value: string, canonical: string) {
  return value === canonical || (canonical.length >= 4 && value.startsWith(canonical));
}

function canonicalNameTokens(place: Place) {
  return normalized(place.name).split(/[^a-z0-9]+/).filter(Boolean);
}

/**
 * A complete canonical name must outrank a shorter shared fragment. For
 * example, "Spiaggia di Porto Sa Ruxi" is more specific than the shared
 * "Porto Sa Ruxi" part in a related parking Place. The final token may carry
 * a Hungarian suffix ("Ruxin"), but the name still has to occur as one
 * contiguous phrase.
 */
function containsCanonicalName(question: string, place: Place) {
  const questionTokens = normalized(question).split(/[^a-z0-9]+/).filter(Boolean);
  const nameTokens = canonicalNameTokens(place);
  if (!nameTokens.length || nameTokens.length > questionTokens.length) return false;

  return questionTokens.some((_, start) =>
    nameTokens.every((nameToken, offset) => sameOrHungarianSuffix(questionTokens[start + offset] ?? "", nameToken)),
  );
}

/**
 * Resolve only an explicit canonical name or a uniquely matching meaningful
 * name fragment. "Porto" deliberately produces all Porto candidates; it
 * never silently picks the place that happens to be in today's Timeline.
 */
function placeCandidatesInQuestion(question: string, context: QuestionContext) {
  const completeNameMatches = context.knownPlaces.filter((place) => containsCanonicalName(question, place));
  // A full canonical phrase is an intentional disambiguation by the family.
  // Keep more than one only if the canonical data itself is duplicated.
  if (completeNameMatches.length) return completeNameMatches;

  const questionTokens = questionPlaceTokens(question);
  if (!questionTokens.length) return [];
  const candidates = context.knownPlaces;
  return candidates.filter((place) => {
    const nameTokens = placeNameTokens(place);
    return questionTokens.every((questionToken) => nameTokens.some((nameToken) => sameOrHungarianSuffix(questionToken, nameToken)));
  });
}

function uniquePlaces(places: readonly Place[]) {
  return [...new Map(places.map((place) => [place.slug, place])).values()];
}

type PlaceFactTopic = "length" | "shore" | "access" | "water" | "service" | "family" | "food" | "market" | "opening";

/**
 * Classify the kind of fact, not a named phrase or individual Place. This
 * keeps the resolver extensible: an added beach or service is automatically
 * answerable without creating another intent branch.
 */
function requestedPlaceFactTopic(value: string): PlaceFactTopic | null {
  if (/hossz|kilometer|\bkm\b|meter|\bm\b.*strand|leghosszabb/.test(value)) return "length";
  if (/homok|kavics|szikla|parttip|milyen.*part/.test(value)) return "shore";
  if (/megkozel|babakocsi|akadalyment|lepcso|foldut|szerpentin/.test(value)) return "access";
  if (/vizbelep|sekely|szel|viz/.test(value)) return "water";
  // These describe a service-property family, not a routing decision. The
  // same Place retrieval still runs for every question; this only lets a
  // verified service fact be compared with the user's requested property.
  if (/wc|mosdo|zuhany|bufe|kave|kavezo|bar|ital|sor|aranyek|vizisport|kano|vizibicikli|szolgaltatas/.test(value)) return "service";
  if (/gyerek|kisgyerek|csalad/.test(value)) return "family";
  if (/konyha|reggeli|ebed|vacsora|aperitivo|elvitel|foglalas|vegan|gluten/.test(value)) return "food";
  if (/piac|vasar/.test(value)) return "market";
  if (/nyitvatart|mikor.*nyit|mikor.*zar/.test(value)) return "opening";
  return null;
}

function requestedLengthThreshold(value: string) {
  const match = value.match(/(\d+(?:[.,]\d+)?)\s*(km|kilometer|m)\b/);
  if (!match || !/hosszabb|hossz.*mint|felett|nagyobb/.test(value)) return undefined;
  const amount = Number(match[1].replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0) return undefined;
  return match[2] === "m" ? amount : amount * 1_000;
}

type BeachFilters = {
  shoreType?: "sandy" | "pebbly" | "rocky";
  landAccess?: "easy" | "moderate" | "hard" | "no_access";
};

/**
 * These are property constraints, not named question intents. A new beach
 * with the same canonical values becomes filterable automatically.
 */
function requestedBeachFilters(value: string): BeachFilters {
  const filters: BeachFilters = {};
  if (/homok/.test(value)) filters.shoreType = "sandy";
  else if (/kavics/.test(value)) filters.shoreType = "pebbly";
  else if (/szikla|koves/.test(value)) filters.shoreType = "rocky";

  if (/konny.*megkozel|konnyu.*megkozel/.test(value)) filters.landAccess = "easy";
  else if (/nehez.*megkozel/.test(value)) filters.landAccess = "hard";
  else if (/kozepes.*megkozel/.test(value)) filters.landAccess = "moderate";
  return filters;
}

function requestedServiceNeed(value: string) {
  if (/\b(wc|mosdo)\b/.test(value)) return /\b(wc|mosdo)\b/;
  if (/napernyo/.test(value)) return /napernyo/;
  if (/zuhany/.test(value)) return /zuhany/;
  if (/bufe/.test(value)) return /bufe/;
  if (/kave|kavezo|bar|ital|sor/.test(value)) return /bufe|bar|kave|ital|sor/;
  if (/kano/.test(value)) return /kano/;
  if (/vizibicikli/.test(value)) return /vizibicikli/;
  return null;
}

function beachFilterAnswer(filters: BeachFilters, context: QuestionContext): QuestionAnswer | null {
  if (!filters.shoreType && !filters.landAccess) return null;
  const matches = context.knownPlaces.filter((place) => {
    if (place.details.kind !== "beach") return false;
    return (!filters.shoreType || place.details.shoreType === filters.shoreType)
      && (!filters.landAccess || place.details.landAccess === filters.landAccess);
  });
  const labels = [
    filters.shoreType === "sandy" ? "Homokos" : filters.shoreType === "pebbly" ? "Kavicsos" : filters.shoreType === "rocky" ? "Sziklás" : undefined,
    filters.landAccess === "easy" ? "könnyen megközelíthető" : filters.landAccess === "moderate" ? "közepes megközelítésű" : filters.landAccess === "hard" ? "nehezen megközelíthető" : undefined,
  ].filter(Boolean);
  if (!matches.length) {
    return {
      title: `Nincs ellenőrzötten ${labels.join(", ")} strand`,
      body: "Csak azokból a strandokból szűrök, amelyeknél mindkét kért tulajdonság ellenőrzött Place-adatként szerepel.",
      sources: ["Place"],
    };
  }
  return {
    title: `${labels.join(", ")} strandok`,
    body: matches.map((place) => place.name).join("\n"),
    sources: ["Place"],
  };
}

function serviceFilterAnswer(question: string, context: QuestionContext): QuestionAnswer | null {
  const need = requestedServiceNeed(normalized(question));
  if (!need) return null;
  const asksBeach = /strand|beach|spiaggia/.test(normalized(question));
  const matches = context.knownPlaces.flatMap((place) =>
    asksBeach && place.details.kind !== "beach" ? [] :
    getPlaceQuestionFacts(place)
      .filter((fact) => fact.key === "service" && need.test(normalized(fact.value)))
      .map((fact) => ({ place, fact })),
  );
  if (!matches.length) {
    return {
      title: "Nincs ellenőrzött szolgáltatásadat",
      body: "A kért szolgáltatásról jelenleg nincs ellenőrzött Place-adat. Nem következtetek a hely típusából.",
      sources: ["Place"],
    };
  }
  return {
    title: "Ellenőrzött szolgáltatással rendelkező helyek",
    body: matches.map(({ place, fact }) => `${place.name} · ${fact.value}`).join("\n"),
    sources: ["Place"],
  };
}

function structuredPlaceAnswer(question: string, context: QuestionContext): QuestionAnswer | null {
  const topic = requestedPlaceFactTopic(normalized(question));
  if (!topic) return null;

  const explicitlyNamed = placeCandidatesInQuestion(question, context);
  const linked = context.linkedPlaces.map((entry) => entry.place);
  const normalizedQuestion = normalized(question);
  const beachFilters = requestedBeachFilters(normalizedQuestion);
  const beachFilterResult = beachFilterAnswer(beachFilters, context);
  if (beachFilterResult && !explicitlyNamed.length) return beachFilterResult;
  const serviceResult = topic === "service" && !explicitlyNamed.length ? serviceFilterAnswer(question, context) : null;
  if (serviceResult) return serviceResult;
  const lengthThreshold = topic === "length" ? requestedLengthThreshold(normalizedQuestion) : undefined;
  const asksNamedLengthComparison = topic === "length" && explicitlyNamed.length >= 2 && /hosszabb|hossz.*mint/.test(normalizedQuestion);
  const asksBeachComparison = topic === "length" && (/mely|leghosszabb|ossz.*strand/.test(normalizedQuestion) || lengthThreshold !== undefined || asksNamedLengthComparison);
  const candidates = asksBeachComparison
    ? asksNamedLengthComparison ? explicitlyNamed : context.knownPlaces.filter((place) => place.details.kind === "beach")
    : explicitlyNamed.length ? explicitlyNamed : questionPlaceTokens(question).length ? [] : linked;
  const places = uniquePlaces(candidates);

  if (places.length > 1 && !asksBeachComparison) {
    return {
      title: "Több hely is megfelel",
      body: `A kérdés több helyre is utalhat: ${places.slice(0, 3).map((place) => place.name).join(", ")}. Írd be a teljes helynevet, és nem választok találgatással közülük.`,
      sources: ["Place"],
    };
  }

  if (asksBeachComparison) {
    const measured = places.flatMap((place) =>
      place.details.kind === "beach" && typeof place.details.lengthM === "number"
        ? [{ place, lengthM: place.details.lengthM }]
        : [],
    );
    if (!measured.length) return { title: "Nincs összehasonlítható strandhossz", body: "A kanonikus Place-adatokban nincs pontos, ellenőrzött strandhossz ehhez az összehasonlításhoz.", sources: ["Place"] };
    if (asksNamedLengthComparison) {
      const missing = places.filter((place) => !measured.some((candidate) => candidate.place.slug === place.slug));
      if (missing.length) {
        return {
          title: "Hiányzó ellenőrzött strandhossz",
          body: `${measured.map((candidate) => `${candidate.place.name} · ${Math.round(candidate.lengthM)} m`).join("\n")}\n${missing.map((place) => `${place.name} · nincs ellenőrzött hosszadat`).join("\n")}`,
          sources: ["Place"],
        };
      }
      const [first, second] = measured;
      const longer = first.lengthM >= second.lengthM ? first : second;
      const shorter = longer === first ? second : first;
      return {
        title: `${longer.place.name} a hosszabb`,
        body: `${longer.place.name} · ${Math.round(longer.lengthM)} m\n${shorter.place.name} · ${Math.round(shorter.lengthM)} m`,
        sources: ["Place"],
      };
    }
    if (lengthThreshold !== undefined) {
      const matches = measured.filter((candidate) => candidate.lengthM > lengthThreshold);
      const thresholdLabel = lengthThreshold >= 1_000 ? `${lengthThreshold / 1_000} km` : `${lengthThreshold} m`;
      if (!matches.length) return { title: `Nincs ${thresholdLabel}-nél hosszabb rögzített strand`, body: "Csak a pontos, numerikus hosszal ellenőrzött strandokat hasonlítom össze.", sources: ["Place"] };
      return { title: `${thresholdLabel}-nél hosszabb strandok`, body: matches.map((candidate) => `${candidate.place.name} · ${Math.round(candidate.lengthM)} m`).join("\n"), sources: ["Place"] };
    }
    const longest = measured.reduce((current, candidate) => candidate.lengthM > current.lengthM ? candidate : current);
    return { title: `${longest.place.name} · leghosszabb rögzített strand`, body: `Ellenőrzött hossz: ${Math.round(longest.lengthM)} m. Csak a pontos, numerikus hosszal rögzített strandokat hasonlítom össze.`, sources: ["Place"] };
  }

  const place = places[0];
  if (!place) return null;
  const facts = getPlaceQuestionFacts(place).filter((fact) => fact.key === topic);
  if (!facts.length) {
    return {
      title: `${place.name} · nincs ellenőrzött adat`,
      body: `Ehhez a helyhez nincs ellenőrzött ${topic === "length" ? "strandhossz" : "részletes"} információ rögzítve. Nem következtetek a hely típusából vagy más Place-ekből.`,
      sources: ["Place"],
    };
  }
  return {
    title: `${place.name} · ${facts[0].label.toLocaleLowerCase("hu-HU")}`,
    body: facts.map((fact) => fact.value).join(" · "),
    sources: ["Place"],
  };
}

function placeAnswer(question: string, context: QuestionContext): QuestionAnswer | null {
  const value = normalized(question);
  if (!/parkolas|parkolo/.test(value)) return null;

  const named = placeCandidatesInQuestion(question, context);
  const linkedPlaces = context.linkedPlaces.map((entry) => entry.place);
  // A question that contains a place-like term must resolve it explicitly.
  // Only a generic "milyen a parkolás?" can use the single Place already
  // linked to the selected day.
  const candidates = named.length ? named : questionPlaceTokens(question).length ? [] : linkedPlaces;
  const unique = [...new Map(candidates.map((place) => [place.slug, place])).values()];
  if (unique.length > 1) {
    return {
      title: "Több hely is megfelel",
      body: `A kérdés több helyre is utalhat: ${unique.slice(0, 3).map((place) => place.name).join(", ")}. Írd be a teljes helynevet, és nem választok találgatással közülük.`,
      sources: ["Place"],
    };
  }
  const place = unique[0];
  if (!place) {
    return { title: "Nincs azonosítható hely", body: "A parkolásról csak egy konkrét, kanonikus Place rekordhoz tudok ellenőrzött adatot adni. Írd be a hely nevét.", sources: ["Place"] };
  }
  const note = placeParkingNote(place);
  if (!note) {
    return { title: `${place.name} · parkolás`, body: "Ehhez a helyhez nincs ellenőrzött parkolási információ rögzítve. Nem következtetek a helyszínből.", sources: ["Place"] };
  }
  return { title: `${place.name} · parkolás`, body: note, sources: ["Place"] };
}

function foodAnswer(question: string, context: QuestionContext): QuestionAnswer | null {
  const value = normalized(question);
  if (!/\b(enni|egyunk|etterem|vacsora|ebed)\b/.test(value)) return null;

  const meal = context.day.activities.find((activity) =>
    /ebed|vacsora|etterem|etkezes/i.test(normalized(`${activity.title} ${activity.place}`)) && Boolean(activity.placeSlug),
  );
  if (meal) {
    return {
      title: `${meal.time} · ${meal.title}`,
      body: `A kiválasztott nap Timeline-jában ez az étkezési programpont itt szerepel: ${meal.place}.`,
      sources: ["Timeline"],
    };
  }

  return {
    title: "Étterem még nincs kiválasztva",
    body: "A kiválasztott naphoz nincs ellenőrzött étterem vagy étkezési hely rögzítve. Nem ajánlok találomra helyet; a Helyekben vagy a Timeline-ban tudsz választani.",
    sources: ["Timeline", "Place"],
  };
}

/**
 * Deterministic first-pass decision layer. It only consumes already provided
 * canonical context. An LLM may later summarize this output, but must never
 * supply travel facts that are absent here.
 */
export function answerQuestion(
  question: string,
  day: HomeDay,
  weather: WeatherSnapshot | null,
  events: readonly TripEvent[],
  shoppingAnswer: ShoppingAnswer,
): QuestionAnswer {
  return answerQuestionWithContext(question, buildQuestionContext(day, weather, events), shoppingAnswer);
}

/** Shared resolver entry point. Every deterministic branch reads the same
 * selected-day context, so prompt generation and answering cannot drift apart. */
export function answerQuestionWithContext(
  question: string,
  context: QuestionContext,
  shoppingAnswer: ShoppingAnswer,
  tripDays: readonly HomeDay[] = [],
): QuestionAnswer {
  return resolveQuestionWithContext(question, context, shoppingAnswer, tripDays).answer;
}

function requirement(factType: string, description: string, scope: AnswerRequirement["scope"]): AnswerRequirement {
  return { factType, description, scope };
}

function resolved(answer: QuestionAnswer, assessment: QuestionAssessment): QuestionResolution {
  return { answer, assessment };
}

/**
 * Collect the inexpensive Timeline and global Place candidates before picking
 * a displayed answer. The resolver deliberately carries an assessment beside
 * the prose: UI and research policy must never infer completeness from a
 * translated title string.
 */
export function resolveQuestionWithContext(
  question: string,
  context: QuestionContext,
  shoppingAnswer: ShoppingAnswer,
  tripDays: readonly HomeDay[] = [],
): QuestionResolution {
  const { day, weather, events } = context;
  const value = normalized(question);
  const afternoon = day.activities.filter((activity) => /^1[2-9]:|^2[0-3]:/.test(activity.time));
  const eventResult = eventAnswer(question, events);
  const timelineAnswer = getTimelineQuestionAnswer(question, day);
  const placeResult = placeAnswer(question, context);
  const structuredPlaceResult = structuredPlaceAnswer(question, context);
  const foodResult = foodAnswer(question, context);

  if (eventResult) return resolved(eventResult, completeAssessment(requirement("event", "ellenőrzött eseményadat", "selected_day")));
  if (shoppingAnswer) return resolved(shoppingAnswer, completeAssessment(requirement("shopping", "ellenőrzött bevásárlási ajánlás", "selected_day")));
  if (isAccommodationQuestion(question)) {
    return resolved({
      title: TRIP_BASE_NAME,
      body: "Ez az utazás szállása Villasimiusban. A pontos cím és a navigáció a belépett családi nézetben jelenik meg.",
      sources: ["Trip", "Timeline"],
    }, completeAssessment(requirement("accommodation", "privát szálláshely", "trip")));
  }

  // Named Place facts are global canonical knowledge. They are collected in
  // parallel with the day's Timeline evidence and win only when they answer
  // the question's direct property (parking, services, beach facts, etc.).
  if (placeResult) return resolved(placeResult, placeResult.title.includes("nincs")
    ? incompleteAssessment("partial", [requirement("parking", "ellenőrzött parkolási adat", "global")])
    : completeAssessment(requirement("parking", "ellenőrzött parkolási adat", "global")));
  if (structuredPlaceResult) return resolved(structuredPlaceResult, /nincs|hiányzó/i.test(structuredPlaceResult.title)
    ? incompleteAssessment("partial", [requirement("place_fact", "ellenőrzött Place-tulajdonság", "global")])
    : completeAssessment(requirement("place_fact", "ellenőrzött Place-tulajdonság", "global")));

  if (timelineAnswer) return resolved(timelineAnswer, completeAssessment(requirement("timeline", "kiválasztott napi programpont", "selected_day")));
  // A concrete program/travel lookup can cross the trip only after the
  // selected day's deterministic resolver had no explicit answer. Relative
  // daily questions are rejected by this helper and remain local by design.
  const tripTimelineAnswer = getTripTimelineQuestionAnswer(question, day, tripDays);
  if (tripTimelineAnswer) return resolved(tripTimelineAnswer, completeAssessment(requirement("timeline", "utazás programpontja", "trip")));
  if (/mikor.*(indul|induljunk)|mikor.*kell.*indul|mennyi.*ido.*(oda|eljut)/.test(value)) {
    return resolved({
      title: "Az indulás ideje még nincs kiszámítható",
      body: "A kiválasztott naphoz nincs ellenőrzött Mobility-route, ezért nem mondok indulási időt vagy menetidőt. A program helyét a Timeline-ból Mapsben megnyithatod.",
      sources: ["Timeline", "Mobility"],
    }, incompleteAssessment("partial", [requirement("travel_time", "ellenőrzött útvonal és menetidő", "selected_day")]));
  }
  if (foodResult) return resolved(foodResult, /még nincs/i.test(foodResult.title)
    ? incompleteAssessment("partial", [requirement("food", "ellenőrzött étkezési hely", "global")])
    : completeAssessment(requirement("food", "kiválasztott étkezési programpont", "selected_day")));

  // A generic mention of a beach must not suppress a global Place fact query.
  // Keep this narrow planning fallback only for an actual beach-plan question.
  if (/van.*ertelme.*strandol|strandol.*van.*ertelme|melyik.*strand.*valassz/.test(value)) {
    const plannedBeach = day.activities.find((activity) => /strand/i.test(`${activity.title} ${activity.place}`));
    if (plannedBeach) {
      const weatherNote = weather?.precipitationState === "rain"
        ? "Eső várható, ezért indulás előtt érdemes újra ellenőrizni a körülményeket."
        : weather ? `${weather.temp}° és ${weather.wind} km/h szél várható.` : "Az időjárási adat most nem elérhető.";
      return resolved({ title: plannedBeach.place || plannedBeach.title, body: `A mai tervben ez szerepel ${plannedBeach.time}-kor. ${weatherNote}`, sources: ["Timeline", "Weather"] }, completeAssessment(requirement("beach_plan", "kiválasztott napi strandprogram", "selected_day")));
    }
    return resolved({ title: "Még nincs kiválasztott strand", body: "A mai napi tervben nincs strandszakasz. A helyekhez még nem áll rendelkezésre összehasonlítható, ellenőrzött menetidő- és körülményadat, ezért nem ajánlok találomra helyet.", sources: ["Timeline", "Place"] }, incompleteAssessment("partial", [requirement("beach_plan", "napi strandszakasz vagy ellenőrzött körülményadat", "selected_day")]));
  }

  if (value.includes("délután") || value.includes("bele")) {
    if (afternoon.length === 0) return resolved({ title: "Szabad délután", body: "A kiválasztott naphoz még nincs délutáni program rögzítve.", sources: ["Timeline"] }, completeAssessment(requirement("timeline", "délutáni Timeline", "selected_day")));
    const next = afternoon[0];
    return resolved({ title: `${next.time} · ${next.title}`, body: `Ez a következő délutáni programpont${next.place ? `: ${next.place}` : ""}. A többi lehetőséget a Timeline-ban, időrendben látod.`, sources: ["Timeline"] }, completeAssessment(requirement("timeline", "délutáni Timeline", "selected_day")));
  }

  if (value.includes("gyerek")) return resolved({ title: "Még nem elég biztos az ajánláshoz", body: "A jelenlegi Place-adatok nem tartalmaznak minden helyhez ellenőrzött gyerekes alkalmassági információt. Ezt a rendszer nem találgatja meg; a kutatás csak konkrét, ellenőrizhető hiányt próbál feloldani.", sources: ["Place"] }, incompleteAssessment("partial", [requirement("family_suitability", "ellenőrzött családi alkalmasság", "global")]));
  return resolved({ title: "Erre még nincs biztos válasz", body: "A helyi Timeline- és Place-adatokból ehhez még nincs elég ellenőrzött válasz. A Kérdezési csak ellenőrzött kérdésekre ad tényt; ha a hiány külső forrásból ellenőrizhető, célzottan utánanéz.", sources: ["Timeline", "Place", "Weather"] }, incompleteAssessment("insufficient", [requirement("travel_fact", "a kérdéshez szükséges ellenőrzött utazási tény", "global")]));
}
