import assert from "node:assert/strict";
import test from "node:test";
import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { prepareProposalApply } from "./apply.mjs";

const root = process.cwd();
const holdProposal = JSON.parse(await readFile("research/fixtures/restaurant-verify-proposal.json", "utf8"));

test("rejects HOLD candidates from deterministic apply", async () => {
  await assert.rejects(async () => prepareProposalApply({ proposal: holdProposal, approvedIds: ["possible-closure-example"], root }), /Csak READY ADD vagy UPDATE/);
});

test("dry-run prepares an explicit READY addition without changing canonical JSON", async () => {
  const sandbox = await mkdtemp(path.join(tmpdir(), "utazasi-research-"));
  await cp("knowledge", path.join(sandbox, "knowledge"), { recursive: true });
  const proposal = {
    proposalVersion: "1.0", createdAt: "2026-08-07T20:00:00.000Z", researchJob: { mode: "discover", placeTypes: ["restaurant"] }, summary: { total: 1, ready: 1, needsReview: 0, hold: 0 },
    sourceCatalog: [{ id: "src_01", url: "https://example.com/venue", title: "Fixture source", domain: "example.com", sourceType: "secondary", checkedAt: "2026-08-07T20:00:00.000Z" }],
    candidates: [{ id: "fixture-add-restaurant", action: "add", status: "ready_for_approval", proposedPlace: { id: "place_rest_fixture", slug: "fixture-restaurant", name: "Fixture Restaurant", category: "food", subcategory: "restaurant", location: { city: "Villasimius" }, verification: { status: "fixture" } }, facts: [{ field: "name", value: "Fixture Restaurant", sourceRefs: ["src_01"], checkedAt: "2026-08-07T20:00:00.000Z", confidenceBasis: "secondary" }] }],
  };
  try {
    const changes = await prepareProposalApply({ proposal, approvedIds: ["fixture-add-restaurant"], root: sandbox });
    const before = JSON.parse(await readFile(path.join(sandbox, "knowledge/places/restaurants.json"), "utf8"));
    assert.equal(before.places.some((place) => place.slug === "fixture-restaurant"), false);
    assert.equal([...changes.values()][0].places.some((place) => place.slug === "fixture-restaurant"), true);
  } finally { await rm(sandbox, { recursive: true, force: true }); }
});
