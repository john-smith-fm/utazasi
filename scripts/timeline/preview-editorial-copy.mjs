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
const copyPrompt = `You are the editorial copywriter for Utazási, a private Hungarian family travel companion. Return exactly JSON with title, subtitle and grounding. Use only the supplied brief. Internally, first find ONE detail that makes the day distinct from the rest of the trip using tripEditorialSummary, then write about that difference; do not output reasoning. Title: Hungarian, 2–6 words, one line, no final punctuation, specific and memorable; it is an editorial hook, not an activity label. Do not use “nap”, “pihenőnap” or “napritmus” merely as labels. Subtitle: one natural grounded sentence that explains why the title fits; never a Timeline list. Beach alone is usually not a difference: prefer first/return/consecutive appearance, contrast, trip arc, event, or another supplied distinction. For repeated places, never present them as new. Vary the 12-day series; do not make every title start with a place or every subtitle share a sentence frame. Place facilities and infrastructure are not an itinerary: never turn a station, parking, accessibility feature, shop, restaurant or venue attribute into a planned transport mode, visit, stop or activity unless it is explicitly the main activity or verified event. Use a consistent second-person plural voice if personal wording is needed. Do not use emoji, bullets, headings, date labels, "ma", "mai terv", "napi program", program counts, generic travel-ad copy, or filler. Never invent opening hours, routes, prices, availability, weather, facts, programme details, sensory details, sand, waves, scenery, crowds, or early/late timing. Mention a concrete place/event only from the brief. grounding must contain one or more exact strings from allowedGrounding.`;

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
  const brief = {
    date: day.date,
    day: { number: index + 1, total: dayRows.length, phase: phaseFor(day.date) },
    signals,
    mainActivity: dominant ? { type: theme(dominant), placeName: canonicalPlace?.name ?? null } : null,
    secondaryShape: signals.includes("evening_event") ? "event_evening" : signals.includes("relaxed_day") ? "relaxed" : signals.includes("busy_day") ? "busy" : signals.includes("empty_day") ? "open" : "simple",
    verifiedEvent: event ? { title: event.title, time: event.start_time || null } : null,
    placeFacts: [],
    recentEditorialCopy: priorCopies.slice(-4),
    tripEditorialSummary,
  };
  const allowedGrounding = [...signals.map((signal) => `signal:${signal}`), ...(brief.mainActivity?.placeName ? [brief.mainActivity.placeName] : []), ...(brief.verifiedEvent ? [brief.verifiedEvent.title, ...(brief.verifiedEvent.time ? [brief.verifiedEvent.time] : [])] : []), ...brief.placeFacts.map((place) => place.name)];
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: process.env.OPENAI_EDITORIAL_MODEL ?? process.env.OPENAI_QUESTION_MODEL ?? process.env.OPENAI_RESEARCH_MODEL ?? "gpt-5-mini", store: false, max_output_tokens: 360, reasoning: { effort: "minimal" }, text: { format: { type: "json_schema", name: "editorial_preview", strict: true, schema: { type: "object", additionalProperties: false, required: ["title", "subtitle", "grounding"], properties: { title: { type: "string" }, subtitle: { type: "string" }, grounding: { type: "array", items: { type: "string" } } } } } }, input: [{ role: "system", content: copyPrompt }, { role: "user", content: JSON.stringify({ brief, allowedGrounding }) }] }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(`Editorial preview unavailable (${response.status}).`);
  const text = body.output_text ?? body.output?.flatMap((item) => item.content ?? []).find((part) => part.type === "output_text")?.text;
  const copy = JSON.parse(text);
  if (!allowedGrounding.includes(copy.grounding?.[0]) || !copy.title || !copy.subtitle) throw new Error("Editorial preview validation failed.");
  priorCopies.push({ title: copy.title, subtitle: copy.subtitle });
  process.stdout.write(`${day.date}\t${copy.title}\t${copy.subtitle}\n`);
}
