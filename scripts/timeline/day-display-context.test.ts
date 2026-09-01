import assert from "node:assert/strict";
import test from "node:test";
import { buildDayEditorialContext, dayDisplayContext } from "../../src/lib/day-display-context.ts";
import type { HomeDay } from "../../src/data/home-days.ts";

const emptyDay: HomeDay = {
  date: "2026-09-07",
  day: 7,
  weekday: "Hét",
  title: "Szabad program",
  summary: "A nap rugalmasan alakítható.",
  activities: [],
};
const trip = { startDate: "2026-09-02", endDate: "2026-09-13" };

test("an empty Timeline day receives a grounded editorial empty state", () => {
  assert.deepEqual(dayDisplayContext(emptyDay, trip), {
    title: "A nap még előttetek van",
    summary: "Egyelőre nincs tervetek erre a napra. Jó alkalom lehet egy új közös programhoz.",
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
  }, trip);

  assert.equal(context.title, "Könnyű nap együtt");
  assert.equal(context.summary, "Parco Bussi köré szerveződik a délelőtt, mellette jut idő egy nyugodt étkezésre.");
  assert.equal(context.isFallback, false);
});

test("a program character change updates the textual title and subtitle without touching fallback metadata", () => {
  const populated: HomeDay = {
    ...emptyDay,
    date: "2026-09-05",
    activities: [{ time: "09:00", title: "Strand", place: "Spiaggia di Porto Sa Ruxi", placeSlug: "porto-sa-ruxi" }],
  };

  assert.deepEqual(dayDisplayContext(populated, trip), {
    title: "Irány Spiaggia di Porto Sa Ruxi",
    summary: "A fő program: Spiaggia di Porto Sa Ruxi.",
    isFallback: false,
  });
  assert.deepEqual(dayDisplayContext({ ...populated, activities: [] }, trip), dayDisplayContext(emptyDay, trip));
});

test("trip phase, midpoint and returning-place signals use only the current trip Timeline", () => {
  const earlier: HomeDay = { ...emptyDay, date: "2026-09-03", activities: [{ time: "09:00", title: "Strand", place: "Spiaggia di Porto Sa Ruxi", placeSlug: "porto-sa-ruxi" }] };
  const returning: HomeDay = { ...emptyDay, date: "2026-09-07", activities: [{ time: "09:00", title: "Strand", place: "Spiaggia di Porto Sa Ruxi", placeSlug: "porto-sa-ruxi" }] };
  const context = buildDayEditorialContext(returning, trip, [earlier, returning]);
  assert.ok(context.signals.includes("returning_place"));
  assert.ok(context.signals.includes("trip_midpoint"));
  assert.equal(context.tripPhase, "middle");
  assert.equal(dayDisplayContext(returning, trip, [earlier, returning]).title, "Irány Spiaggia di Porto Sa Ruxi");
});

test("arrival, departure and a verified event have deterministic editorial copy", () => {
  const arrival = { ...emptyDay, date: "2026-09-02", activities: [{ time: "16:00", title: "Megérkezés", place: "Villasimius", placeSlug: null }] };
  const departure = { ...emptyDay, date: "2026-09-13", activities: [{ time: "14:45", title: "Indulás a reptérre", place: "Cagliari Airport", placeSlug: "cagliari-airport" }] };
  const event = { ...emptyDay, date: "2026-09-06", activities: [{ time: "Este", title: "Santa Maria", place: "Villasimius", placeSlug: null, localEvent: true }] };
  assert.equal(dayDisplayContext(arrival, trip).title, "Első nap a szigeten");
  assert.equal(dayDisplayContext(departure, trip).title, "Még egy utolsó délelőtt");
  assert.equal(dayDisplayContext(event, trip).title, "Este Santa Maria");
});
