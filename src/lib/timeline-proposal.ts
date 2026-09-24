import type { HomeActivity, HomeDay } from "@/data/home-days";
import type { TimelineActivityInput } from "@/lib/timeline-types";

export type ProposalConfidence = "verified" | "likely" | "unverified";
export type TimelineProposalSource = { url: string; title: string };

export type TimelineProposalItem = {
  id: string;
  activity: TimelineActivityInput;
  rationale: string;
  confidence: ProposalConfidence;
  sources: TimelineProposalSource[];
};

export type TimelineProposal = {
  request: string;
  sourceDate: string;
  targetDate: string;
  targetTitle: string;
  targetVersion: number;
  summary: string;
  items: TimelineProposalItem[];
  limitations: string[];
  blockingReason: string | null;
};

const ACTION_PATTERNS = [
  /\b(tervezz|tervezd|alakítsd|modositsd|módosítsd|csereld|cseréld)\b/i,
  /\b(tegyel|tegyél|adj|rakj|vegyel|vegyél)\b.{0,32}\b(be|fel|hozza|hozzá)\b/i,
  /\b(legyen|maradjon)\b/i,
  /\b(vigyük|menjünk|menjunk)\b/i,
];

export function isTimelineActionRequest(value: string) {
  const normalized = value.trim();
  if (!normalized) return false;
  return ACTION_PATTERNS.some((pattern) => pattern.test(normalized));
}

function has(value: string, pattern: RegExp) {
  return pattern.test(value.normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
}

function semanticTitle(activity: HomeActivity) {
  const text = `${activity.title} ${activity.description ?? ""}`;
  if (has(text, /strand|tenger|furdes|uszas|vizpart/iu)) return "Vízparti program";
  if (has(text, /reggeli|breakfast/iu)) return "Reggeli";
  if (has(text, /ebed|lunch/iu)) return "Ebéd";
  if (has(text, /vacsora|dinner/iu)) return "Vacsora";
  if (has(text, /alvas|szieszta|pihenes|piheno/iu)) return "Pihenő";
  if (has(text, /fagyi|gelato|desszert/iu)) return "Fagyi és könnyű séta";
  if (has(text, /seta|varosnezes|kirandulas/iu)) return "Könnyű felfedezés";
  return activity.title;
}

function nextDay(sourceDate: string, tripDays: readonly HomeDay[]) {
  const ordered = [...tripDays].sort((left, right) => left.date.localeCompare(right.date));
  const index = ordered.findIndex((day) => day.date === sourceDate);
  return index >= 0 ? ordered[index + 1] ?? null : ordered.find((day) => day.date > sourceDate) ?? null;
}

function timeToMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function minutesToTime(value: number) {
  const normalized = Math.max(0, Math.min(value, 23 * 60 + 59));
  return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
}

function shoppingTime(items: readonly TimelineProposalItem[]) {
  const occupied = items.map((item) => ({
    start: timeToMinutes(item.activity.startTime),
    end: timeToMinutes(item.activity.startTime) + item.activity.durationMinutes,
  }));
  for (const candidate of [15 * 60 + 30, 16 * 60 + 30, 17 * 60 + 30, 14 * 60 + 30]) {
    if (!occupied.some((slot) => candidate < slot.end && candidate + 60 > slot.start)) return minutesToTime(candidate);
  }
  return "18:00";
}

function proposalItem(activity: TimelineActivityInput, rationale: string): TimelineProposalItem {
  return { id: crypto.randomUUID(), activity, rationale, confidence: "unverified", sources: [] };
}

export function buildTimelineProposal(input: {
  request: string;
  sourceDay: HomeDay;
  tripDays: readonly HomeDay[];
}): TimelineProposal | null {
  const request = input.request.trim();
  if (!isTimelineActionRequest(request)) return null;
  const normalized = request.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const wantsTomorrow = /\bholnap\b/.test(normalized);
  const wantsSimilar = /\b(hasonlo|ilyen|ugyanilyen)\b/.test(normalized);
  const wantsShopping = /\b(bevasarlas|bevasarol(?:ni|junk|niuk)?|vasarlas|bolt|elelmiszer)\b/.test(normalized);
  const targetDay = wantsTomorrow ? nextDay(input.sourceDay.date, input.tripDays) : input.sourceDay;
  if (!targetDay) return null;

  const items: TimelineProposalItem[] = [];
  if (wantsSimilar) {
    for (const source of input.sourceDay.activities) {
      items.push(proposalItem({
        title: semanticTitle(source),
        startTime: source.time,
        durationMinutes: source.durationMinutes ?? 60,
        locationName: "",
        placeSlug: null,
        description: "A mai nap ritmusából átvett programpont. A konkrét helyszín még ellenőrzendő.",
      }, `${source.time} körüli ritmus megtartása a mai nap alapján.`));
    }
  }
  if (wantsShopping && !items.some((item) => /bevásárlás/i.test(item.activity.title))) {
    items.push(proposalItem({
      title: "Bevásárlás",
      startTime: shoppingTime(items),
      durationMinutes: 60,
      locationName: "",
      placeSlug: null,
      description: "A konkrét bolt és a nyitvatartás még ellenőrzendő.",
    }, "A kérés szerinti délutáni bevásárlás."));
  }
  items.sort((left, right) => left.activity.startTime.localeCompare(right.activity.startTime));
  if (!items.length) return null;

  return {
    request,
    sourceDate: input.sourceDay.date,
    targetDate: targetDay.date,
    targetTitle: targetDay.title,
    targetVersion: 0,
    summary: wantsSimilar
      ? `A mai nap ${items.length - (wantsShopping ? 1 : 0)} ritmuseleméből készített holnapi vázlat${wantsShopping ? ", délutáni bevásárlással" : ""}.`
      : `${items.length} új programpont javasolt.`,
    items,
    limitations: ["A konkrét új helyek keresése és forrásellenőrzése még nincs bekötve ebbe a POC-lépésbe."],
    blockingReason: targetDay.activities.length
      ? "A célnapon már vannak programok. A biztonságos csere-diff még készül; ezt a javaslatot ezért nem lehet automatikusan alkalmazni."
      : null,
  };
}
