import type { HomeActivity, HomeDay } from "@/data/home-days";

export type DayDisplayContext = {
  title: string;
  summary: string;
  isFallback: boolean;
};

type DayTheme = "travel" | "beach" | "family" | "explore" | "shopping" | "food" | "rest" | "general";
type DayPeriod = "morning" | "afternoon" | "evening";

function normalized(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function activityText(activity: HomeActivity): string {
  return normalized(`${activity.title} ${activity.place} ${activity.description ?? ""}`);
}

function themeFor(activity: HomeActivity): DayTheme {
  const text = activityText(activity);
  if (/repul|airport|rept[ée]r|erkezes|indulas|check.?out|autofelvetel|autoleadas/.test(text)) return "travel";
  if (/strand|spiaggia|beach|tengerpart/.test(text)) return "beach";
  if (/gyerek|jatszo|konyvtar|fagyi/.test(text)) return "family";
  if (/kirand|nuragh|hajo|marina|latnivalo|muzeum/.test(text)) return "explore";
  if (/bevasarl|market|conad|crai|bolt|patika|farmacia/.test(text)) return "shopping";
  if (/reggeli|ebed|vacsora|etterem|kave/.test(text)) return "food";
  if (/alszik|pihen|szabad|csomagol/.test(text)) return "rest";
  return "general";
}

function titleFor(activities: HomeActivity[]): string {
  const themes = new Set(activities.map(themeFor));
  const text = activities.map(activityText).join(" ");
  if (themes.has("travel")) return /haza|budapest|autoleadas|repulo indulas|check.?out/.test(text) ? "Hazautazás" : "Érkezés és ráhangolódás";
  if (themes.has("beach") && themes.has("family")) return "Strand és gyerekprogram";
  if (themes.has("beach")) return "Strand és családi pihenés";
  if (themes.has("family")) return "Gyerekprogram és könnyű délután";
  if (themes.has("explore")) return "Kirándulás és felfedezés";
  if (themes.has("shopping")) return "Bevásárlás és rugalmas program";
  if (themes.has("food") && themes.has("rest")) return "Lassú, családi nap";
  if (themes.has("rest")) return "Pihenés és szabad program";
  return "Közös programok";
}

function periodFor(activity: HomeActivity): DayPeriod {
  const match = activity.time.match(/^(\d{2}):(\d{2})$/);
  if (!match) return /este/.test(normalized(`${activity.time} ${activity.title}`)) ? "evening" : "afternoon";
  const hour = Number(match[1]);
  return hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
}

function phraseFor(activity: HomeActivity): string {
  const theme = themeFor(activity);
  const place = activity.place.trim();
  if (theme === "beach") return place ? `strandolás: ${place}` : "strandolás";
  if (theme === "family") {
    if (/konyvtar/.test(activityText(activity))) return place ? `könyvtári program: ${place}` : "könyvtári program";
    return place ? `gyerekprogram: ${place}` : "gyerekprogram";
  }
  if (theme === "food") return normalized(activity.title).includes("ebed") ? "ebéd" : normalized(activity.title).includes("vacsora") ? "vacsora" : activity.title.toLowerCase();
  if (theme === "rest") return normalized(activity.title).includes("alszik") ? "pihenő a szálláson" : activity.title.toLowerCase();
  const title = activity.title.trim();
  return place ? `${title} a ${place} helyszínen` : title.toLowerCase();
}

function naturalList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} és ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} és ${items.at(-1)}`;
}

function summaryFor(activities: HomeActivity[]): string {
  const groups: Record<DayPeriod, HomeActivity[]> = { morning: [], afternoon: [], evening: [] };
  activities.forEach((activity) => groups[periodFor(activity)].push(activity));
  const labels: Record<DayPeriod, string> = { morning: "Délelőtt", afternoon: "Délután", evening: "Este" };
  return (Object.entries(groups) as Array<[DayPeriod, HomeActivity[]]>)
    .filter(([, entries]) => entries.length)
    .map(([period, entries]) => `${labels[period]} ${naturalList(entries.slice(0, 3).map(phraseFor))}.`)
    .join(" ");
}

/**
 * A read-only prose narrative from the real daily Timeline.  It deliberately
 * has no programme counts or time-list output: meaningful programme changes
 * alter the theme or the natural-language daily summary instead.
 */
export function dayDisplayContext(day: HomeDay): DayDisplayContext {
  const activities = day.activities.filter((activity) => activity.title.trim());
  if (!activities.length) return { title: day.title, summary: day.summary, isFallback: true };
  return { title: titleFor(activities), summary: summaryFor(activities), isFallback: false };
}
