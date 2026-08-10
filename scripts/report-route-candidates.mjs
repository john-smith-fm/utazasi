import { readFile } from "node:fs/promises";

const timeline = JSON.parse(await readFile(new URL("../knowledge/trip/timeline.initial.json", import.meta.url), "utf8"));
const tripBaseSlug = "trip-base";
const priorityByReason = {
  arrival: "P0",
  departure: "P0",
  first_known_place: "P1",
  direct_transition: "P1",
};

function addCandidate(candidates, { fromSlug, toSlug, date, reason, note }) {
  if (!fromSlug || !toSlug || fromSlug === toSlug) return;
  const key = `${fromSlug}:${toSlug}`;
  const existing = candidates.get(key);
  const occurrence = { date, reason, note };
  if (existing) {
    existing.occurrences.push(occurrence);
    if (priorityByReason[reason] < existing.priority) existing.priority = priorityByReason[reason];
    return;
  }
  candidates.set(key, {
    priority: priorityByReason[reason],
    fromSlug,
    toSlug,
    occurrences: [occurrence],
  });
}

// Flights are part of the Trip Timeline but are not ground-mobility routes.
// The report must never turn Budapest ↔ Cagliari into a driving candidate.
function isFlightMarker(activity) {
  return activity.title === "Repülő indulása"
    || (activity.title === "Érkezés" && activity.description === "Érkezési marker.");
}

const candidates = new Map();
const unresolvedLocations = new Map();

for (const day of timeline.days) {
  const activities = [...day.activities].sort((left, right) => left.start_time.localeCompare(right.start_time));
  let lastKnownSlug = day.date === "2026-09-02" ? null : tripBaseSlug;
  let encounteredUnknownLocation = false;

  for (const activity of activities) {
    if (isFlightMarker(activity)) continue;

    if (!activity.place_slug) {
      if (activity.location_name) {
        const entry = unresolvedLocations.get(activity.location_name) ?? { dates: new Set(), titles: new Set() };
        entry.dates.add(day.date);
        entry.titles.add(activity.title);
        unresolvedLocations.set(activity.location_name, entry);
      }
      encounteredUnknownLocation = Boolean(activity.location_name);
      continue;
    }

    if (!lastKnownSlug) {
      lastKnownSlug = activity.place_slug;
      continue;
    }

    if (lastKnownSlug !== activity.place_slug) {
      const reason = day.date === "2026-09-02" && activity.place_slug === tripBaseSlug
        ? "arrival"
        : day.date === "2026-09-13" && activity.place_slug === "cagliari-airport"
          ? "departure"
          : encounteredUnknownLocation
            ? "first_known_place"
            : "direct_transition";
      addCandidate(candidates, {
        fromSlug: lastKnownSlug,
        toSlug: activity.place_slug,
        date: day.date,
        reason,
        note: `${activity.title} · ${activity.start_time}`,
      });
    }

    lastKnownSlug = activity.place_slug;
    encounteredUnknownLocation = false;
  }
}

const orderedCandidates = [...candidates.values()].sort((left, right) => left.priority.localeCompare(right.priority) || left.fromSlug.localeCompare(right.fromSlug) || left.toSlug.localeCompare(right.toSlug));

console.log("# Route candidate list\n");
console.log("Read-only output from `knowledge/trip/timeline.initial.json`. It creates no mobility data and never estimates distance or duration.\n");
console.log("| Priority | From | To | Timeline evidence |");
console.log("| --- | --- | --- | --- |");
for (const candidate of orderedCandidates) {
  const evidence = candidate.occurrences.map(({ date, note }) => `${date}: ${note}`).join("<br>");
  console.log(`| ${candidate.priority} | ${candidate.fromSlug} | ${candidate.toSlug} | ${evidence} |`);
}

if (unresolvedLocations.size > 0) {
  console.log("\n## Places still free-text\n");
  console.log("These are real Timeline locations but do not yet have a canonical Place slug, so no route candidate is created for them.\n");
  console.log("| Location | Dates | Timeline activities |");
  console.log("| --- | --- | --- |");
  for (const [location, value] of [...unresolvedLocations.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    console.log(`| ${location} | ${[...value.dates].join(", ")} | ${[...value.titles].join(", ")} |`);
  }
}
