/**
 * Read-only editorial review helper. It reads the current runtime Timeline and
 * prints only proposed date/title/subtitle rows; it never logs activity text,
 * private locations, IDs, or writes to Supabase.
 */
import { readdir, readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const TRIP_SLUG = "sardinia-family-2026";
const TRIP_BASE_SLUG = "trip-base";
const apiKey = process.env.OPENAI_API_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!apiKey || !supabaseUrl || !supabaseKey) throw new Error("Missing read-only editorial review configuration.");

const root = new URL("../..", import.meta.url);
const placesDirectory = new URL("knowledge/places/", root);
const aliases = JSON.parse(await readFile(new URL("slug-aliases.json", placesDirectory), "utf8")).aliases ?? {};
const places = new Map();
for (const file of (await readdir(placesDirectory)).filter((name) => name.endsWith(".json") && name !== "slug-aliases.json")) {
  for (const place of JSON.parse(await readFile(new URL(file, placesDirectory), "utf8")).places ?? []) places.set(place.slug, place);
}

const supabase = createClient(supabaseUrl, supabaseKey, { auth: { autoRefreshToken: false, persistSession: false } });
const { data: trip, error: tripError } = await supabase.from("trips").select("id, start_date, end_date").eq("slug", TRIP_SLUG).maybeSingle();
if (tripError || !trip) throw new Error("Runtime trip is unavailable.");
const { data: days, error: daysError } = await supabase.from("days").select("id, date").eq("trip_id", trip.id).order("date");
if (daysError) throw daysError;
const dayRows = days ?? [];
const { data: activities, error: activitiesError } = await supabase.from("timeline_activities")
  .select("day_id, start_time, title, place_slug, source_event_id, kind, is_system_generated, created_at")
  .in("day_id", dayRows.map((day) => day.id)).order("start_time").order("created_at");
if (activitiesError) throw activitiesError;

const byDay = new Map(dayRows.map((day) => [day.id, []]));
for (const item of activities ?? []) byDay.get(item.day_id)?.push(item);
const normalize = (value) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const theme = (activity) => {
  const text = normalize(activity.title);
  if (activity.source_event_id) return "event";
  if (/repul|airport|repter|erkezes|indulas|check.?out|autofelvetel|autoleadas/.test(text)) return "travel";
  if (/strand|spiaggia|beach|tengerpart/.test(text)) return "beach";
  if (/gyerek|jatszo|konyvtar|fagyi/.test(text)) return "family";
  if (/kirand|nuragh|hajo|marina|latnivalo|muzeum/.test(text)) return "explore";
  if (/bevasarl|market|conad|crai|bolt|patika|farmacia/.test(text)) return "shopping";
  if (/reggeli|ebed|vacsora|etterem|kave/.test(text)) return "food";
  if (/alszik|pihen|szabad|csomagol/.test(text)) return "rest";
  return "general";
};
const priority = ["travel", "event", "beach", "explore", "family", "shopping", "food", "rest", "general"];
const copyPrompt = `A dayFacts mező a napi Timeline ellenőrzött, rövid összefoglalója. Ezen tények alapján írj egy címet és egy alcímet magyarul egy családi nyaraláshoz.

Úgy írj, mintha egy család programjához írnál kedves, könnyed szöveget. Ne magazin-editorialt, ne útikönyvet és ne elemzést írj.

CÍM
- 2–6 szó, egy sor, írásjel nélkül a végén.
- A cím ne egyszerűen nevezze meg a helyet vagy a programot: olyan legyen, amit egy családtag is odaírhatna a nyaralási terv fölé.
- Egyszerű, természetes és ötletes; lehet játékos vagy lelkes.
- Nem kell összefoglalnia a teljes napot.
- Ne használd önmagában vagy sablonosan az „Irány + hely”, „hely vár”, „hely nap” fordulatot.
- „Vissza”, „újra” vagy „még egyszer” csak akkor szerepelhet a címben, ha a dayFacts mezőben kifejezetten ott van a „Visszatérés:” tény.

ALCÍM
- Egy rövid, természetes magyar mondat.
- Egyszerűen mondd el, mi vár ránk.
- Következetesen többes szám első személyben írj: megyünk, strandolunk, visszatérünk, ebédelünk, indulunk. Ne válts „rátok” vagy „ti” formára.
- Ne sorold fel az összes programot.
- Ne használj olyan elvont fordulatokat, mint „a nap ritmusa”, „köré szerveződik” vagy „a család igényeihez igazodva”.

A kívánt hang példái (ezeket ne másold):
- „Strandra fel!” / „Strandolással kezdődik a nyaralás első egész napja.”
- „Vár a tenger” / „Az első teljes napunk rögtön Porto Sa Ruxinál kezdődik.”
- „Játszótérre fel!” / „Ma a játszótéré a főszerep, aztán jöhet egy közös ebéd.”
- „Vissza Cala Pirára” / „Úgy látszik, nem volt elég egyszer — ma megint itt strandolunk.”
- „Még egy utolsó csobbanás” / „Poettónál még belefér a tenger, mielőtt elindulunk a repülőtérre.”

Elsősorban a dayFacts mezőt használd: ez mondja el, mi történik aznap. Csak a supplied briefben szereplő konkrét tényt állíthatod. Ne találj ki nyitvatartást, útvonalat, időtartamot, árat, időjárást, strandjellemzőt, programot vagy élményt. Konkrét helyet vagy eseményt csak a dayFacts, mainActivity, verifiedEvent vagy placeFacts adatból említs. Ha kevés a tény, legyen a szöveg rövidebb és egyszerűbb, ne egészítsd ki képzelettel.
Egy ellenőrzés: a briefben nem szereplő konkrét főnevet vagy jelzőt ne tegyél a szövegbe. A játékosság a hangból jöjjön, ne kitalált részletekből.

Ne használj emojit, bulletet vagy címsort. A recentEditorialCopy csak arra való, hogy lehetőleg ne ismételd ugyanazt a megfogalmazást.

Technikai válasz: kizárólag a megadott JSON-sémát add vissza. A grounding tömbbe az allowedGrounding listából másold be a felhasznált tények pontos szövegét; ez belső ellenőrzés, nem jelenik meg a felületen.`;

