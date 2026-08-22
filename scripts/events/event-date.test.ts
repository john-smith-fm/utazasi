import assert from "node:assert/strict";
import test from "node:test";
import { eventOverlapsRange } from "../../src/lib/event-date.ts";

const september12Start = "2026-09-11T22:00:00.000Z";
const september12End = "2026-09-12T22:00:00.000Z";

test("a one-time event is visible only on its own selected day", () => {
  assert.equal(eventOverlapsRange({ starts_at: "2026-09-12T21:30:00+02:00", ends_at: null }, september12Start, september12End), true);
  assert.equal(eventOverlapsRange({ starts_at: "2026-09-05T21:30:00+02:00", ends_at: null }, september12Start, september12End), false);
});

test("a multi-day event remains visible on every overlapping day", () => {
  assert.equal(eventOverlapsRange({ starts_at: "2026-09-06T00:00:00+02:00", ends_at: "2026-09-08T23:59:59+02:00" }, "2026-09-06T22:00:00.000Z", "2026-09-07T22:00:00.000Z"), true);
  assert.equal(eventOverlapsRange({ starts_at: "2026-09-06T00:00:00+02:00", ends_at: "2026-09-08T23:59:59+02:00" }, september12Start, september12End), false);
});
