import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { loadCanonicalPlaces, validateResearchProposal } from "./core.mjs";

const root = process.cwd();
const fixture = JSON.parse(await readFile("research/fixtures/restaurant-verify-proposal.json", "utf8"));

test("validates a sourced fixture proposal without live research", async () => {
  const canonical = await loadCanonicalPlaces(root);
  assert.equal(validateResearchProposal(fixture, canonical), fixture);
});

test("rejects a fact whose source is not in the catalog", async () => {
  const invalid = structuredClone(fixture);
  invalid.candidates[0].facts[0].sourceRefs = ["not-a-source"];
  await assert.rejects(async () => validateResearchProposal(invalid, await loadCanonicalPlaces(root)), /forrás nélküli fact/);
});
