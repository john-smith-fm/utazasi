import type { HomeActivity, HomeDay } from "@/data/home-days";

export type TimelineQuestionAnswer = {
  title: string;
  body: string;
  sources: ["Timeline"];
};

function normalized(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("hu-HU");
}

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
  const text = day.activities.map((activity) => `${activity.title} ${activity.place}`).join(" ");
  const prompts = ["Mi a következő program?"];
  if (/strand|beach|tenger/i.test(text)) prompts.push("Van még értelme strandolni?");
  prompts.push("Mi fér még bele ma?");
  return [...new Set(prompts)].slice(0, 3);
}

export function getTimelineQuestionAnswer(question: string, day: HomeDay): TimelineQuestionAnswer | null {
  const value = normalized(question);
  const next = nextTimelineActivity(day);
  const timed = orderedTimedActivities(day);

  if (/kovetkez|ut[aá]na/.test(value)) {
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
