#!/usr/bin/env node

/**
 * Imports the runtime-safe v1.5 compatibility payload into the existing,
 * split canonical Place knowledge files. It deliberately keeps partial route
 * findings outside routes.json, where the app only accepts complete routes.
 *
 * Usage:
 *   node scripts/import-v15-compat.mjs /path/to/utazasi_data_codex_v1.5_compat
 */

import { readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";

const packageRoot = process.argv[2];
if (!packageRoot) {
  throw new Error("Add the extracted utazasi_data_codex_v1.5_compat folder path.");
}

const projectRoot = resolve(import.meta.dirname, "..");
const sourceRoot = resolve(packageRoot);
const sourceFile = join(sourceRoot, "compatibility", "canonical_places.json");
const evidenceFile = join(sourceRoot, "compatibility", "mobility_research_evidence.json");

const typeFiles = {
  beach: "beaches.json",
  sight: "sights.json",
  other: "other.json",
};

function canonicalId(type, slug) {
  return `place_${type}_${slug.replace(/[^a-z0-9]+/gi, "_")}`;
}

function sourceUrls(provenance) {
  return provenance
    .map((entry) => entry?.url)
    .filter((value) => typeof value === "string" && value.length > 0);
}

function verificationFor(existing, incoming) {
  const current = existing?.verification && typeof existing.verification === "object" ? existing.verification : {};
  const importedSources = sourceUrls(incoming.provenance ?? []);
  const currentSources = Array.isArray(current.sources) ? current.sources : [];

  return {
    ...current,
    status: current.status ?? "partial",
    last_checked: incoming.checked_at ?? current.last_checked ?? null,
    sources: [...new Set([...currentSources, ...importedSources])],
  };
}

function mergePlace(existing, incoming) {
  const intelligence = incoming.details?.destination_intelligence;
  const next = {
    ...(existing ?? {}),
    id: existing?.id ?? canonicalId(incoming.type, incoming.slug),
    slug: incoming.slug,
    name: incoming.name,
    category: incoming.type,
    location: incoming.location,
    verification: verificationFor(existing, incoming),
    provenance: incoming.provenance ?? [],
    coverage: incoming.coverage ?? {},
    open_questions: incoming.open_questions ?? [],
    cover_image: incoming.cover_image ?? null,
    checked_at: incoming.checked_at ?? null,
    destination_intelligence: intelligence ?? {},
  };

  if (intelligence?.google_maps) next.google_maps = intelligence.google_maps;
  return next;
}

const source = JSON.parse(await readFile(sourceFile, "utf8"));
if (!Array.isArray(source.places)) throw new Error("Compatibility payload has no places array.");

const grouped = new Map();
for (const incoming of source.places) {
  const targetFile = typeFiles[incoming.type];
  if (!targetFile) throw new Error(`Unsupported runtime Place type: ${incoming.type}`);
  const list = grouped.get(targetFile) ?? [];
  list.push(incoming);
  grouped.set(targetFile, list);
}

for (const [fileName, imports] of grouped) {
  const target = join(projectRoot, "knowledge", "places", fileName);
  const current = JSON.parse(await readFile(target, "utf8"));
  if (!Array.isArray(current.places)) throw new Error(`Invalid canonical Place file: ${fileName}`);

  const index = new Map(current.places.map((place, position) => [place.slug, position]));
  for (const incoming of imports) {
    const position = index.get(incoming.slug);
    if (position === undefined) {
      current.places.push(mergePlace(null, incoming));
    } else {
      current.places[position] = mergePlace(current.places[position], incoming);
    }
  }

  current.version = "1.5";
  await writeFile(target, `${JSON.stringify(current, null, 2)}\n`);
}

const evidence = JSON.parse(await readFile(evidenceFile, "utf8"));
await writeFile(
  join(projectRoot, "knowledge", "mobility", "research-evidence.json"),
  `${JSON.stringify(evidence, null, 2)}\n`,
);

console.log(`Imported ${source.places.length} P0 Place records; no partial route was added to routes.json.`);
