import assert from "node:assert/strict";
import test from "node:test";
import type { HomeDay } from "../../src/data/home-days.ts";
import { buildTimelineProposal, isTimelineActionRequest } from "../../src/lib/timeline-proposal.ts";

const today: HomeDay = {
  date: "2026-09-16", day: 16, weekday: "Sze", title: "Ma", summary: "", activities: [
    { time: "09:30", title: "Strand", place: "Régi part", placeSlug: null, durationMinutes: 150 },
    { time: "13:00", title: "Ebéd", place: "Régi étterem", placeSlug: null, durationMinutes: 60 },
    { time: "14:30", title: "Alvás", place: "Szállás", placeSlug: null, durationMinutes: 90 },
    { time: "19:30", title: "Vacsora", place: "Régi étterem", placeSlug: null, durationMinutes: 90 },
  ],
};
const tomorrow: HomeDay = { date: "2026-09-17", day: 17, weekday: "Csü", title: "Holnap", summary: "", activities: [] };

test("separates an answer from a Timeline action", () => {
  assert.equal(isTimelineActionRequest("Milyen idő lesz holnap?"), false);
  assert.equal(isTimelineActionRequest("Holnap legyen hasonló nap."), true);
  assert.equal(isTimelineActionRequest("Tegyél be délutánra bevásárlást."), true);
});

test("turns the core POC request into an empty-target proposal", () => {
  const proposal = buildTimelineProposal({ request: "A mai nap jó volt. Holnap legyen hasonló, de délután menjünk bevásárolni.", sourceDay: today, tripDays: [today, tomorrow] });
  assert.ok(proposal);
  assert.equal(proposal.targetDate, tomorrow.date);
  assert.equal(proposal.blockingReason, null);
  assert.equal(proposal.items.length, 5);
  assert.equal(proposal.items.some((item) => item.activity.title === "Bevásárlás"), true);
  assert.equal(proposal.items.every((item) => item.activity.placeSlug === null && item.activity.locationName === ""), true);
});

test("blocks automatic application when the target already has a plan", () => {
  const populated: HomeDay = { ...tomorrow, activities: [{ time: "10:00", title: "Már meglévő program", place: "", placeSlug: null }] };
  const proposal = buildTimelineProposal({ request: "Holnap legyen ilyen.", sourceDay: today, tripDays: [today, populated] });
  assert.match(proposal?.blockingReason ?? "", /már vannak programok/);
});
