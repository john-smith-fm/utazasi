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

test("the dashboard replacement seed is visibly blocked", async () => {
  const [packageJson, generator, sql, seed] = await Promise.all([
    readFile(new URL("package.json", root), "utf8"),
    readFile(new URL("scripts/generate-dashboard-seed-sql.mjs", root), "utf8"),
    readFile(new URL("supabase/seeds/replace-test-day.sql", root), "utf8"),
    readFile(new URL("scripts/seed-supabase.mjs", root), "utf8"),
  ]);

  assert.doesNotMatch(packageJson, /seed:supabase:replace-test-day/);
  assert.match(generator, /historical Dashboard seed is intentionally blocked/i);
  assert.match(sql, /Dashboard seed is intentionally blocked/i);
  assert.doesNotMatch(seed, /\.from\("timeline_activities"\)[\s\S]{0,160}\.delete\(/);
  assert.match(seed, /upsert\(initialRows, \{ onConflict: "seed_key", ignoreDuplicates: true \}\)/);
  assert.match(seed, /onConflict: "trip_id,date", ignoreDuplicates: true/);
});
