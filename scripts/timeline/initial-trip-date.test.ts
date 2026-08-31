import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { initialTripDate } from "../../src/lib/initial-trip-date.ts";

const trip = {
  startDate: "2026-09-02",
  endDate: "2026-09-13",
  timezone: "Europe/Rome",
};

test("before the trip selects the first day", () => {
  assert.equal(initialTripDate(trip, new Date("2026-09-01T12:00:00Z")), "2026-09-02");
});

test("the first trip day selects itself", () => {
  assert.equal(initialTripDate(trip, new Date("2026-09-02T12:00:00Z")), "2026-09-02");
});

test("a middle trip day selects the local current day", () => {
  assert.equal(initialTripDate(trip, new Date("2026-09-07T12:00:00Z")), "2026-09-07");
});

test("the last trip day selects itself", () => {
  assert.equal(initialTripDate(trip, new Date("2026-09-13T12:00:00Z")), "2026-09-13");
});

test("after the trip selects the last day", () => {
  assert.equal(initialTripDate(trip, new Date("2026-09-14T12:00:00Z")), "2026-09-13");
});

test("Europe/Rome date boundaries never use the adjacent UTC date", () => {
  // 22:30 UTC is already 00:30 on Sep 2 in Italy (CEST).
  assert.equal(initialTripDate(trip, new Date("2026-09-01T22:30:00Z")), "2026-09-02");
  // 22:30 UTC is already Sep 14 in Italy, so the trip has ended.
  assert.equal(initialTripDate(trip, new Date("2026-09-13T22:30:00Z")), "2026-09-13");
});

test("Home uses the resolver only as the initial selected-day state", async () => {
  const page = await readFile(new URL("../../src/app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /useState\(\(\) => initialTripDate\(TRIP_RUNTIME\)\)/);
  assert.doesNotMatch(page, /setSelectedDate\(initialTripDate\(/);
});
