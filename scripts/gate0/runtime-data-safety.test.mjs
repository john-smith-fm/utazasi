import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import test from "node:test";

const root = new URL("../../", import.meta.url);

function run(script, ...arguments_) {
  return spawnSync(process.execPath, [script, ...arguments_], {
    cwd: root,
    encoding: "utf8",
  });
}

test("the retired Timeline replacement command cannot run before any database access", () => {
  const result = run("scripts/seed-supabase.mjs", "--replace-test-day");
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /retired/i);
  assert.doesNotMatch(result.stderr, /Seed requires NEXT_PUBLIC_SUPABASE_URL/i);
});

test("the retired generic Place-link backfill cannot mutate runtime data", () => {
  const result = run("scripts/backfill-canonical-place-links.mjs", "--apply");
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /retired/i);
});

test("the runtime backup refuses an unsafe destination before it can read Supabase", () => {
  const noOutput = run("scripts/backup-runtime-data.mjs");
  assert.notEqual(noOutput.status, 0);
  assert.match(noOutput.stderr, /kötelező a --output/i);
  assert.doesNotMatch(noOutput.stderr, /SUPABASE_SECRET_KEY/i);

  const insideRepository = run("scripts/backup-runtime-data.mjs", "--output", `${process.cwd()}/do-not-create.json`);
  assert.notEqual(insideRepository.status, 0);
  assert.match(insideRepository.stderr, /nem kerülhet a Git repóba/i);
  assert.doesNotMatch(insideRepository.stderr, /SUPABASE_SECRET_KEY/i);
});

test("the dashboard replacement seed is visibly blocked", async () => {
  const [packageJson, generator, sql, seed, notebookService, legacyMigration, backup] = await Promise.all([
    readFile(new URL("package.json", root), "utf8"),
    readFile(new URL("scripts/generate-dashboard-seed-sql.mjs", root), "utf8"),
    readFile(new URL("supabase/seeds/replace-test-day.sql", root), "utf8"),
    readFile(new URL("scripts/seed-supabase.mjs", root), "utf8"),
    readFile(new URL("src/lib/notebook-service.ts", root), "utf8"),
    readFile(new URL("src/lib/notebook-legacy-migration.ts", root), "utf8"),
    readFile(new URL("scripts/backup-runtime-data.mjs", root), "utf8"),
  ]);

  assert.doesNotMatch(packageJson, /seed:supabase:replace-test-day/);
  assert.match(generator, /Dashboard SQL seed generation is disabled/i);
  assert.match(sql, /replace-test-day is disabled/i);
  assert.doesNotMatch(generator, /delete from public\.timeline_activities/i);
  assert.doesNotMatch(sql, /delete from public\.timeline_activities/i);
  assert.doesNotMatch(generator, /on conflict \(slug\) do update/i);
  assert.doesNotMatch(sql, /on conflict \(slug\) do update/i);
  assert.doesNotMatch(seed, /\.from\("timeline_activities"\)[\s\S]{0,160}\.delete\(/);
  assert.match(seed, /const tripAlreadyExists = Boolean\(existingTrip\)/);
  assert.match(seed, /if \(!tripAlreadyExists\) \{[\s\S]{0,320}\.from\("days"\)[\s\S]{0,160}\.insert\(tripCore\.days\.map/);
  assert.doesNotMatch(seed, /\.from\("days"\)[\s\S]{0,160}\.(?:update|upsert)\(/);
  assert.match(seed, /if \(!tripAlreadyExists\) \{[\s\S]{0,320}\.insert\(initialRows\)/);
  assert.doesNotMatch(seed, /\.upsert\(initialRows/);
  assert.doesNotMatch(seed, /\.from\("timeline_activities"\)[\s\S]{0,160}\.(?:update|upsert)\(/);
  const existingTripFailure = seed.indexOf("if (existingTripError) throw existingTripError;");
  const tripCreate = seed.indexOf("if (!trip) {");
  assert.ok(existingTripFailure >= 0 && tripCreate >= 0 && existingTripFailure < tripCreate, "A Trip lookup failure must stop the seed before any create path.");
  assert.match(seed, /\.upsert\(eventRows, \{ onConflict: "trip_id,canonical_key", ignoreDuplicates: true \}\)/);
  assert.match(notebookService, /hasOtherRuntimeData/);
  assert.match(notebookService, /nem kevertük össze őket a már elmentett utazási adatokkal/i);
  assert.match(legacyMigration, /storageSet\(COMPLETED_KEY, true\)/);
  assert.match(packageJson, /"backup:runtime"/);
  assert.match(backup, /Read-only snapshot/);
  assert.match(backup, /A mentés nem kerülhet a Git repóba/);
  assert.match(backup, /flag: "wx"/);
  assert.match(backup, /chmod\(output, 0o600\)/);
  assert.match(backup, /AbortSignal\.timeout\(BACKUP_REQUEST_TIMEOUT_MS\)/);
  assert.match(backup, /Supabase mentési kapcsolat 15 másodperc/);
  assert.match(backup, /Supabase jelenleg nem érhető el a gépről/);
  assert.doesNotMatch(backup, /\.from\([^)]*\)\.(?:insert|update|upsert|delete)\(/);
});
