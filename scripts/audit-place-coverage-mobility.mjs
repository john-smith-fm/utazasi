import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const TRIP_SLUG = "sardinia-family-2026";
const TRIP_BASE_SLUG = "trip-base";
const OUTPUT_PATH = new URL("../docs/reports/PLACE_COVERAGE_MOBILITY_RUNTIME.md", import.meta.url);
const PLACES_DIRECTORY = new URL("../knowledge/places/", import.meta.url);
const ROUTES_PATH = new URL("../knowledge/mobility/routes.json", import.meta.url);
const ALIASES_PATH = new URL("../knowledge/places/slug-aliases.json", import.meta.url);
const CANONICAL_TIMELINE_PATH = new URL("../knowledge/trip/timeline.initial.json", import.meta.url);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Place coverage audit requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY).");
}

function markdown(value) {
  return String(value ?? "").replaceAll("|", "\\|").replaceAll("\n", "<br>");
}

function normalize(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("hu-HU")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function routeKey(fromSlug, toSlug) {
  return `${fromSlug}:${toSlug}`;
}

function isFlightMarker(activity) {
  return activity.title === "Repülő indulása"
    || (activity.title === "Érkezés" && activity.description === "Érkezési marker.");
}

function routePriority(reason) {
  return reason === "airport_trip_base" ? "P0" : "P1";
}

function readableFailure(error) {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return "Supabase runtime query unavailable";
}

async function readCanonicalPlaces() {
  const [files, aliasFile] = await Promise.all([
    readdir(PLACES_DIRECTORY),
    readFile(ALIASES_PATH, "utf8"),
  ]);
  const aliases = JSON.parse(aliasFile).aliases ?? {};
  const records = [];

  for (const file of files.filter((entry) => entry.endsWith(".json") && entry !== "slug-aliases.json")) {
    const document = JSON.parse(await readFile(new URL(file, PLACES_DIRECTORY), "utf8"));
    for (const place of document.places ?? []) {
      records.push({
        slug: place.slug,
        name: place.name,
        category: place.category ?? "unknown",
        city: place.location?.city ?? null,
      });
    }
  }

  return {
    aliases,
    bySlug: new Map(records.map((place) => [place.slug, place])),
    byNormalizedName: new Map(records.map((place) => [normalize(place.name), place])),
  };
}

async function loadRuntimeTimeline(supabase) {
  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .select("id, slug, name")
    .eq("slug", TRIP_SLUG)
    .maybeSingle();
  if (tripError) throw tripError;
  if (!trip) throw new Error(`Trip not found: ${TRIP_SLUG}`);

  const { data: days, error: daysError } = await supabase
    .from("days")
    .select("id, date, title")
    .eq("trip_id", trip.id)
    .order("date");
  if (daysError) throw daysError;

  const dayIds = (days ?? []).map((day) => day.id);
  const { data: activities, error: activitiesError } = dayIds.length === 0
    ? { data: [], error: null }
    : await supabase
      .from("timeline_activities")
      .select("id, day_id, start_time, duration_minutes, title, description, location_name, place_slug, created_at")
      .in("day_id", dayIds)
      .order("start_time")
      .order("created_at");
  if (activitiesError) throw activitiesError;

  const activitiesByDay = new Map(dayIds.map((id) => [id, []]));
  for (const activity of activities ?? []) activitiesByDay.get(activity.day_id)?.push(activity);
  return { trip, days: days ?? [], activitiesByDay };
}

async function loadCanonicalTimelineFallback() {
  const canonicalTimeline = JSON.parse(await readFile(CANONICAL_TIMELINE_PATH, "utf8"));
  const days = canonicalTimeline.days.map((day) => ({
    id: day.date,
    date: day.date,
    title: day.title ?? null,
  }));
  const activitiesByDay = new Map(days.map((day) => [day.id, []]));

  for (const day of canonicalTimeline.days) {
    const activities = (day.activities ?? []).map((activity, index) => ({
      ...activity,
      id: activity.seed_key ?? `${day.date}-${index}`,
      day_id: day.date,
      created_at: null,
    }));
    activitiesByDay.set(day.date, activities);
  }

  return {
    trip: { slug: canonicalTimeline.trip_slug, name: "Kanonikus induló terv" },
    days,
    activitiesByDay,
  };
}

function resolveSlug(slug, aliases) {
  if (!slug || slug === TRIP_BASE_SLUG) return slug;
  return aliases[slug] ?? slug;
}

function addCandidate(candidates, candidate) {
  if (!candidate.fromSlug || !candidate.toSlug || candidate.fromSlug === candidate.toSlug) return;
  const key = routeKey(candidate.fromSlug, candidate.toSlug);
  const existing = candidates.get(key);
  if (existing) {
    existing.evidence.push(candidate.evidence);
    if (candidate.priority < existing.priority) existing.priority = candidate.priority;
    return;
  }
  candidates.set(key, { ...candidate, evidence: [candidate.evidence] });
}

async function main() {
  const [canonical, routesDocument] = await Promise.all([
    readCanonicalPlaces(),
    readFile(ROUTES_PATH, "utf8").then(JSON.parse),
  ]);
  const routeByKey = new Map((routesDocument.routes ?? []).map((route) => [routeKey(route.from_slug, route.to_slug), route]));
  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } });
  let auditSource = "production Supabase runtime Timeline";
  let fallbackReason = null;
  let timeline;
  try {
    timeline = await loadRuntimeTimeline(supabase);
  } catch (error) {
    timeline = await loadCanonicalTimelineFallback();
    auditSource = "canonical initial Timeline fallback";
    fallbackReason = readableFailure(error);
    console.warn("Runtime Timeline could not be read; using canonical fallback.");
  }
  const { trip, days, activitiesByDay } = timeline;

  const linked = new Map();
  const tripBase = new Map();
  const freeText = new Map();
  const invalidSlugs = new Map();
  const candidates = new Map();
  let activityCount = 0;

  for (const day of days) {
    const activities = activitiesByDay.get(day.id) ?? [];
    let lastKnownSlug = day.date === "2026-09-02" ? null : TRIP_BASE_SLUG;
    let unknownSinceLastKnown = false;

    for (const activity of activities) {
      activityCount += 1;
      const requestedSlug = activity.place_slug;
      const slug = resolveSlug(requestedSlug, canonical.aliases);
      const occurrence = `${day.date} ${activity.start_time.slice(0, 5)} · ${activity.title}`;

      if (slug === TRIP_BASE_SLUG) {
        const entry = tripBase.get(activity.title) ?? [];
        entry.push(occurrence);
        tripBase.set(activity.title, entry);
      } else if (slug && canonical.bySlug.has(slug)) {
        const place = canonical.bySlug.get(slug);
        const entry = linked.get(slug) ?? { place, occurrences: [] };
        entry.occurrences.push(occurrence);
        linked.set(slug, entry);
      } else if (requestedSlug) {
        const entry = invalidSlugs.get(requestedSlug) ?? [];
        entry.push(occurrence);
        invalidSlugs.set(requestedSlug, entry);
      } else if (activity.location_name) {
        const key = normalize(activity.location_name);
        const exactPlace = canonical.byNormalizedName.get(key) ?? null;
        const entry = freeText.get(key) ?? { locationName: activity.location_name, occurrences: [], exactPlace };
        entry.occurrences.push(occurrence);
        freeText.set(key, entry);
      }

      if (isFlightMarker(activity)) continue;
      if (!slug || (slug !== TRIP_BASE_SLUG && !canonical.bySlug.has(slug))) {
        if (activity.location_name) unknownSinceLastKnown = true;
        continue;
      }

      if (lastKnownSlug && lastKnownSlug !== slug) {
        const airportTripBase = (lastKnownSlug === "cagliari-airport" && slug === TRIP_BASE_SLUG)
          || (lastKnownSlug === TRIP_BASE_SLUG && slug === "cagliari-airport");
        addCandidate(candidates, {
          priority: routePriority(airportTripBase ? "airport_trip_base" : "timeline_transition"),
          fromSlug: lastKnownSlug,
          toSlug: slug,
          reason: airportTripBase ? "reptér ↔ szállás" : unknownSinceLastKnown ? "ismert hely egy nyitott program után" : "Timeline-helyváltás",
          evidence: occurrence,
        });
      }
      lastKnownSlug = slug;
      unknownSinceLastKnown = false;
    }
  }

  // Airport ↔ accommodation is a required trip-level research pair even when
  // the daily plan contains an intermediate stop before the airport. Keep the
  // directions explicit because approved Mobility records are directional.
  if (linked.has("cagliari-airport") && tripBase.size > 0) {
    addCandidate(candidates, {
      priority: "P0",
      fromSlug: "cagliari-airport",
      toSlug: TRIP_BASE_SLUG,
      reason: "reptér ↔ szállás (érkezési kapcsolat)",
      evidence: "2026-09-02 · Érkezés + szállás elfoglalása",
    });
    addCandidate(candidates, {
      priority: "P0",
      fromSlug: TRIP_BASE_SLUG,
      toSlug: "cagliari-airport",
      reason: "reptér ↔ szállás (hazautazási kapcsolat)",
      evidence: "2026-09-13 · Check-out + repülő indulása",
    });
  }

  const candidateRows = [...candidates.values()].sort((a, b) => a.priority.localeCompare(b.priority) || a.fromSlug.localeCompare(b.fromSlug) || a.toSlug.localeCompare(b.toSlug));
  const approvedCount = candidateRows.filter((candidate) => routeByKey.has(routeKey(candidate.fromSlug, candidate.toSlug))).length;
  const generatedAt = new Date().toISOString();
  const lines = [
    "# Place Coverage + Mobility runtime audit",
    "",
    `Generated: ${generatedAt}`,
    "",
    "Read-only audit of the Timeline, canonical Git Place JSON and approved `knowledge/mobility/routes.json`. It creates no Place, Timeline or Mobility data and never estimates km or minutes.",
    "",
    "## Scope summary",
    "",
    `- Timeline source: **${auditSource}**`,
    `- Trip: **${markdown(trip.name)}** (\`${trip.slug}\`)`,
    `- Days: **${days.length}**`,
    `- Timeline activities: **${activityCount}**`,
    `- Canonically linked public Places: **${linked.size}**`,
    `- Trip-base activities: **${[...tripBase.values()].reduce((sum, entries) => sum + entries.length, 0)}**`,
    `- Free-text location groups: **${freeText.size}**`,
    `- Invalid or missing Place slugs: **${invalidSlugs.size}**`,
    `- Route candidates: **${candidateRows.length}** (${approvedCount} approved, ${candidateRows.length - approvedCount} still missing)`,
    "",
    "## Timeline → canonical Place coverage",
    "",
    "| Place | Slug | Type | Timeline evidence |",
    "| --- | --- | --- | --- |",
  ];

  if (fallbackReason) {
    lines.splice(11, 0, `- Runtime fallback reason: \`${markdown(fallbackReason)}\``, "");
  }

  for (const { place, occurrences } of [...linked.values()].sort((a, b) => a.place.name.localeCompare(b.place.name, "hu"))) {
    lines.push(`| ${markdown(place.name)} | \`${place.slug}\` | ${place.category} | ${markdown(occurrences.join("<br>"))} |`);
  }

  lines.push("", "## Trip-base-linked programs", "", "`trip-base` is the private accommodation/mobility origin. It is intentionally not a public Place record.", "", "| Program | Timeline evidence |", "| --- | --- |");
  for (const [title, occurrences] of [...tripBase.entries()].sort(([a], [b]) => a.localeCompare(b, "hu"))) {
    lines.push(`| ${markdown(title)} | ${markdown(occurrences.join("<br>"))} |`);
  }

  lines.push("", "## Free-text locations", "", "These remain free text unless someone explicitly approves a Place link. An exact name match is only a review hint; the audit never creates a link.", "", "| Location | Exact canonical-name match | Timeline evidence |", "| --- | --- | --- |");
  if (freeText.size === 0) lines.push("| — | — | — |");
  for (const entry of [...freeText.values()].sort((a, b) => a.locationName.localeCompare(b.locationName, "hu"))) {
    const match = entry.exactPlace ? `${entry.exactPlace.name} (\`${entry.exactPlace.slug}\`)` : "—";
    lines.push(`| ${markdown(entry.locationName)} | ${markdown(match)} | ${markdown(entry.occurrences.join("<br>"))} |`);
  }

  lines.push("", "## Missing or invalid Place links", "", "| Requested slug | Timeline evidence |", "| --- | --- |");
  if (invalidSlugs.size === 0) lines.push("| None | — |");
  for (const [slug, occurrences] of [...invalidSlugs.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(`| \`${slug}\` | ${markdown(occurrences.join("<br>"))} |`);
  }

  lines.push("", "## Finite Mobility route candidates", "", "Only routes evidenced by the current runtime Timeline are listed. `approved` means an explicit, source-backed record exists in `routes.json`; `missing` means the app must show no km/min estimate.", "", "| Priority | From | To | Reason | Evidence | Status |", "| --- | --- | --- | --- | --- | --- |");
  if (candidateRows.length === 0) lines.push("| — | — | — | No known Location-to-Location transition found. | — | — |");
  for (const candidate of candidateRows) {
    const approved = routeByKey.get(routeKey(candidate.fromSlug, candidate.toSlug));
    const status = approved
      ? `approved · ${approved.distance_km} km · ${approved.duration_minutes} min`
      : "missing · no estimate";
    lines.push(`| ${candidate.priority} | \`${candidate.fromSlug}\` | \`${candidate.toSlug}\` | ${markdown(candidate.reason)} | ${markdown(candidate.evidence.join("<br>"))} | ${markdown(status)} |`);
  }

  lines.push("", "## Safe next actions", "", "1. Review only the `missing` candidates that are actually useful for the trip.", "2. Add a route only after a human approves a source-backed direction, km and duration in `knowledge/mobility/routes.json`.", "3. Re-run this audit after any canonical Place change, runtime Timeline change or approved route update.", "4. Do not turn free text or exact-name hints into Place links without explicit approval.", "");

  await mkdir(new URL("../docs/reports/", import.meta.url), { recursive: true });
  await writeFile(OUTPUT_PATH, `${lines.join("\n")}\n`, "utf8");
  console.log(`Wrote ${OUTPUT_PATH.pathname}`);
  console.log(`Audited ${days.length} days, ${activityCount} activities, ${candidateRows.length} route candidates (${approvedCount} approved).`);
}

await main();
