import { readFile } from "node:fs/promises";

const origin = process.env.TRIP_BASE_MAP_ORIGIN?.trim();

if (!origin) {
  throw new Error("Hiányzik a csak helyi TRIP_BASE_MAP_ORIGIN beállítás. Ez nem kerül Gitbe vagy a publikus Place-adatok közé.");
}

const timeline = JSON.parse(await readFile(new URL("../knowledge/trip/timeline.initial.json", import.meta.url), "utf8"));
const placeFiles = [
  "beaches.json",
  "restaurants.json",
  "sights.json",
  "playgrounds.json",
  "cafes.json",
  "shops.json",
  "other.json",
  "parking.json",
];

const places = new Map();
for (const file of placeFiles) {
  const source = JSON.parse(await readFile(new URL(`../knowledge/places/${file}`, import.meta.url), "utf8"));
  for (const place of source.places ?? []) {
    if (typeof place?.slug !== "string" || typeof place?.name !== "string") continue;
    const location = place.location ?? {};
    const destination = [place.name, location.address ?? location.city].filter(Boolean).join(", ");
    places.set(place.slug, destination);
  }
}

const tripBaseSlug = "trip-base";
const candidates = new Map();

function isFlightMarker(activity) {
  return activity.title === "Repülő indulása"
    || (activity.title === "Érkezés" && activity.description === "Érkezési marker.");
}

function addCandidate(fromSlug, toSlug, date, title) {
  if (!fromSlug || !toSlug || fromSlug === toSlug) return;
  const key = `${fromSlug}:${toSlug}`;
  const existing = candidates.get(key);
  const occurrence = { date, title };
  if (existing) {
    existing.occurrences.push(occurrence);
    return;
  }
  candidates.set(key, { fromSlug, toSlug, occurrences: [occurrence] });
}

for (const day of timeline.days) {
  const activities = [...day.activities].sort((left, right) => left.start_time.localeCompare(right.start_time));
  let lastKnownSlug = day.date === "2026-09-02" ? null : tripBaseSlug;

  for (const activity of activities) {
    if (isFlightMarker(activity) || !activity.place_slug) continue;
    if (!lastKnownSlug) {
      lastKnownSlug = activity.place_slug;
      continue;
    }
    addCandidate(lastKnownSlug, activity.place_slug, day.date, activity.title);
    lastKnownSlug = activity.place_slug;
  }
}

function mapsUrl(from, to) {
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(from)}&destination=${encodeURIComponent(to)}&travelmode=driving`;
}

function endpoint(slug) {
  return slug === tripBaseSlug ? origin : places.get(slug);
}

console.log("# Privát trip-base útvonal-linkek\n");
console.log("Ez a kimenet nem ír adatot és nem tartalmaz távolság- vagy menetidő-becslést. A cím kizárólag a helyi .env.local-ból jön.\n");

for (const candidate of [...candidates.values()].filter(({ fromSlug, toSlug }) => fromSlug === tripBaseSlug || toSlug === tripBaseSlug)) {
  const from = endpoint(candidate.fromSlug);
  const to = endpoint(candidate.toSlug);
  const evidence = candidate.occurrences.map(({ date, title }) => `${date} · ${title}`).join("; ");

  if (!from || !to) {
    console.log(`- HIÁNYZÓ CÉLHELY: ${candidate.fromSlug} → ${candidate.toSlug} (${evidence})`);
    continue;
  }

  console.log(`- ${candidate.fromSlug} → ${candidate.toSlug} — ${evidence}`);
  console.log(`  ${mapsUrl(from, to)}`);
}
