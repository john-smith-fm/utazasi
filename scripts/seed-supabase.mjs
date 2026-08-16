import { readFile, readdir } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
// New Supabase projects use sb_secret_ keys. Keep the legacy variable as a
// local-only fallback so existing setups do not break during the transition.
const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (process.argv.includes("--replace-test-day")) {
  throw new Error(
    "The legacy --replace-test-day command is retired. It is deliberately disabled because it could delete family Timeline data. The normal seed is insert-only.",
  );
}

if (!url || !secretKey) {
  throw new Error(
    "Seed requires NEXT_PUBLIC_SUPABASE_URL and server-only SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY).",
  );
}

const initialTimeline = JSON.parse(await readFile(new URL("../knowledge/trip/timeline.initial.json", import.meta.url), "utf8"));
const eventDocument = JSON.parse(await readFile(new URL("../knowledge/events/events.json", import.meta.url), "utf8"));
const eventSeriesDocument = JSON.parse(await readFile(new URL("../knowledge/events/event-series.json", import.meta.url), "utf8"));
const tripCore = JSON.parse(await readFile(new URL("../knowledge/trip/trip.public.json", import.meta.url), "utf8"));
const supabase = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });

const PERIOD_LABELS = new Set(["Reggel", "Délelőtt", "Délután", "Este"]);
const PRECISIONS = new Set(["exact", "approximate", "period"]);
const LEGACY_TEST_SEED_KEYS = [
  "2026-09-03-wake",
  "2026-09-03-beach",
  "2026-09-03-lunch",
  "2026-09-03-nap",
  "2026-09-03-gelato",
  "2026-09-03-dinner",
];
const LEGACY_TRIP_CORE_SEED_KEYS = [
  "trip-core-outbound-flight",
  "trip-core-accommodation-check-in",
  "trip-core-accommodation-check-out",
  "trip-core-return-flight",
];

async function loadCanonicalPlaceSlugs() {
  const directory = new URL("../knowledge/places/", import.meta.url);
  const files = (await readdir(directory)).filter((file) => file.endsWith(".json"));
  const documents = await Promise.all(files.map(async (file) => JSON.parse(await readFile(new URL(file, directory), "utf8"))));
  return new Set(documents.flatMap((document) => document.places ?? []).map((place) => place.slug));
}

