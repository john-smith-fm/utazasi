import assert from "node:assert/strict";
import test from "node:test";
import { editorialFingerprint, parseEditorialCopy, sanitizeEditorialCopyInput, type EditorialCopyInput } from "../../src/lib/editorial-copy-contract.ts";

const beachDay: EditorialCopyInput = {
  date: "2026-09-04",
  day: { number: 3, total: 12, phase: "early" },
  dayFacts: ["Strandolás: Spiaggia di Campus", "Étkezés"],
  signals: ["beach_day", "new_place"],
  mainActivity: { type: "beach", placeName: "Spiaggia di Campus" },
  secondaryShape: "relaxed",
  verifiedEvent: null,
  placeFacts: [{ name: "Spiaggia di Campus", type: "beach", facts: ["Part: Homokos", "Szolgáltatás: Büfé"] }],
  recentEditorialCopy: [{ title: "Vízparti ritmus", subtitle: "Korábban a strand köré épült a nap." }],
  tripEditorialSummary: [
    { dayNumber: 1, phase: "arrival", signals: ["arrival_day"], mainActivityType: "travel", mainPlaceName: null, placeOccurrence: null },
    { dayNumber: 2, phase: "early", signals: ["beach_day", "new_place"], mainActivityType: "beach", mainPlaceName: "Spiaggia di Campus", placeOccurrence: "first" },
    { dayNumber: 3, phase: "early", signals: ["beach_day"], mainActivityType: "beach", mainPlaceName: "Spiaggia di Campus", placeOccurrence: "consecutive_return" },
  ],
};

function payload(title = "Campus felé", subtitle = "A Spiaggia di Campus köré szerveződik a nap, mellette nyugodtabb ritmus marad.") {
  return JSON.stringify({ title, subtitle, grounding: ["Spiaggia di Campus", "signal:beach_day"] });
}

test("same brief has a stable cache identity and a changed day brief invalidates it", () => {
  assert.equal(editorialFingerprint(beachDay), editorialFingerprint({ ...beachDay }));
  assert.notEqual(editorialFingerprint(beachDay), editorialFingerprint({ ...beachDay, signals: ["beach_day", "returning_place"] }));
});

test("two similar beach days retain prior copy as anti-repetition style context", () => {
  const following = { ...beachDay, date: "2026-09-05", recentEditorialCopy: [...beachDay.recentEditorialCopy, { title: "Campus felé", subtitle: "A korábbi nap összefoglalója." }] };
  assert.equal(following.recentEditorialCopy.length, 2);
  assert.throws(() => parseEditorialCopy(payload("Campus felé"), following), /ismétli|önálló/i);
});

test("trip editorial summary exposes first, return and consecutive context without Timeline text", () => {
  assert.equal(beachDay.tripEditorialSummary[1]?.placeOccurrence, "first");
  assert.equal(beachDay.tripEditorialSummary[2]?.placeOccurrence, "consecutive_return");
  const accepted = sanitizeEditorialCopyInput({ ...beachDay, rawTimeline: [{ description: "PRIVATE: family-only note" }] });
  assert.ok(accepted);
  assert.equal(JSON.stringify(accepted).includes("PRIVATE: family-only note"), false);
});

test("copy contract rejects malformed JSON, repeated prefixes and unsupported grounding", () => {
  assert.throws(() => parseEditorialCopy("{", beachDay), /JSON/i);
  assert.throws(() => parseEditorialCopy(payload("Vízparti ritmus"), beachDay), /ismétli|önálló/i);
  assert.throws(() => parseEditorialCopy(JSON.stringify({ title: "Campus felé", subtitle: "Ellenőrzött, rövid összefoglaló a napról.", grounding: ["Kitalált nyitvatartás"] }), beachDay), /ellenőrzött/i);
});

test("a valid grounded response remains compact Hungarian editorial copy", () => {
  assert.deepEqual(parseEditorialCopy(payload(), beachDay), { title: "Campus felé", subtitle: "A Spiaggia di Campus köré szerveződik a nap, mellette nyugodtabb ritmus marad." });
});

test("endpoint input is strict and accepts no raw Timeline or private fields", () => {
  const accepted = sanitizeEditorialCopyInput({ ...beachDay, notebook: "private", rawTimeline: [{ description: "PRIVATE: family-only note" }] });
  assert.ok(accepted);
  assert.equal("notebook" in accepted, false);
  assert.equal(JSON.stringify(accepted).includes("PRIVATE: family-only note"), false);
  assert.equal(sanitizeEditorialCopyInput({ ...beachDay, placeFacts: [{ name: "x", type: "beach", facts: [42] }] }), null);
});
