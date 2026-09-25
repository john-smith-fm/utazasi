import assert from "node:assert/strict";
import test from "node:test";
import { parseTimelineProposalResearch, timelineProposalProviderSources } from "../../src/lib/timeline-proposal-contract.ts";

const verifiedSource = { url: "https://example.com/local-market", title: "Local market" };
const targetDays = [{ date: "2026-09-17", title: "Holnap", version: 3, activities: [{ id: "11111111-1111-4111-8111-111111111111", startTime: "10:00", durationMinutes: 60, title: "Régi program", locationName: "", description: "" }] }];

function response(sourceUrls: string[], locationName = "Marché local") {
  return JSON.stringify({
    status: "proposed",
    summary: "A mai ritmushoz illeszkedő, könnyű holnapi nap.",
    limitations: ["Az aktuális készlet nem ellenőrizhető."],
    days: [{ date: targetDays[0].date, keepActivityIds: [], removeActivityIds: [targetDays[0].activities[0].id], items: [{
      startTime: "15:30",
      durationMinutes: 60,
      title: "Bevásárlás",
      locationName,
      description: "Délutáni bevásárlás.",
      rationale: "A felhasználó kérésére.",
      confidence: locationName ? "verified" : "unverified",
      sourceUrls,
    }] }],
  });
}

test("keeps only provider-returned web sources on a concrete place proposal", () => {
  const proposal = parseTimelineProposalResearch(response([verifiedSource.url]), [verifiedSource], targetDays);
  assert.equal(proposal?.days[0].add[0].activity.locationName, "Marché local");
  assert.deepEqual(proposal?.days[0].add[0].sources, [verifiedSource]);
  assert.equal(proposal?.days[0].remove[0].title, "Régi program");
});

test("rejects a source URL invented by the planner", () => {
  assert.throws(() => parseTimelineProposalResearch(response(["https://invented.example/place"]), [verifiedSource], targetDays), /szerződésnek/);
});

test("rejects a concrete place without supporting search evidence", () => {
  assert.throws(() => parseTimelineProposalResearch(response([]), [verifiedSource], targetDays), /Konkrét hely/);
});

test("allows a structure-only item without a location or source", () => {
  const proposal = parseTimelineProposalResearch(response([], ""), [], targetDays);
  assert.equal(proposal?.days[0].add[0].confidence, "unverified");
});

test("rejects a diff that silently drops an existing activity", () => {
  const invalid = JSON.parse(response([], ""));
  invalid.days[0].removeActivityIds = [];
  assert.throws(() => parseTimelineProposalResearch(JSON.stringify(invalid), [], targetDays), /nem számolt el/);
});

test("extracts valid HTTP sources and ignores invalid provider values", () => {
  const sources = timelineProposalProviderSources({ output: [{ type: "web_search_call", action: { sources: [verifiedSource, { url: "javascript:alert(1)", title: "bad" }] } }] });
  assert.deepEqual(sources, [verifiedSource]);
});
