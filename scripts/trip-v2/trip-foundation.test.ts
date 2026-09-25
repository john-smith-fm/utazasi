import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { normalizeTripSlug } from "../../src/domain/trip.ts";
import { timelineDayCacheKey, tripEventsDayCacheKey, tripTimelineCacheKey } from "../../src/lib/trip-cache.ts";
import { tripDayShells } from "../../src/lib/trip-days.ts";

const root = new URL("../../", import.meta.url);

test("Trip slugs are normalized and unsafe identifiers are rejected", () => {
  assert.equal(normalizeTripSlug("  Utazasi-V2-POC  "), "utazasi-v2-poc");
  assert.equal(normalizeTripSlug("../other-trip"), null);
  assert.equal(normalizeTripSlug("trip?admin=true"), null);
  assert.equal(normalizeTripSlug(""), null);
});

test("Timeline and Event cache entries are isolated by Trip", () => {
  assert.notEqual(
    timelineDayCacheKey("trip-a", "2026-09-16"),
    timelineDayCacheKey("trip-b", "2026-09-16"),
  );
  assert.equal(timelineDayCacheKey("trip-a", "2026-09-16"), "utazasi:v2:trip:trip-a:timeline:day:2026-09-16");
  assert.equal(tripTimelineCacheKey("trip-a"), "utazasi:v2:trip:trip-a:timeline:all");
  assert.equal(tripEventsDayCacheKey("trip-a", "2026-09-16"), "utazasi:v2:trip:trip-a:events:day:2026-09-16");
});

test("Timeline feature service has no hardcoded Villasimius Trip slug", async () => {
  const source = await readFile(new URL("src/lib/timeline-service.ts", root), "utf8");
  assert.doesNotMatch(source, /sardinia-family-2026/);
  assert.match(source, /createTimelineActivity\(tripSlug:/);
  assert.match(source, /updateTimelineActivity\(tripSlug:/);
  assert.match(source, /deleteTimelineActivity\(tripSlug:/);
});

test("V2 POC seed is isolated and does not copy legacy Timeline rows", async () => {
  const seed = await readFile(new URL("supabase/seeds/v2-poc-trip.sql", root), "utf8");
  assert.match(seed, /utazasi-v2-poc/);
  assert.doesNotMatch(seed, /timeline_activities\s*\(/);
  assert.doesNotMatch(seed, /sardinia-family-2026/);
});

test("API Trip days become neutral Timeline shells", () => {
  const days = tripDayShells({
    id: "trip-id",
    slug: "utazasi-v2-poc",
    name: "POC",
    destinationLabel: "Teszt úticél",
    startDate: "2026-09-16",
    endDate: "2026-09-17",
    timezone: "Europe/Budapest",
    status: "draft",
    version: 1,
    createdAt: "2026-09-16T00:00:00Z",
    updatedAt: "2026-09-16T00:00:00Z",
    days: [
      { id: "day-1", date: "2026-09-16", title: "Ma", subtitle: null },
      { id: "day-2", date: "2026-09-17", title: "Holnap", subtitle: "Tervezhető" },
    ],
  });
  assert.deepEqual(days.map((day) => ({ date: day.date, day: day.day, weekday: day.weekday, activities: day.activities })), [
    { date: "2026-09-16", day: 16, weekday: "Sze", activities: [] },
    { date: "2026-09-17", day: 17, weekday: "Csü", activities: [] },
  ]);
});

test("Home is driven by Active Trip rather than the legacy day constant", async () => {
  const page = await readFile(new URL("src/app/page.tsx", root), "utf8");
  assert.match(page, /useActiveTrip\(\)/);
  assert.match(page, /tripDayShells\(trip\)/);
  assert.doesNotMatch(page, /TRIP_CORE_DAYS/);
});

test("unfinished V2 feature pages cannot expose Villasimius data to another Trip", async () => {
  const gate = await readFile(new URL("src/components/TripFeatureGate.tsx", root), "utf8");
  assert.match(gate, /activeTrip\.slug === TRIP_CORE\.slug/);
  assert.match(gate, /Villasimius adatait nem keverjük bele/);
  const question = await readFile(new URL("src/components/QuestionSheet.tsx", root), "utf8");
  assert.match(question, /hasLegacyKnowledge \? getPlaces\(\) : \[\]/);
  assert.match(question, /hasLegacyKnowledge \? getShoppingAnswer\(value\) : null/);
});

test("search-first Timeline planning requires explicit consent and preserves proposal review", async () => {
  const route = await readFile(new URL("src/app/api/timeline/proposals/route.ts", root), "utf8");
  const question = await readFile(new URL("src/components/QuestionSheet.tsx", root), "utf8");
  assert.match(route, /mutationConfirmed !== true/);
  assert.match(route, /researchTimelineProposal/);
  assert.match(question, /mutationConfirmed: true/);
  assert.match(question, /Alkalmazás/);
  assert.match(question, /Finomítás/);
  assert.match(question, /Elvetés/);
});

test("accepted AI proposals use one version-checked atomic operation and grouped Undo", async () => {
  const migration = await readFile(new URL("supabase/migrations/015_add_multiday_timeline_change_sets.sql", root), "utf8");
  const applyRoute = await readFile(new URL("src/app/api/timeline/proposals/apply/route.ts", root), "utf8");
  const page = await readFile(new URL("src/app/page.tsx", root), "utf8");
  assert.match(migration, /timeline_proposal_undo_snapshots/);
  assert.match(migration, /for update of d/);
  assert.match(migration, /timeline_version_conflict/);
  assert.match(migration, /activity_snapshot/);
  assert.match(migration, /undo_timeline_proposal_changes/);
  assert.match(applyRoute, /rpc\("apply_timeline_proposal_changes"/);
  assert.match(page, /applyTimelineProposalAtomically/);
  assert.match(page, /undoTimelineProposal/);
  assert.doesNotMatch(page, /for \(const item of proposal\.items\)/);
});
