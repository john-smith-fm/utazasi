import type { HomeDay } from "../data/home-days";
import type { WeatherSnapshot } from "../types";
import type { TripEvent } from "./event-types";
import { getTimelineQuestionAnswer } from "./timeline-questioning.ts";
import { TRIP_BASE_NAME } from "./trip-base.ts";
import { buildQuestionContext, type QuestionContext } from "./question-context.ts";
import type { Place } from "@/types/places";

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
  const asksEventTime = /\b(fesztival|esemeny|koncert|felvonulas|kiallitas|hajokirandulas|muzeum)\b/.test(value);
  if (!asksAdmission && !asksFireworks && !asksEventTime) return null;
  if (asksFireworks && !events.some((event) => /tűzijáték|tuzijatek/i.test(event.title))) {
    return { title: "Nincs megerősített tűzijáték", body: "A kiválasztott naphoz nincs ellenőrzött tűzijáték-esemény rögzítve. Nem állítok időpontot vagy helyszínt forrás nélkül.", sources: ["Event"] };
  }
  if (asksAdmission) {
    return { title: "A belépőről nincs biztos adat", body: "A jelenlegi ellenőrzött Place- és Event-adatok nem tartalmaznak megbízható belépő- vagy jegyár-információt ehhez a kérdéshez. Nem találgatok.", sources: ["Place", "Event"] };
  }
  const event = events[0];
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

function placeCandidatesInQuestion(question: string, context: QuestionContext) {
  const value = normalized(question);
  const candidates = context.linkedPlaces.map((entry) => entry.place);
  return candidates.filter((place) => {
    const words = normalized(place.name).split(/[^a-z0-9]+/).filter((word) => word.length >= 3 && !["spiaggia", "beach"].includes(word));
    // Require all meaningful canonical-name words that were actually named by
    // the family. A one-word "Porto" query therefore keeps several candidates.
    return words.length > 0 && words.every((word) => value.includes(word));
  });
}

function placeAnswer(question: string, context: QuestionContext): QuestionAnswer | null {
  const value = normalized(question);
  if (!/parkolas|parkolo/.test(value)) return null;

  const named = placeCandidatesInQuestion(question, context);
  const linkedPlaces = context.linkedPlaces.map((entry) => entry.place);
  const candidates = named.length ? named : linkedPlaces;
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
): QuestionAnswer {
  const { day, weather, events } = context;
  const value = normalized(question);
  const afternoon = day.activities.filter((activity) => /^1[2-9]:|^2[0-3]:/.test(activity.time));
  const eventResult = eventAnswer(question, events);
  const timelineAnswer = getTimelineQuestionAnswer(question, day);
  const placeResult = placeAnswer(question, context);
  if (eventResult) return eventResult;
  if (shoppingAnswer) return shoppingAnswer;
  if (isAccommodationQuestion(question)) {
    return {
      title: TRIP_BASE_NAME,
      body: "Ez az utazás szállása Villasimiusban. A pontos cím és a navigáció a belépett családi nézetben jelenik meg.",
      sources: ["Trip", "Timeline"],
    };
  }
  if (timelineAnswer) return timelineAnswer;
  if (placeResult) return placeResult;

  if (value.includes("strand")) {
    const plannedBeach = day.activities.find((activity) => /strand/i.test(`${activity.title} ${activity.place}`));
    if (plannedBeach) {
      const weatherNote = weather?.precipitationState === "rain"
        ? "Eső várható, ezért indulás előtt érdemes újra ellenőrizni a körülményeket."
        : weather ? `${weather.temp}° és ${weather.wind} km/h szél várható.` : "Az időjárási adat most nem elérhető.";
      return { title: plannedBeach.place || plannedBeach.title, body: `A mai tervben ez szerepel ${plannedBeach.time}-kor. ${weatherNote}`, sources: ["Timeline", "Weather"] };
    }
    return { title: "Még nincs kiválasztott strand", body: "A mai napi tervben nincs strandszakasz. A helyekhez még nem áll rendelkezésre összehasonlítható, ellenőrzött menetidő- és körülményadat, ezért nem ajánlok találomra helyet.", sources: ["Timeline", "Place"] };
  }

  if (value.includes("délután") || value.includes("bele")) {
    if (afternoon.length === 0) return { title: "Szabad délután", body: "A kiválasztott naphoz még nincs délutáni program rögzítve.", sources: ["Timeline"] };
    const next = afternoon[0];
    return { title: `${next.time} · ${next.title}`, body: `Ez a következő délutáni programpont${next.place ? `: ${next.place}` : ""}. A többi lehetőséget a Timeline-ban, időrendben látod.`, sources: ["Timeline"] };
  }

  if (value.includes("gyerek")) return { title: "Még nem elég biztos az ajánláshoz", body: "A jelenlegi Place-adatok nem tartalmaznak minden helyhez ellenőrzött gyerekes alkalmassági információt. Ezt a rendszer nem találgatja meg; a következő kutatási kör ezt fogja bővíteni.", sources: ["Place"] };
  return { title: "Erre még nincs biztos válasz", body: "A Kérdezési jelenlegi verziója a napi tervhez, a helyekhez és az időjáráshoz kapcsolódó, ellenőrzött kérdésekre tud válaszolni. Külső információt csak ellenőrzött kutatási forrásból fog használni.", sources: ["Timeline", "Place", "Weather"] };
}