function phaseFor(date) {
  if (date === trip.start_date) return "arrival";
  if (date === trip.end_date) return "departure";
  const index = dayRows.findIndex((day) => day.date === date);
  if (index === dayRows.length - 2) return "last_full_day";
  if (index <= 2) return "early";
  if (index >= dayRows.length - 3) return "late";
  return "middle";
}

function signalsFor(day, index, timeline, themes) {
  const signals = [];
  if (!timeline.length) signals.push("empty_day");
  if (day.date === trip.start_date) signals.push("arrival_day");
  if (day.date === trip.end_date) signals.push("departure_day");
  if (index === dayRows.length - 2) signals.push("last_full_day");
  if (timeline.length >= 4) signals.push("busy_day");
  if (themes.includes("beach")) signals.push("beach_day");
  if (themes.includes("explore")) signals.push("excursion_day");
  if (themes.includes("shopping")) signals.push("shopping_day");
  if (themes.includes("rest")) signals.push("relaxed_day");
  if (themes.includes("event")) signals.push("special_event");
  return signals;
}

const seenPlaces = new Map();
const tripEditorialSummary = dayRows.map((day, index) => {
  const timeline = byDay.get(day.id) ?? [];
  const themes = timeline.map(theme);
  const dominant = priority.map((value) => timeline.find((item) => theme(item) === value)).find(Boolean) ?? null;
  const slug = dominant?.place_slug ? (aliases[dominant.place_slug] ?? dominant.place_slug) : null;
  const place = slug && slug !== TRIP_BASE_SLUG ? places.get(slug) : null;
  const prior = place ? seenPlaces.get(place.slug) : null;
  const placeOccurrence = !place ? null : !prior ? "first" : prior === index - 1 ? "consecutive_return" : "return";
  if (place) seenPlaces.set(place.slug, index);
  return { dayNumber: index + 1, phase: phaseFor(day.date), signals: signalsFor(day, index, timeline, themes), mainActivityType: dominant ? theme(dominant) : null, mainPlaceName: place?.name ?? null, placeOccurrence };
});

