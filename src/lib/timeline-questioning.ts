import type { HomeActivity, HomeDay } from "@/data/home-days";
import { buildQuestionContext, questionPromptsForContext } from "./question-context.ts";

export type TimelineQuestionAnswer = {
  title: string;
  body: string;
  sources: ["Timeline"];
  openDayDate?: string;
};

function normalized(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("hu-HU");
}

// Keep the family wording flexible: both "repülő" and "repülőgép" refer to
// the explicit, scheduled Timeline flight, never to an estimated airport trip.
const FLIGHT_QUESTION_PATTERN = /\b(repul[a-z]*|jarat[a-z]*|flight[a-z]*)\b/;

const STRICT_DAY_PATTERN = /\b(ma|mai|kovetkez|meg|delutan|este)\b/;
const RETURN_FLIGHT_PATTERN = /\b(haza[a-z]*|hazaut[a-z]*|vissza[a-z]*|budapest[a-z]*)\b/;
const OUTBOUND_FLIGHT_PATTERN = /\b(szardinia(?:ra|ban)?|cagliari(?:ba|ban)?)\b/;

function minutes(time: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59 ? hour * 60 + minute : null;
}

function orderedTimedActivities(day: HomeDay) {
  return day.activities
    .map((activity) => ({ activity, minutes: minutes(activity.time) }))
    .filter((item): item is { activity: HomeActivity; minutes: number } => item.minutes !== null)
    .sort((a, b) => a.minutes - b.minutes);
}

function dayLabel(day: HomeDay) {
  const [, month, date] = day.date.split("-");
  return `Szept. ${Number(month) === 9 ? Number(date) : `${month}.${date}`}.`;
}

function flightActivity(day: HomeDay) {
  return orderedTimedActivities(day).find(({ activity }) => /repulo|flight|jarat/i.test(normalized(`${activity.title} ${activity.place}`)))?.activity;
}

function scheduledActivityMatches(question: string, day: HomeDay) {
  const value = normalized(question);
  const isAirportDeparture = /rept/.test(value) && /indul/.test(value);
  if (isAirportDeparture) {
    return orderedTimedActivities(day)
      .map(({ activity }) => activity)
      .filter((activity) => /indul.*rept|rept.*indul/.test(normalized(`${activity.title} ${activity.place}`)));
  }

  const stopWords = new Set(["mikor", "megyunk", "megyek", "megy", "lesz", "van", "a", "az", "es", "hova", "hol", "mi", "program", "utazunk"]);
  const tokens = value.split(/[^a-z0-9]+/).filter((token) => token.length >= 4 && !stopWords.has(token));
  if (!tokens.length) return [];
  return orderedTimedActivities(day)
    .map(({ activity }) => activity)
    .filter((activity) => {
      const words = normalized(`${activity.title} ${activity.place}`).split(/[^a-z0-9]+/).filter(Boolean);
      return tokens.some((token) => words.some((word) =>
        word.includes(token) || token.includes(word) || (word.length >= 5 && token.length >= 5 && word.slice(0, 5) === token.slice(0, 5)),
      ));
    });
}

/**
 * Cross-day resolution is deliberately narrow. Relative daily wording never
 * leaves the selected day; a concrete flight, airport departure, program or
 * Place-like name may find the one scheduled fact elsewhere in the trip.
 */
export function getTripTimelineQuestionAnswer(question: string, selectedDay: HomeDay, tripDays: readonly HomeDay[]): TimelineQuestionAnswer | null {
  const value = normalized(question);
  if (!tripDays.length || STRICT_DAY_PATTERN.test(value)) return null;

  if (FLIGHT_QUESTION_PATTERN.test(value)) {
    const flights = tripDays.flatMap((day) => {
      const activity = flightActivity(day);
      return activity ? [{ day, activity }] : [];
    });
    const filtered = RETURN_FLIGHT_PATTERN.test(value)
      ? flights.filter(({ day, activity }) => /haza|vissza|return/.test(normalized(`${day.title} ${activity.title}`)))
      : OUTBOUND_FLIGHT_PATTERN.test(value)
        ? flights.filter(({ day, activity }) => /cagliari|szardinia|erkezes/i.test(normalized(`${day.title} ${activity.title} ${activity.place}`)))
        : flights;
    const candidates = filtered.length ? filtered : flights;
    if (candidates.length === 1) {
      const { day, activity } = candidates[0];
      return {
        title: `${dayLabel(day)} · ${activity.time} · ${activity.title}`,
        body: `${day.title} napján ez a repülő szerepel a Timeline-ban${activity.place ? `: ${activity.place}.` : "."}`,
        sources: ["Timeline"],
        openDayDate: day.date,
      };
    }
    if (candidates.length > 1) {
      return {
        title: "Több rögzített repülőút",
        body: candidates.map(({ day, activity }) => `${dayLabel(day)} ${activity.time} · ${activity.title}${activity.place ? ` · ${activity.place}` : ""}`).join("\n"),
        sources: ["Timeline"],
      };
    }
    return null;
  }

  const matches = tripDays.flatMap((day) => scheduledActivityMatches(question, day).map((activity) => ({ day, activity })));
  const unique = [...new Map(matches.map(({ day, activity }) => [`${day.date}:${activity.id ?? `${activity.time}:${activity.title}`}`, { day, activity }])).values()];
  if (unique.length === 1) {
    const { day, activity } = unique[0];
    return {
      title: `${dayLabel(day)} · ${activity.time} · ${activity.title}`,
      body: `${day.title} napján ez a programpont szerepel a Timeline-ban${activity.place ? `: ${activity.place}.` : "."}`,
      sources: ["Timeline"],
      openDayDate: day.date,
    };
  }
  if (unique.length > 1) {
    return {
      title: "Több rögzített programpont",
      body: unique.slice(0, 4).map(({ day, activity }) => `${dayLabel(day)} ${activity.time} · ${activity.title}${activity.place ? ` · ${activity.place}` : ""}`).join("\n"),
      sources: ["Timeline"],
    };
  }
  return null;
}

function romeToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function romeMinutesNow() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Rome",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return Number(values.hour) * 60 + Number(values.minute);
}

/**
 * Resolves the next explicit programme without inventing a duration, travel
 * time, or a missing location. For a future selected day, "next" means the
 * first timed item; for a past day there is deliberately no "next" item.
 */
export function nextTimelineActivity(day: HomeDay) {
  const activities = orderedTimedActivities(day);
  if (!activities.length) return null;
  const today = romeToday();
  if (day.date > today) return activities[0].activity;
  if (day.date < today) return null;
  return activities.find((item) => item.minutes >= romeMinutesNow())?.activity ?? null;
}

export function timelineQuestionPrompts(day: HomeDay) {
  return questionPromptsForContext(buildQuestionContext(day, null));
}

export function getTimelineQuestionAnswer(question: string, day: HomeDay): TimelineQuestionAnswer | null {
  const value = normalized(question);
  const next = nextTimelineActivity(day);
  const timed = orderedTimedActivities(day);

  // A flight is a scheduled family-plan fact, not an externally watched Event.
  // Resolve it directly from the selected day's Timeline whenever it is named.
  if (FLIGHT_QUESTION_PATTERN.test(value)) {
    const flight = flightActivity(day);
    if (flight) {
      return {
        title: `${flight.time} · ${flight.title}`,
        body: `A kiválasztott nap Timeline-jában a repülő indulása ekkor szerepel${flight.place ? `: ${flight.place}.` : "."}`,
        sources: ["Timeline"],
      };
    }
  }

  // "Érkezés után" is a planning question, not a request for external travel
  // facts. Keep the answer bounded to the explicitly scheduled items which
  // follow the arrival marker on the selected day.
  if (/erkezes.*utan|utan.*erkezes/.test(value)) {
    const arrivalIndex = timed.findIndex(({ activity }) => normalized(activity.title).includes("erkezes"));
    if (arrivalIndex < 0) {
      return {
        title: "Nincs rögzített érkezés",
        body: "A kiválasztott naphoz nincs érkezési programpont rögzítve, ezért nem következtetek érkezés utáni teendőkre.",
        sources: ["Timeline"],
      };
    }
    const afterArrival = timed.slice(arrivalIndex + 1, arrivalIndex + 4).map(({ activity }) => activity);
    if (!afterArrival.length) {
      return {
        title: "Az érkezés után még nincs program",
        body: "A kiválasztott nap Timeline-jában az érkezés után még nincs további rögzített programpont.",
        sources: ["Timeline"],
      };
    }
    return {
      title: "Érkezés után",
      body: afterArrival.map((activity) => `${activity.time} · ${activity.title}${activity.place ? ` · ${activity.place}` : ""}`).join("\n"),
      sources: ["Timeline"],
    };
  }

  if (/kovetkez|utan/.test(value)) {
    if (!next) return {
      title: "Nincs következő rögzített program",
      body: day.date < romeToday()
        ? "Ez egy korábbi nap; a Timeline már nem jelöl következő programot."
        : "A kiválasztott naphoz nincs későbbi, időponthoz kötött program rögzítve.",
      sources: ["Timeline"],
    };
    return {
      title: `${next.time} · ${next.title}`,
      body: next.place
        ? `A kiválasztott nap következő rögzített programpontja itt lesz: ${next.place}.`
        : "A kiválasztott nap következő rögzített programpontja.",
      sources: ["Timeline"],
    };
  }

  if (/fer.*bele|bele.*fer|marad|meg.*program/.test(value)) {
    if (!next) return {
      title: "Nincs több időponthoz kötött program",
      body: "A kiválasztott nap hátralévő részéhez nincs további rögzített program. Menetidő vagy nyitvatartás nélkül nem állítom, mi fér még bele.",
      sources: ["Timeline"],
    };
    const laterCount = timed.filter((item) => item.minutes > (minutes(next.time) ?? Number.MAX_SAFE_INTEGER)).length;
    return {
      title: `${next.time} után ${laterCount ? "még van rögzített program" : "még nincs más rögzített program"}`,
      body: `A következő pont: ${next.title}${next.place ? ` · ${next.place}` : ""}. Ahhoz, hogy megmondjuk, mi fér bele elé vagy utána, hiteles útvonal- és nyitvatartási adatra is szükség van.`,
      sources: ["Timeline"],
    };
  }

  return null;
}
