import assert from "node:assert/strict";
import test from "node:test";
import { loadEventSeries, validateEventProposal } from "./event-core.mjs";

const root = process.cwd();

test("accepts a HOLD event proposal without inventing a daily occurrence", async () => {
  const series = await loadEventSeries(root);
  const proposal = {
    proposalVersion: "1.0",
    createdAt: "2026-08-11T12:00:00.000Z",
    researchJob: { seriesKey: "event_invaso_festival_muravera_2026", targetDate: "2026-09-02" },
    candidate: { id: "no-confirmed-occurrence", action: "hold", status: "hold", reason: "Nincs hivatalos napi program." },
    sourceCatalog: [],
  };
  assert.equal(validateEventProposal(proposal, series), proposal);
});

test("rejects a concrete event outside the requested Rome-local day", async () => {
  const series = await loadEventSeries(root);
  const proposal = {
    proposalVersion: "1.0",
    createdAt: "2026-08-11T12:00:00.000Z",
    researchJob: { seriesKey: "event_invaso_festival_muravera_2026", targetDate: "2026-09-02" },
    candidate: {
      id: "wrong-day", action: "add", status: "ready_for_approval", sourceRefs: ["src_01"],
      event: { id: "event_wrong_day", series_id: "event_invaso_festival_muravera_2026", title: "Teszt", starts_at: "2026-09-03T20:00:00+02:00", ends_at: "2026-09-03T21:00:00+02:00", source_url: "https://www.invasofestival.com/", organizer: null, place_slug: null, status: "confirmed" },
    },
    sourceCatalog: [{ id: "src_01", url: "https://www.invasofestival.com/", title: "Official", checkedAt: "2026-08-11T12:00:00.000Z" }],
  };
  assert.throws(() => validateEventProposal(proposal, series), /nem a kért napra esik/);
});
