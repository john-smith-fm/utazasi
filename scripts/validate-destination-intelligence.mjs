#!/usr/bin/env node

import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const placeDir = join(root, "knowledge", "places");
const files = (await readdir(placeDir)).filter((file) => file.endsWith(".json") && file !== "slug-aliases.json").sort();
const errors = [];
const warnings = [];
const places = [];

const allowedConfidence = new Set(["low", "medium", "high", "high_historical_low_current", "high_historical_medium_current"]);
const allowedFreshness = new Set(["current", "historical", "stale", "unknown"]);

for (const file of files) {
  const document = JSON.parse(await readFile(join(placeDir, file), "utf8"));
  if (!Array.isArray(document.places)) errors.push(`${file}: places must be an array`);
  for (const place of document.places ?? []) places.push({ ...place, _file: file });
}

for (const key of ["slug", "id"]) {
  const seen = new Map();
  for (const place of places) {
    if (typeof place[key] !== "string" || !place[key]) errors.push(`${place._file}: missing ${key}`);
    else if (seen.has(place[key])) errors.push(`duplicate ${key} ${place[key]} in ${seen.get(place[key])} and ${place._file}`);
    else seen.set(place[key], place._file);
  }
}

for (const place of places) {
  const provenance = Array.isArray(place.provenance) ? place.provenance : [];
  for (const evidence of provenance) {
    if (!evidence.source_type) errors.push(`${place.slug}: provenance source_type missing`);
    if (evidence.url && !/^https?:\/\//.test(evidence.url)) errors.push(`${place.slug}: invalid provenance URL`);
    if (evidence.checked_at && !/^\d{4}-\d{2}-\d{2}$/.test(evidence.checked_at)) errors.push(`${place.slug}: invalid provenance checked_at`);
    if (evidence.evidence_confidence && !allowedConfidence.has(evidence.evidence_confidence)) errors.push(`${place.slug}: invalid evidence_confidence ${evidence.evidence_confidence}`);
    if (evidence.freshness && !allowedFreshness.has(evidence.freshness)) errors.push(`${place.slug}: invalid freshness ${evidence.freshness}`);
  }
  const visuals = [place.cover_image, ...(place.supporting_visuals ?? [])].filter(Boolean);
  for (const visual of visuals) {
    if (!visual.source_url || !visual.source_type || !visual.checked_at) errors.push(`${place.slug}: image provenance incomplete`);
    if (!visual.asset_url) errors.push(`${place.slug}: image asset_url missing`);
  }
  if (place.coverage?.photos === "complete" && !place.cover_image) errors.push(`${place.slug}: photos complete without cover_image`);
  if (place.verification?.status === "ready" && place.coverage?.basic !== "complete") errors.push(`${place.slug}: ready but basic coverage is not complete`);
  if (!place.checked_at && !place.verification?.last_checked) warnings.push(`${place.slug}: no checked date`);
}

const canonicalSlugs = new Set(places.map((place) => place.slug));
const aliases = JSON.parse(await readFile(join(placeDir, "slug-aliases.json"), "utf8")).aliases;
for (const [alias, target] of Object.entries(aliases)) {
  if (canonicalSlugs.has(alias)) warnings.push(`retired alias ${alias} still exists in the source store and must remain runtime-filtered`);
  if (!canonicalSlugs.has(target)) errors.push(`alias ${alias} targets missing slug ${target}`);
}

const routes = JSON.parse(await readFile(join(root, "knowledge", "mobility", "routes.json"), "utf8")).routes ?? [];
for (const route of routes) {
  for (const endpoint of [route.from_slug, route.to_slug]) if (endpoint !== "trip-base" && !canonicalSlugs.has(endpoint)) errors.push(`route endpoint missing: ${endpoint}`);
  if (!route.source_url || !route.checked_at) errors.push(`route provenance incomplete: ${route.from_slug} -> ${route.to_slug}`);
  if (!(route.distance_km > 0) || !(route.duration_minutes > 0)) errors.push(`route values invalid: ${route.from_slug} -> ${route.to_slug}`);
}

console.log(JSON.stringify({ files: files.length, places: places.length, routes: routes.length, errors, warnings }, null, 2));
if (errors.length) process.exitCode = 1;
