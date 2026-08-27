#!/usr/bin/env node

/**
 * Safe, append-only importer for a Destination Intelligence package.
 *
 * It deliberately never touches runtime Supabase data, Timeline seed data,
 * Notebook data or Mobility. Existing canonical facts are never overwritten:
 * only absent scalar fields, absent nested fields and new array members are
 * added. Re-running it with the same package is therefore idempotent.
 *
 * Usage:
 *   node scripts/import-destination-intelligence-additions.mjs /path/to/package --dry-run
 *   node scripts/import-destination-intelligence-additions.mjs /path/to/package --apply
 */

import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const packageRoot = process.argv[2] ? resolve(process.argv[2]) : null;
const apply = process.argv.includes("--apply");
const categories = ["beaches", "cafes", "other", "parking", "playgrounds", "restaurants", "shops", "sights"];

if (!packageRoot || !existsSync(packageRoot)) {
  throw new Error("Adj meg egy kicsomagolt Destination Intelligence csomagkönyvtárat.");
}

const isRecord = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const isMissing = (value) => value === undefined || value === null || value === "";
const fingerprint = (value) => JSON.stringify(value);
const normalize = (value = "") => String(value)
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

function mergeOnlyMissing(current, incoming) {
  const next = structuredClone(current);
  let changed = false;

  for (const [key, incomingValue] of Object.entries(incoming)) {
    if (isMissing(incomingValue)) continue;
    const currentValue = next[key];

    if (isMissing(currentValue)) {
      next[key] = structuredClone(incomingValue);
      changed = true;
      continue;
    }

    if (isRecord(currentValue) && isRecord(incomingValue)) {
      const nested = mergeOnlyMissing(currentValue, incomingValue);
      next[key] = nested.value;
      changed ||= nested.changed;
      continue;
    }

    if (Array.isArray(currentValue) && Array.isArray(incomingValue)) {
      const present = new Set(currentValue.map(fingerprint));
      const additions = incomingValue.filter((item) => !present.has(fingerprint(item)));
      if (additions.length) {
        next[key] = [...currentValue, ...structuredClone(additions)];
        changed = true;
      }
    }
  }

  return { value: next, changed };
}

function placeIdentity(place) {
  return `${normalize(place.name)}|${normalize(place.location?.address)}`;
}

function eventIdentity(event) {
  return [
    normalize(event.title),
    String(event.starts_at ?? "").slice(0, 16),
    normalize(event.metadata?.location?.city),
    normalize(event.metadata?.location?.venue),
  ].join("|");
}

async function load(relative) {
  return JSON.parse(await readFile(join(root, relative), "utf8"));
}

async function loadPackage(relative) {
  return JSON.parse(await readFile(join(packageRoot, relative), "utf8"));
}

const summary = { updatedPlaces: 0, addedPlaces: 0, updatedEvents: 0, addedEvents: 0, files: [] };

for (const category of categories) {
  const relative = `knowledge/places/${category}.json`;
  const current = await load(relative);
  const incoming = await loadPackage(relative);
  const next = structuredClone(current);
  const bySlug = new Map(next.places.map((place, index) => [place.slug, index]));
  const byIdentity = new Map(next.places.map((place, index) => [placeIdentity(place), index]));
  let changed = false;

  for (const candidate of incoming.places ?? []) {
    const index = bySlug.get(candidate.slug) ?? byIdentity.get(placeIdentity(candidate));
    if (index === undefined) {
      next.places.push(structuredClone(candidate));
      bySlug.set(candidate.slug, next.places.length - 1);
      byIdentity.set(placeIdentity(candidate), next.places.length - 1);
      summary.addedPlaces += 1;
      changed = true;
      continue;
    }
    const merged = mergeOnlyMissing(next.places[index], candidate);
    if (merged.changed) {
      next.places[index] = merged.value;
      summary.updatedPlaces += 1;
      changed = true;
    }
  }

  if (changed) {
    summary.files.push(relative);
    if (apply) await writeFile(join(root, relative), `${JSON.stringify(next, null, 2)}\n`);
  }
}

const eventsRelative = "knowledge/events/events.json";
const currentEvents = await load(eventsRelative);
const incomingEvents = await loadPackage(eventsRelative);
const nextEvents = structuredClone(currentEvents);
const byEventId = new Map(nextEvents.events.map((event, index) => [event.id, index]));
const byEventIdentity = new Map(nextEvents.events.map((event, index) => [eventIdentity(event), index]));
let eventsChanged = false;

for (const candidate of incomingEvents.events ?? []) {
  const index = byEventId.get(candidate.id) ?? byEventIdentity.get(eventIdentity(candidate));
  if (index === undefined) {
    nextEvents.events.push(structuredClone(candidate));
    byEventId.set(candidate.id, nextEvents.events.length - 1);
    byEventIdentity.set(eventIdentity(candidate), nextEvents.events.length - 1);
    summary.addedEvents += 1;
    eventsChanged = true;
    continue;
  }
  const merged = mergeOnlyMissing(nextEvents.events[index], candidate);
  if (merged.changed) {
    nextEvents.events[index] = merged.value;
    summary.updatedEvents += 1;
    eventsChanged = true;
  }
}

if (eventsChanged) {
  summary.files.push(eventsRelative);
  if (apply) await writeFile(join(root, eventsRelative), `${JSON.stringify(nextEvents, null, 2)}\n`);
}

console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", ...summary }, null, 2));
