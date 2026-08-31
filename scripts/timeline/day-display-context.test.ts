import assert from "node:assert/strict";
import test from "node:test";
import { dayDisplayContext } from "../../src/lib/day-display-context.ts";
import type { HomeDay } from "../../src/data/home-days.ts";

const emptyDay: HomeDay = {
  date: "2026-09-07",
  day: 7,
  weekday: "Hét",
  title: "Szabad program",
  summary: "A nap rugalmasan alakítható.",
  activities: [],
};

test("empty Timeline day keeps its Trip-core fallback title and subtitle", () => {
  assert.deepEqual(dayDisplayContext(emptyDay), {
    title: "Szabad program",
    summary: "A nap rugalmasan alakítható.",
    isFallback: true,
  });
});

test("a populated Timeline day receives a live, activity-derived context", () => {
  const context = dayDisplayContext({
    ...emptyDay,
    activities: [
      { time: "09:00", title: "Gyerekprogram", place: "Parco Bussi", placeSlug: "parco-bussi", description: "játszótér" },
      { time: "12:30", title: "Ebéd", place: "", placeSlug: null },
      { time: "15:00", title: "Könyvtár", place: "", placeSlug: null },
      { time: "19:00", title: "Vacsora", place: "", placeSlug: null },
    ],
  });

  assert.equal(context.title, "Könnyű nap együtt");
  assert.equal(context.summary, "Parco Bussi köré szerveződik a délelőtt, egy nyugodt étkezéssel.");
  assert.equal(context.isFallback, false);
});

test("a program character change updates the textual title and subtitle without touching fallback metadata", () => {
  const populated: HomeDay = {
    ...emptyDay,
    activities: [{ time: "09:00", title: "Strand", place: "Spiaggia di Porto Sa Ruxi", placeSlug: "porto-sa-ruxi" }],
  };

  assert.deepEqual(dayDisplayContext(populated), {
    title: "Porto Sa Ruxi felé",
    summary: "Spiaggia di Porto Sa Ruxi adja a nap fő ritmusát.",
    isFallback: false,
  });
  assert.deepEqual(dayDisplayContext({ ...populated, activities: [] }), dayDisplayContext(emptyDay));
});
