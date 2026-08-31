import type { HomeActivity, HomeDay } from "@/data/home-days";

export type DayDisplayContext = {
  title: string;
  summary: string;
  isFallback: boolean;
};

export type DayEditorialTrip = {
  startDate: string;
  endDate: string;
};

export type TripPhase = "arrival" | "early" | "middle" | "late" | "last_full_day" | "departure";
export type DaySignal = "empty_day" | "arrival_day" | "departure_day" | "beach_day" | "excursion_day" | "relaxed_day" | "busy_day" | "special_event" | "evening_event" | "new_place" | "returning_place" | "shopping_day" | "mostly_local" | "trip_midpoint" | "last_full_day";
export type DayTheme = "travel" | "beach" | "family" | "explore" | "shopping" | "food" | "rest" | "event" | "general";

export type DayEditorialContext = {
  date: string;
  tripDayNumber: number;
  tripDayCount: number;
  tripPhase: TripPhase;
  timeline: readonly HomeActivity[];
  dominantActivity?: HomeActivity;
  dominantActivityType?: DayTheme;
  linkedPlaceSlugs: readonly string[];
  signals: readonly DaySignal[];
  /** Reserved for a future evidence-backed recommendation. Never invented here. */
  recommendation?: never;
};

function normalized(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function activityText(activity: HomeActivity): string {
  return normalized(`${activity.title} ${activity.place} ${activity.description ?? ""}`);
}

function themeFor(activity: HomeActivity): DayTheme {
  const text = activityText(activity);
  if (activity.localEvent || activity.sourceEventId) return "event";
  if (/repul|airport|repter|erkezes|indulas|check.?out|autofelvetel|autoleadas/.test(text)) return "travel";
  if (/strand|spiaggia|beach|tengerpart/.test(text)) return "beach";
  if (/gyerek|jatszo|konyvtar|fagyi/.test(text)) return "family";
  if (/kirand|nuragh|hajo|marina|latnivalo|muzeum/.test(text)) return "explore";
  if (/bevasarl|market|conad|crai|bolt|patika|farmacia/.test(text)) return "shopping";
  if (/reggeli|ebed|vacsora|etterem|kave/.test(text)) return "food";
  if (/alszik|pihen|szabad|csomagol/.test(text)) return "rest";
  return "general";
}

function calendarDistance(startDate: string, endDate: string): number {
  return Math.round((Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86_400_000);
}

function phaseFor(date: string, trip: DayEditorialTrip): TripPhase {
  const dayNumber = calendarDistance(trip.startDate, date) + 1;
  const dayCount = calendarDistance(trip.startDate, trip.endDate) + 1;
  if (date === trip.startDate) return "arrival";
  if (date === trip.endDate) return "departure";
  if (dayNumber === dayCount - 1) return "last_full_day";
  if (dayNumber <= 3) return "early";
  if (dayNumber >= dayCount - 2) return "late";
  return "middle";
}

function mainActivity(activities: readonly HomeActivity[]): HomeActivity | undefined {
  const priority: DayTheme[] = ["travel", "event", "beach", "explore", "family", "shopping", "food", "rest", "general"];
  return priority.map((theme) => activities.find((activity) => themeFor(activity) === theme)).find(Boolean);
}

function effectiveTripDays(day: HomeDay, tripDays: readonly HomeDay[]): readonly HomeDay[] {
  const otherDays = tripDays.filter((item) => item.date !== day.date);
  return [...otherDays, day];
}

/** Builds only facts and deterministic signals; it never writes runtime data. */
export function buildDayEditorialContext(day: HomeDay, trip: DayEditorialTrip, tripDays: readonly HomeDay[] = []): DayEditorialContext {
  const timeline = day.activities.filter((activity) => activity.title.trim());
  const tripDayNumber = calendarDistance(trip.startDate, day.date) + 1;
  const tripDayCount = calendarDistance(trip.startDate, trip.endDate) + 1;
  const tripPhase = phaseFor(day.date, trip);
  const dominantActivity = mainActivity(timeline);
  const signals = new Set<DaySignal>();
  const days = effectiveTripDays(day, tripDays);
  const previousActivities = days.filter((item) => item.date < day.date).flatMap((item) => item.activities);
  const linkedPlaceSlugs = [...new Set(timeline.flatMap((activity) => activity.placeSlug ? [activity.placeSlug] : []))];

  if (!timeline.length) signals.add("empty_day");
  if (tripPhase === "arrival") signals.add("arrival_day");
  if (tripPhase === "departure") signals.add("departure_day");
  if (tripPhase === "last_full_day") signals.add("last_full_day");
  if (tripDayNumber === Math.ceil(tripDayCount / 2)) signals.add("trip_midpoint");
  if (timeline.length >= 4) signals.add("busy_day");
  if (timeline.some((activity) => themeFor(activity) === "beach")) signals.add("beach_day");
  if (timeline.some((activity) => themeFor(activity) === "explore")) signals.add("excursion_day");
  if (timeline.some((activity) => themeFor(activity) === "shopping")) signals.add("shopping_day");
  if (timeline.some((activity) => themeFor(activity) === "rest")) signals.add("relaxed_day");
  const event = timeline.find((activity) => themeFor(activity) === "event");
  if (event) {
    signals.add("special_event");
    if (/este/.test(normalized(event.time)) || /^([12]\d):/.test(event.time)) signals.add("evening_event");
  }
  if (dominantActivity?.placeSlug) {
    const seenEarlier = previousActivities.some((activity) => activity.placeSlug === dominantActivity.placeSlug);
    signals.add(seenEarlier ? "returning_place" : "new_place");
  }
  if (timeline.length && timeline.every((activity) => !activity.placeSlug || activity.placeSlug.includes("villasimius"))) signals.add("mostly_local");

  return {
    date: day.date,
    tripDayNumber,
    tripDayCount,
    tripPhase,
    timeline,
    dominantActivity,
    dominantActivityType: dominantActivity ? themeFor(dominantActivity) : undefined,
    linkedPlaceSlugs,
    signals: [...signals],
  };
}

function has(context: DayEditorialContext, signal: DaySignal) {
  return context.signals.includes(signal);
}

function titleFor(context: DayEditorialContext): string {
  const primary = context.dominantActivity;
  const primaryTheme = primary ? themeFor(primary) : "general";
  if (has(context, "empty_day")) return "A nap még előttetek van";
  if (has(context, "departure_day")) return "Még egy utolsó délelőtt";
  if (has(context, "arrival_day")) return "Első nap a szigeten";
  if (has(context, "special_event") && primaryTheme === "event") return `Este ${primary?.title.trim()}`;
  if (has(context, "last_full_day") && has(context, "beach_day")) return "Még egyszer a víz mellett";
  if (has(context, "trip_midpoint") && has(context, "beach_day")) return "Félidő, mezítláb";
  if (has(context, "returning_place") && has(context, "beach_day")) return "Vissza a vízhez";
  if (has(context, "new_place") && has(context, "beach_day")) return "Ma valami új";
  if (has(context, "beach_day")) return "Vízparti ritmus";
  if (has(context, "excursion_day")) return "Egy kicsit messzebb";
  if (primaryTheme === "family") return "Könnyű nap együtt";
  if (has(context, "shopping_day")) return "Kényelmes indulás";
  if (has(context, "relaxed_day")) return "Ma nem sietünk sehova";
  return "Közös nap együtt";
}

function companionClause(context: DayEditorialContext): string {
  const rest = context.timeline.find((activity) => activity !== context.dominantActivity && themeFor(activity) === "rest");
  const food = context.timeline.find((activity) => activity !== context.dominantActivity && themeFor(activity) === "food");
  const family = context.timeline.find((activity) => activity !== context.dominantActivity && themeFor(activity) === "family");
  if (rest) return "utána pihenősebb ritmus következik";
  if (food) return normalized(food.title).includes("vacsora") ? "este egy nyugodt vacsorával zárul" : "mellette jut idő egy nyugodt étkezésre";
  if (family) return "mellette könnyű gyerekprogram is belefér";
  return "utána szabadabban alakulhat a nap";
}

function subtitleFor(context: DayEditorialContext): string {
  const primary = context.dominantActivity;
  if (has(context, "empty_day")) return "Egyelőre nincs tervetek erre a napra. Jó alkalom lehet egy új közös programhoz.";
  if (has(context, "departure_day")) return "A napi terv az induláshoz igazodik, így marad idő mindenre a hazautazás előtt.";
  if (has(context, "arrival_day")) return "Megérkezés után kényelmesen lehet ráhangolódni a közös napokra.";
  if (has(context, "special_event") && primary && themeFor(primary) === "event") return `Napközben rugalmasan alakulhat a program, este pedig ${primary.title.trim()} adja a nap keretét.`;
  if (has(context, "beach_day") && primary) {
    const isReturn = has(context, "returning_place");
    const history = isReturn ? "Már korábban is szerepelt ezen az utazáson; " : "";
    return `${history}${primary.place || "A strand"} köré épül a nap, ${companionClause(context)}.`;
  }
  if (has(context, "excursion_day") && primary) return `${primary.place || "A kirándulás"} a nap fő célpontja, ${companionClause(context)}.`;
  if (primary && themeFor(primary) === "family") return `${primary.place || "A gyerekprogram"} köré szerveződik a délelőtt, ${companionClause(context)}.`;
  if (has(context, "shopping_day")) return "A szükséges beszerzések után rugalmasan alakulhat a nap többi része.";
  if (has(context, "relaxed_day")) return "Lazább ritmusú nap, amelyben a közös programok mellett pihenésre is marad idő.";
  return "A napi terv a közös programok köré szerveződik, kényelmesen alakítható ritmusban.";
}

/**
 * Stable, deterministic editorial copy from grounded DayEditorialContext.
 * It is deliberately not an AI call and does not mutate Timeline or Notebook.
 */
export function dayDisplayContext(day: HomeDay, trip: DayEditorialTrip, tripDays: readonly HomeDay[] = []): DayDisplayContext {
  const context = buildDayEditorialContext(day, trip, tripDays);
  return { title: titleFor(context), summary: subtitleFor(context), isFallback: has(context, "empty_day") };
}
