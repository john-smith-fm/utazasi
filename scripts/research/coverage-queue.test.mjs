import assert from "node:assert/strict";
import test from "node:test";
import { buildCoverageQueue } from "./coverage-queue.mjs";

test("coverage queue is bounded and never starts live research", async () => {
  const queue = await buildCoverageQueue({ root: process.cwd(), limit: 3, now: new Date("2026-08-13T12:00:00.000Z") });
  assert.equal(queue.limits.liveResearchStarted, false);
  assert.equal(queue.limits.canonicalWrites, false);
  assert.ok(queue.proposals.length <= 3);
  assert.ok(queue.summary.canonicalPlaces > 0);
  assert.ok(queue.coverageMap.some((row) => row.locality === "Villasimius" && row.type === "shop"));
  for (const proposal of queue.proposals) {
    assert.equal(proposal.researchJob.mode, "enrich");
    assert.equal(proposal.researchJob.slugs.length, 1);
    assert.ok(proposal.reason.length > 0);
  }
});

test("planned Timeline places are visibly prioritised without starting research", async () => {
  const queue = await buildCoverageQueue({ root: process.cwd(), limit: 8, now: new Date("2026-08-13T12:00:00.000Z") });
  assert.ok(queue.proposals.length > 0);
  assert.ok(queue.proposals.every((proposal) => proposal.timelineRelevance.status === "planned"));
  assert.ok(queue.proposals.every((proposal) => proposal.timelineRelevance.activities.length > 0));
  assert.equal(queue.limits.liveResearchStarted, false);
  assert.equal(queue.limits.canonicalWrites, false);
});
