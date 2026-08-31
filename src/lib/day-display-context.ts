import type { HomeActivity, HomeDay } from "@/data/home-days";

export type DayDisplayContext = {
  title: string;
  summary: string;
  isFallback: boolean;
};

type DayTheme = "travel" | "beach" | "family" | "explore" | "shopping" | "food" | "rest" | "event" | "general";

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

function shortPlaceName(place: string): string {
  return place.replace(/^Spiaggia di\s+/i, "").replace(/^Area Marina Protetta\s+/i, "").trim();
}

function mainActivity(activities: HomeActivity[]): HomeActivity {
  const priority: DayTheme[] = ["travel", "beach", "explore", "family", "shopping", "event", "food", "rest", "general"];
  return priority
    .map((theme) => activities.find((activity) => themeFor(activity) === theme))
    .find((activity): activity is HomeActivity => Boolean(activity)) ?? activities[0]!;
}

function companionClause(activities: HomeActivity[], primary: HomeActivity): string | null {
  const companion = activities.find((activity) => activity !== primary && themeFor(activity) === "rest")
    ?? activities.find((activity) => activity !== primary && themeFor(activity) === "food")
    ?? activities.find((activity) => activity !== primary && themeFor(activity) === "family")
    ?? activities.find((activity) => activity !== primary && themeFor(activity) === "event");
  if (!companion) return null;
  const theme = themeFor(companion);
  if (theme === "rest") return "marad idő pihenésre is";
  if (theme === "food") return normalized(companion.title).includes("vacsora") ? "este egy nyugodt vacsorával" : "egy nyugodt étkezéssel";
  if (theme === "family") return "könnyű gyerekprogrammal";
  return `este ${companion.title.trim()} programjával`;
}

function titleFor(primary: HomeActivity, activities: HomeActivity[]): string {
  const theme = themeFor(primary);
  const text = activities.map(activityText).join(" ");
  const place = shortPlaceName(primary.place);
  if (theme === "travel") return /haza|budapest|autoleadas|repulo indulas|check.?out/.test(text) ? "Hazautazás" : "Első nap a szigeten";
  if (theme === "beach") return place ? `${place} felé` : "Tengerparti nap";
  if (theme === "explore") return place ? `${place} felé` : "Felfedezés a szigeten";
  if (theme === "family") return "Könnyű nap együtt";
  if (theme === "shopping") return "Ráhangolódás Villasimiusban";
  if (theme === "event") return `${primary.title.trim()} estéje`;
  if (theme === "food" || theme === "rest") return "Lassú nap Villasimiusban";
  return "Közös nap Villasimiusban";
}

function summaryFor(primary: HomeActivity, activities: HomeActivity[]): string {
  const theme = themeFor(primary);
  const place = primary.place.trim();
  const companion = companionClause(activities, primary);
  const ending = companion ? `, ${companion}.` : ".";
  if (theme === "travel") {
    const returning = /haza|budapest|autoleadas|repulo indulas|check.?out/.test(activities.map(activityText).join(" "));
    return returning
      ? `A nap az indulás és az utazás köré szerveződik${companion ? `; ${companion}` : ""}.`
      : `Megérkezés után ${companion ?? "kényelmesen lehet ráhangolódni a következő napokra"}.`;
  }
  if (theme === "beach") return `${place || "A kiválasztott strand"} adja a nap fő ritmusát${ending}`;
  if (theme === "explore") return `${place || "A kirándulás"} a nap fő célpontja${ending}`;
  if (theme === "family") return `${place ? `${place} köré szerveződik a délelőtt` : "A nap gyerekprogrammal indul"}${ending}`;
  if (theme === "shopping") return `${place || "A bevásárlás"} az első fontos megálló, utána rugalmasan alakulhat a nap${companion ? `, ${companion}` : ""}.`;
  if (theme === "event") return `Napközben rugalmasan alakulhat a program, este pedig ${primary.title.trim()} adja a nap keretét${place ? ` ${place} helyszínen` : ""}.`;
  if (theme === "food" || theme === "rest") return `Lazább nap, amelyben ${companion ?? "marad idő pihenésre és közös programra"}.`;
  return `A nap a közös programok köré szerveződik${companion ? `, ${companion}` : ""}.`;
}

/**
 * Read-only editorial layer above the factual Timeline: title tells what kind
 * of day it is; subtitle gives its rhythm. Neither writes nor duplicates the
 * detailed programme list shown below it.
 */
export function dayDisplayContext(day: HomeDay): DayDisplayContext {
  const activities = day.activities.filter((activity) => activity.title.trim());
  if (!activities.length) return { title: day.title, summary: day.summary, isFallback: true };
  const primary = mainActivity(activities);
  return { title: titleFor(primary, activities), summary: summaryFor(primary, activities), isFallback: false };
}