function isTime(value) {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function validateInitialTimeline(document, tripDays, canonicalPlaceSlugs) {
  if (!Array.isArray(document.days)) throw new Error("Initial Timeline must contain a days array.");

  const expectedDates = new Set(tripDays.map((day) => day.date));
  const suppliedDates = new Set(document.days.map((day) => day.date));
  if (expectedDates.size !== 12 || suppliedDates.size !== expectedDates.size || [...expectedDates].some((date) => !suppliedDates.has(date))) {
    throw new Error("Initial Timeline must define exactly the canonical 12 Trip days.");
  }

  const seenSeedKeys = new Set();
  for (const day of document.days) {
    if (!expectedDates.has(day.date) || !Array.isArray(day.activities)) throw new Error(`Invalid initial Timeline day: ${day.date}`);
    for (const activity of day.activities) {
      if (!activity.seed_key || seenSeedKeys.has(activity.seed_key)) throw new Error(`Missing or duplicate initial seed_key: ${activity.seed_key ?? "(missing)"}`);
      seenSeedKeys.add(activity.seed_key);
      if (!isTime(activity.start_time)) throw new Error(`Invalid start_time for ${activity.seed_key}`);
      if (!Number.isInteger(activity.duration_minutes) || activity.duration_minutes < 1) throw new Error(`Invalid duration for ${activity.seed_key}`);
      if (!PRECISIONS.has(activity.time_precision)) throw new Error(`Invalid time_precision for ${activity.seed_key}`);
      if (activity.time_precision === "period") {
        if (!PERIOD_LABELS.has(activity.time_label)) throw new Error(`A period item needs a valid time_label: ${activity.seed_key}`);
      } else if (activity.time_label !== null) {
        throw new Error(`Only period items may define time_label: ${activity.seed_key}`);
      }
      if (activity.place_slug && activity.place_slug !== "trip-base" && !canonicalPlaceSlugs.has(activity.place_slug)) {
        throw new Error(`Unknown canonical place_slug for ${activity.seed_key}: ${activity.place_slug}`);
      }
    }
  }
}

const canonicalPlaceSlugs = await loadCanonicalPlaceSlugs();
validateInitialTimeline(initialTimeline, tripCore.days, canonicalPlaceSlugs);

const { data: trip, error: tripError } = await supabase
  .from("trips")
  .upsert({
    slug: tripCore.slug,
    name: tripCore.name,
    destination: tripCore.destination.name,
    start_date: tripCore.dates.start,
    end_date: tripCore.dates.end,
  }, { onConflict: "slug" })
  .select("id")
  .single();
if (tripError) throw tripError;

const { error: coreDaysError } = await supabase
  .from("days")
  // Like Timeline rows, day metadata is initialized once and never reset by a
  // later Git seed. This preserves future family edits to day titles or notes.
  .upsert(tripCore.days.map((day) => ({ trip_id: trip.id, date: day.date, title: day.title, subtitle: day.subtitle })), { onConflict: "trip_id,date", ignoreDuplicates: true });
if (coreDaysError) throw coreDaysError;

const { data: days, error: daysLookupError } = await supabase
  .from("days")
  .select("id, date")
  .eq("trip_id", trip.id)
  .in("date", tripCore.days.map((day) => day.date));
if (daysLookupError) throw daysLookupError;

const dayIds = new Map((days ?? []).map((day) => [day.date, day.id]));
if (dayIds.size !== 12) throw new Error("Could not resolve all canonical Trip days after seed.");

const { data: legacyRows, error: legacyLookupError } = await supabase
  .from("timeline_activities")
  .select("seed_key")
  .in("seed_key", [...LEGACY_TEST_SEED_KEYS, ...LEGACY_TRIP_CORE_SEED_KEYS]);
if (legacyLookupError) throw legacyLookupError;
if ((legacyRows?.length ?? 0) > 0) {
  throw new Error(
    "Legacy test Timeline data is present. It is deliberately not deleted automatically; resolve it with an explicit, reviewed maintenance plan. Ordinary seed runs never delete or overwrite runtime Timeline data.",
  );
}

const initialRows = initialTimeline.days.flatMap((day) => day.activities.map((activity) => ({
  day_id: dayIds.get(day.date),
  seed_key: activity.seed_key,
  start_time: activity.start_time,
  start_time_precision: activity.time_precision,
  time_label: activity.time_label,
  duration_minutes: activity.duration_minutes,
  title: activity.title,
  description: activity.description,
  location_name: activity.location_name,
  place_slug: activity.place_slug,
  kind: "plan",
  is_system_generated: false,
})));

// Initial canonical content is insert-only. Once the family edits an item in
// the app, a later seed run must never reset it from Git.
const { error: activityError } = await supabase
  .from("timeline_activities")
  .upsert(initialRows, { onConflict: "seed_key", ignoreDuplicates: true });
if (activityError) throw activityError;

const eventSeriesRows = eventSeriesDocument.series.map((series) => ({
  trip_id: trip.id,
  canonical_key: series.id,
  title: series.title,
  starts_at: series.starts_at,
  ends_at: series.ends_at ?? null,
  organizer: series.organizer ?? null,
  source_url: series.source_url,
  place_slug: series.place_slug ?? null,
  last_verified_at: series.metadata?.verification?.last_checked ? `${series.metadata.verification.last_checked}T00:00:00+02:00` : null,
}));

if (eventSeriesRows.length > 0) {
  const { error: eventSeriesError } = await supabase
    .from("event_series")
    .upsert(eventSeriesRows, { onConflict: "trip_id,canonical_key" });
  if (eventSeriesError) throw eventSeriesError;
}

const { data: eventSeries, error: eventSeriesLookupError } = await supabase
  .from("event_series")
  .select("id, canonical_key")
  .eq("trip_id", trip.id);
if (eventSeriesLookupError) throw eventSeriesLookupError;
const eventSeriesIds = new Map((eventSeries ?? []).map((series) => [series.canonical_key, series.id]));

const eventRows = eventDocument.events.map((event) => ({
  trip_id: trip.id,
  canonical_key: event.id,
  title: event.title,
  starts_at: event.starts_at,
  ends_at: event.ends_at ?? null,
  organizer: event.organizer ?? null,
  source_url: event.source_url,
  status: event.status === "cancelled" ? "cancelled" : event.status === "changed" ? "changed" : "scheduled",
  series_id: event.series_id ? eventSeriesIds.get(event.series_id) ?? null : null,
  place_slug: event.place_slug ?? null,
  last_verified_at: event.metadata?.verification?.last_checked ? `${event.metadata.verification.last_checked}T00:00:00+02:00` : null,
}));

let seededEvents = [];
if (eventRows.length > 0) {
  const { data, error: eventError } = await supabase
    .from("events")
    .upsert(eventRows, { onConflict: "trip_id,canonical_key" })
    .select("id, source_url, status, starts_at, place_slug, last_verified_at");
  if (eventError) throw eventError;
  seededEvents = data ?? [];
}

// The first verified canonical Event state is a Watch baseline, but a newly
// discovered Event is not watched until the family explicitly accepts it into
// the Timeline. Existing runtime rows are deliberately never reset by a later
// seed run: once a Watch has observed a change, its baseline belongs to the
// Watch service.
const watchBaselines = (seededEvents ?? [])
  .filter((event) => event.source_url && event.last_verified_at)
  .map((event) => ({
    event_id: event.id,
    enabled: false,
    baseline_status: event.status,
    baseline_starts_at: event.starts_at,
    baseline_place_slug: event.place_slug,
    last_checked_at: event.last_verified_at,
    last_success_at: event.last_verified_at,
  }));

if (watchBaselines.length > 0) {
  const { error: watchError } = await supabase
    .from("event_watch_states")
    .upsert(watchBaselines, { onConflict: "event_id", ignoreDuplicates: true });
  if (watchError) throw watchError;
}

console.log(`Initialized ${initialRows.length} canonical Timeline activity record(s) across 12 days, plus ${eventSeriesRows.length} event series, ${eventRows.length} concrete event(s) and ${watchBaselines.length} Watch baseline(s). Existing Timeline rows were never overwritten.`);
