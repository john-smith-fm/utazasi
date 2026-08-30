import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../", import.meta.url);

test("an uncached offline day never falls back to prototype Timeline activities", async () => {
  const hook = await readFile(new URL("src/hooks/useTimelineDay.ts", root), "utf8");

  assert.match(hook, /const knownDay = cached \? timelineDayToHomeDay\(cached, fallback\) : emptyDay\(fallback\);/);
  assert.doesNotMatch(hook, /offline \? fallback/);
});

test("the offline Timeline message distinguishes a cached day from an uncached day", async () => {
  const list = await readFile(new URL("src/components/PlanList.tsx", root), "utf8");

  assert.match(list, /hasCachedDay \? "Offline · az utolsó ismert napi terv látható\." : "Offline · ezt a napi tervet még nem töltöttük le erre a készülékre\."/);
});
