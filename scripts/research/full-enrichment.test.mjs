import assert from "node:assert/strict";
import test from "node:test";
import { buildFullEnrichmentJob, buildFullEnrichmentPlan, runFullEnrichment } from "./full-enrichment.mjs";

test("full enrichment plan covers every canonical Place without writing", async () => {
  const plan = await buildFullEnrichmentPlan({ root: process.cwd() });
  assert.equal(plan.length, 138);
  assert.equal(new Set(plan.map((item) => item.slug)).size, 138);
  assert.ok(plan.every((item) => item.job.slugs.length === 1 && item.job.slugs[0] === item.slug));
});

test("full enrichment job remains constrained to a known Place", () => {
  const job = buildFullEnrichmentJob({
    type: "beach",
    raw: { slug: "cala-pira", name: "Cala Pira", location: { city: "Castíadas" }, coverage: { basic: "partial", mobility: "missing" }, open_questions: ["Parkolás"] },
  });
  assert.equal(job.mode, "enrich");
  assert.deepEqual(job.slugs, ["cala-pira"]);
  assert.match(job.query, /Do not propose route distance/);
  assert.doesNotMatch(job.query, /mobility/);
});

test("full run stops after a provider-wide connection failure", async () => {
  const report = await runFullEnrichment({
    root: process.cwd(),
    options: { limit: 2, resume: false, outputDir: "research/proposals/test-run", report: undefined },
    createProposal: async () => { throw new Error("OpenAI research kapcsolat nem érhető el: ENOTFOUND"); },
    saveProposal: async () => { throw new Error("should not save"); },
    log: () => {},
  });
  assert.equal(report.failed.length, 1);
  assert.equal(report.blocked?.reason, "OpenAI research kapcsolat nem érhető el: ENOTFOUND");
});

test("full run stops after an inactive-billing provider response", async () => {
  let calls = 0;
  const report = await runFullEnrichment({
    root: process.cwd(),
    options: { limit: 2, resume: false, outputDir: "research/proposals/test-run", report: undefined },
    createProposal: async () => {
      calls += 1;
      throw new Error("OpenAI research hiba (429): Your account is not active, please check your billing details.");
    },
    saveProposal: async () => { throw new Error("should not save"); },
    log: () => {},
  });
  assert.equal(calls, 1);
  assert.equal(report.failed.length, 1);
  assert.match(report.blocked?.reason ?? "", /account is not active/);
});
