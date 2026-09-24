import assert from "node:assert/strict";
import test from "node:test";
import { parseTimelineProposalResearch, timelineProposalProviderSources } from "../../src/lib/timeline-proposal-contract.ts";

const verifiedSource = { url: "https://example.com/local-market", title: "Local market" };

function response(sourceUrls: string[], locationName = "Marché local") {
  return JSON.stringify({
    status: "proposed",
    summary: "A mai ritmushoz illeszkedő, könnyű holnapi nap.",
    limitations: ["Az aktuális készlet nem ellenőrizhető."],
    items: [{
      startTime: "15:30",
      durationMinutes: 60,
      title: "Bevásárlás",
      locationName,
      description: "Délutáni bevásárlás.",
      rationale: "A felhasználó kérésére.",
      confidence: locationName ? "verified" : "unverified",
      sourceUrls,
    }],
  });
}

test("keeps only provider-returned web sources on a concrete place proposal", () => {
  const proposal = parseTimelineProposalResearch(response([verifiedSource.url]), [verifiedSource]);
  assert.equal(proposal?.items[0].activity.locationName, "Marché local");
  assert.deepEqual(proposal?.items[0].sources, [verifiedSource]);
});

test("rejects a source URL invented by the planner", () => {
  assert.throws(() => parseTimelineProposalResearch(response(["https://invented.example/place"]), [verifiedSource]), /szerződésnek/);
});

test("rejects a concrete place without supporting search evidence", () => {
  assert.throws(() => parseTimelineProposalResearch(response([]), [verifiedSource]), /Konkrét hely/);
});

test("allows a structure-only item without a location or source", () => {
  const proposal = parseTimelineProposalResearch(response([], ""), []);
  assert.equal(proposal?.items[0].confidence, "unverified");
});

test("extracts valid HTTP sources and ignores invalid provider values", () => {
  const sources = timelineProposalProviderSources({ output: [{ type: "web_search_call", action: { sources: [verifiedSource, { url: "javascript:alert(1)", title: "bad" }] } }] });
  assert.deepEqual(sources, [verifiedSource]);
});
