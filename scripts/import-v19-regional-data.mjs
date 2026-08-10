#!/usr/bin/env node

/**
 * Imports the approved v1.9 regional package into Utazási's existing split
 * canonical Place store. The external package deliberately has its own
 * transport schema; this adapter preserves its source detail under
 * `destination_intelligence.regional_import` while exposing the established
 * runtime categories used by the app.
 *
 * Existing slugs are NEVER overwritten. They are reported for human review.
 * Usage:
 *   node scripts/import-v19-regional-data.mjs /path/to/extracted/package
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const packageRootArgument = process.argv[2];
if (!packageRootArgument) throw new Error("Add the extracted utazasi-complete-regional-data-v1.9 folder path.");

const projectRoot = resolve(import.meta.dirname, "..");
const packageRoot = resolve(packageRootArgument);
const sourceFiles = [
  join(packageRoot, "utazasi-v1.8-region-01-villasimius", "places", "villasimius-v1.8.json"),
  join(packageRoot, "utazasi-v1.9-regions-02-06", "places", "regions-02-06-v1.9.json"),
];

const typeMapping = {
  beach: { file: "beaches.json", category: "beach", subcategory: "beach" },
  restaurant: { file: "restaurants.json", category: "food", subcategory: "restaurant" },
  cafe_bar: { file: "cafes.json", category: "cafe", subcategory: "cafe_bar" },
  gelateria: { file: "cafes.json", category: "cafe", subcategory: "gelateria" },
  pharmacy_drugstore: { file: "shops.json", category: "shop", subcategory: "pharmacy" },
  parking: { file: "parking.json", category: "parking", subcategory: "parking" },
  sight: { file: "sights.json", category: "sight", subcategory: "sight" },
  other: { file: "other.json", category: "other", subcategory: "other" },
};

const targetFiles = [...new Set(Object.values(typeMapping).map((mapping) => mapping.file))];

function idFor(type, slug) {
  return `place_${type}_${slug.replace(/[^a-z0-9]+/gi, "_")}`;
}

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function sourceUrls(provenance) {
  return Array.isArray(provenance)
    ? provenance.map((entry) => asRecord(entry).url).filter((url) => typeof url === "string" && url.trim() !== "")
    : [];
}

function normalizedPlace(incoming) {
  const mapping = typeMapping[incoming.type];
  if (!mapping) throw new Error(`Unsupported v1.9 Place type: ${incoming.type}`);
  const location = asRecord(incoming.location);
  const details = asRecord(incoming.details);
  const importedDetails = Object.keys(details).length ? details : undefined;
  const mapsUrl = typeof location.maps === "string" && location.maps ? location.maps : undefined;
  const latitude = typeof location.lat === "number" ? location.lat : null;
  const longitude = typeof location.lng === "number" ? location.lng : null;
  const checkedAt = typeof incoming.checked_at === "string" ? incoming.checked_at : null;
  const provenance = Array.isArray(incoming.provenance) ? incoming.provenance : [];
  const regionalImport = {
    package: "utazasi-complete-regional-data-v1.9",
    source_type: incoming.type,
    region_id: incoming.region_id ?? null,
    details: importedDetails,
    insights: incoming.insights ?? null,
  };

  return {
    id: idFor(mapping.category, incoming.slug),
    slug: incoming.slug,
    name: incoming.name,
    category: mapping.category,
    subcategory: mapping.subcategory,
    location: {
      city: typeof location.municipality === "string" ? location.municipality : null,
      address: typeof location.address === "string" ? location.address : null,
      latitude,
      longitude,
    },
    verification: {
      status: "partial",
      last_checked: checkedAt,
      sources: sourceUrls(provenance),
      uncertainty_note: "A v1.9 regionális import részleges rekord; a nyitott kérdések változatlanul érvényesek.",
    },
    provenance,
    coverage: asRecord(incoming.coverage),
    open_questions: Array.isArray(incoming.open_questions) ? incoming.open_questions : [],
    cover_image: null,
    checked_at: checkedAt,
    destination_intelligence: {
      ...(mapsUrl ? { google_maps: { maps_url: mapsUrl } } : {}),
      regional_import: regionalImport,
    },
    ...(mapsUrl ? { google_maps: { maps_url: mapsUrl } } : {}),
  };
}

const sourceDocuments = await Promise.all(sourceFiles.map(async (file) => JSON.parse(await readFile(file, "utf8"))));
const incoming = sourceDocuments.flatMap((document) => {
  if (!Array.isArray(document.places)) throw new Error("The v1.9 package has an invalid places document.");
  return document.places;
});

const canonicalDirectory = join(projectRoot, "knowledge", "places");
const existingBySlug = new Map();
for (const file of targetFiles) {
  const target = join(canonicalDirectory, file);
  try {
    const document = JSON.parse(await readFile(target, "utf8"));
    if (!Array.isArray(document.places)) throw new Error(`Invalid canonical file: ${file}`);
    for (const place of document.places) existingBySlug.set(place.slug, { file, place });
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}
// Include all current category files in duplicate detection, not only targets.
const allKnownFiles = ["beaches.json", "restaurants.json", "cafes.json", "shops.json", "sights.json", "other.json", "playgrounds.json"];
for (const file of allKnownFiles) {
  const document = JSON.parse(await readFile(join(canonicalDirectory, file), "utf8"));
  for (const place of document.places ?? []) existingBySlug.set(place.slug, { file, place });
}

const additions = new Map(targetFiles.map((file) => [file, []]));
const conflicts = [];
for (const place of incoming) {
  if (existingBySlug.has(place.slug)) {
    const existing = existingBySlug.get(place.slug);
    conflicts.push({ slug: place.slug, current_file: existing.file, current_name: existing.place.name, incoming_name: place.name, incoming_type: place.type });
    continue;
  }
  additions.get(typeMapping[place.type].file).push(normalizedPlace(place));
}

for (const [file, records] of additions) {
  if (!records.length && file !== "parking.json") continue;
  const target = join(canonicalDirectory, file);
  let document;
  try { document = JSON.parse(await readFile(target, "utf8")); }
  catch (error) {
    if (error?.code !== "ENOENT") throw error;
    document = { version: "1.9", source_dataset: "utazasi-complete-regional-data-v1.9", places: [] };
  }
  document.version = "1.9";
  document.source_dataset = "utazasi-complete-regional-data-v1.9";
  document.places = [...document.places, ...records].sort((a, b) => a.name.localeCompare(b.name, "hu"));
  await writeFile(target, `${JSON.stringify(document, null, 2)}\n`);
}

const report = {
  package: "utazasi-complete-regional-data-v1.9",
  imported_at: new Date().toISOString().slice(0, 10),
  incoming_records: incoming.length,
  imported_records: [...additions.values()].reduce((count, records) => count + records.length, 0),
  skipped_existing_slugs: conflicts,
  additions_by_file: Object.fromEntries([...additions].map(([file, records]) => [file, records.length])),
  rule: "Existing canonical records were not overwritten. No mobility route was created.",
};
await mkdir(join(projectRoot, "docs", "import-reports"), { recursive: true });
await writeFile(join(projectRoot, "docs", "import-reports", "v1.9-regional-import.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