const priorCopies = [];
const startAt = Number.parseInt(process.env.EDITORIAL_PREVIEW_START_AT ?? "0", 10) || 0;
const limit = Number.parseInt(process.env.EDITORIAL_PREVIEW_LIMIT ?? String(dayRows.length), 10) || dayRows.length;
const endAt = Math.min(dayRows.length, startAt + limit);
for (let index = startAt; index < endAt; index += 1) {
  const day = dayRows[index];
  const timeline = byDay.get(day.id) ?? [];
  const themes = timeline.map(theme);
  const dominant = priority.map((value) => timeline.find((item) => theme(item) === value)).find(Boolean) ?? null;
  const canonicalSlug = dominant?.place_slug ? (aliases[dominant.place_slug] ?? dominant.place_slug) : null;
  const canonicalPlace = canonicalSlug && canonicalSlug !== TRIP_BASE_SLUG ? places.get(canonicalSlug) : null;
  const signals = signalsFor(day, index, timeline, themes);
  if (themes.includes("event")) signals.push("special_event");
  const event = timeline.find((item) => item.source_event_id) ?? null;
  if (event && /^([12]\d):/.test(event.start_time)) signals.push("evening_event");
  const factLabel = { travel: "Utazás", beach: "Strandolás", family: "Gyerekprogram", explore: "Kirándulás", shopping: "Bevásárlás", food: "Étkezés", rest: "Pihenés", event: "Hivatalos esemény", general: "Közös program" };
  const dayFacts = [...new Set(timeline.slice(0, 5).map((item) => {
    const itemSlug = item.place_slug ? (aliases[item.place_slug] ?? item.place_slug) : null;
    const itemPlace = itemSlug && itemSlug !== TRIP_BASE_SLUG ? places.get(itemSlug) : null;
    const label = factLabel[theme(item)];
    if (item.source_event_id) return `Hivatalos esemény: ${item.title.trim()}`;
    return itemPlace ? `${label}: ${itemPlace.name}` : label;
  }))];
  const previouslyVisited = canonicalPlace && dayRows.slice(0, index).some((priorDay) =>
    (byDay.get(priorDay.id) ?? []).some((item) => (aliases[item.place_slug] ?? item.place_slug) === canonicalPlace.slug),
  );
  if (previouslyVisited) dayFacts.push(`Visszatérés: ${canonicalPlace.name}`);
  const brief = {
    date: day.date,
    day: { number: index + 1, total: dayRows.length, phase: phaseFor(day.date) },
    dayFacts,
    signals,
    mainActivity: dominant ? { type: theme(dominant), placeName: canonicalPlace?.name ?? null } : null,
    secondaryShape: signals.includes("evening_event") ? "event_evening" : signals.includes("relaxed_day") ? "relaxed" : signals.includes("busy_day") ? "busy" : signals.includes("empty_day") ? "open" : "simple",
    verifiedEvent: event ? { title: event.title, time: event.start_time || null } : null,
    placeFacts: [],
    recentEditorialCopy: priorCopies.slice(-4),
    tripEditorialSummary,
  };
  const allowedGrounding = [...brief.dayFacts, ...signals.map((signal) => `signal:${signal}`), ...(brief.mainActivity?.placeName ? [brief.mainActivity.placeName] : []), ...(brief.verifiedEvent ? [brief.verifiedEvent.title, ...(brief.verifiedEvent.time ? [brief.verifiedEvent.time] : [])] : []), ...brief.placeFacts.map((place) => place.name)];
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: process.env.OPENAI_EDITORIAL_MODEL ?? process.env.OPENAI_QUESTION_MODEL ?? process.env.OPENAI_RESEARCH_MODEL ?? "gpt-5.6-terra", store: false, max_output_tokens: 240, reasoning: { effort: "low" }, text: { format: { type: "json_schema", name: "editorial_preview", strict: true, schema: { type: "object", additionalProperties: false, required: ["title", "subtitle", "grounding"], properties: { title: { type: "string" }, subtitle: { type: "string" }, grounding: { type: "array", items: { type: "string" } } } } } }, input: [{ role: "system", content: copyPrompt }, { role: "user", content: JSON.stringify({ brief: { dayFacts: brief.dayFacts, recentTitles: brief.recentEditorialCopy.map((copy) => copy.title) }, allowedGrounding }) }] }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(`Editorial preview unavailable (${response.status}).`);
  const text = body.output_text ?? body.output?.flatMap((item) => item.content ?? []).find((part) => part.type === "output_text")?.text;
  const copy = JSON.parse(text);
  if (!allowedGrounding.includes(copy.grounding?.[0]) || !copy.title || !copy.subtitle) throw new Error("Editorial preview validation failed.");
  priorCopies.push({ title: copy.title, subtitle: copy.subtitle });
  process.stdout.write(`${day.date}\t${copy.title}\t${copy.subtitle}\n`);
}
