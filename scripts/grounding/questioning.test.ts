import assert from "node:assert/strict";
import test from "node:test";
import { answerQuestion } from "../../src/lib/questioning-answer.ts";
import { timelineQuestionPrompts } from "../../src/lib/timeline-questioning.ts";

const futureBeachDay = {
  date: "2099-09-03",
  day: 3,
  weekday: "Csü" as const,
  title: "Strandnap",
  summary: "Teszt nap.",
  activities: [
    { time: "09:30", title: "Strandolás", place: "Porto Giunco", placeSlug: "porto-giunco" },
    { time: "13:00", title: "Pihenés", place: "trip-base", placeSlug: null },
    { time: "18:30", title: "Vacsora", place: "Villasimius", placeSlug: null },
  ],
};

const pastDay = { ...futureBeachDay, date: "2020-09-03" };

const arrivalDay = {
  date: "2099-09-02",
  day: 2,
  weekday: "Sze" as const,
  title: "Érkezés és ráhangolódás",
  summary: "Teszt érkezési nap.",
  activities: [
    { time: "10:35", title: "Repülő indulása", place: "Budapest Airport", placeSlug: "budapest-airport" },
    { time: "12:45", title: "Érkezés", place: "Cagliari Airport", placeSlug: "cagliari-airport" },
    { time: "13:00", title: "Autófelvétel", place: "Cagliari Airport", placeSlug: "cagliari-airport" },
    { time: "15:00", title: "Szállás elfoglalása", place: "Ollastu Apartments", placeSlug: null },
    { time: "16:30", title: "Bevásárlás", place: "Market Simius — CRAI", placeSlug: "market-simius-crai" },
  ],
};

const weather = {
  temp: 27,
  wind: 14,
  uv: 6,
  sunrise: "06:30",
  sunset: "19:45",
  precipitationState: "dry" as const,
  seaTemperature: 25,
  fetchedAt: "2026-08-12T10:00:00.000Z",
  stale: false,
};

const scheduledEvent = {
  id: "00000000-0000-4000-8000-000000000001",
  title: "Helyi koncert",
  startsAt: "2099-09-03T19:30:00+02:00",
  endsAt: "2099-09-03T21:00:00+02:00",
  status: "scheduled" as const,
  placeSlug: "marina-di-villasimius",
  sourceUrl: "https://example.com/official",
  lastVerifiedAt: "2026-08-12T10:00:00.000Z",
};

test("future selected day resolves its first explicit Timeline item", () => {
  const answer = answerQuestion("Mi a következő program?", futureBeachDay, weather, [], null);
  assert.equal(answer.title, "09:30 · Strandolás");
  assert.match(answer.body, /Porto Giunco/);
  assert.deepEqual(answer.sources, ["Timeline"]);
});

test("arrival-after question lists only the scheduled post-arrival plan", () => {
  const answer = answerQuestion("Mit érdemes még ma elintéznünk érkezés után?", arrivalDay, weather, [], null);
  assert.equal(answer.title, "Érkezés után");
  assert.match(answer.body, /13:00 · Autófelvétel/);
  assert.match(answer.body, /15:00 · Szállás elfoglalása/);
  assert.match(answer.body, /16:30 · Bevásárlás/);
  assert.doesNotMatch(answer.body, /Repülő indulása/);
  assert.deepEqual(answer.sources, ["Timeline"]);
});

test("accommodation question uses the private trip-base label without exposing an address", () => {
  const answer = answerQuestion("Hol van a szállásunk?", arrivalDay, weather, [], null);
  assert.equal(answer.title, "Ollastu Apartments");
  assert.match(answer.body, /Villasimius/);
  assert.match(answer.body, /belépett családi nézetben/);
  assert.doesNotMatch(answer.body, /Via |utca|szám/i);
  assert.deepEqual(answer.sources, ["Trip", "Timeline"]);
});

test("past selected day does not invent a next programme", () => {
  const answer = answerQuestion("Mi a következő program?", pastDay, weather, [], null);
  assert.equal(answer.title, "Nincs következő rögzített program");
  assert.match(answer.body, /korábbi nap/);
});

test("remaining-time answer declares missing route and opening-hours evidence", () => {
  const answer = answerQuestion("Mi fér még bele ma?", futureBeachDay, weather, [], null);
  assert.match(answer.body, /hiteles útvonal- és nyitvatartási adatra/);
  assert.doesNotMatch(answer.body, /\b\d+\s*(km|perc)\b/i);
});

test("timeline prompts are selected-day aware", () => {
  const prompts = timelineQuestionPrompts(futureBeachDay);
  assert.deepEqual(prompts, ["Mi a következő program?", "Van még értelme strandolni?", "Mi fér még bele ma?"]);
});

test("known planned beach uses only Timeline and Weather facts", () => {
  const answer = answerQuestion("Melyik strandot válasszuk?", futureBeachDay, weather, [], null);
  assert.equal(answer.title, "Porto Giunco");
  assert.match(answer.body, /27°/);
  assert.match(answer.body, /14 km\/h/);
  assert.deepEqual(answer.sources, ["Timeline", "Weather"]);
});

test("missing beach selection is not replaced with a guess", () => {
  const noBeach = { ...futureBeachDay, activities: [{ time: "10:00", title: "Séta", place: "Villasimius", placeSlug: null }] };
  const answer = answerQuestion("Melyik strandot válasszuk?", noBeach, weather, [], null);
  assert.equal(answer.title, "Még nincs kiválasztott strand");
  assert.match(answer.body, /nem ajánlok találomra/);
});

test("rain context is stated without making a replacement recommendation", () => {
  const answer = answerQuestion("Melyik strandot válasszuk?", futureBeachDay, { ...weather, precipitationState: "rain" }, [], null);
  assert.match(answer.body, /Eső várható/);
  assert.doesNotMatch(answer.body, /helyette/i);
});

test("event start time comes from a verified event", () => {
  const answer = answerQuestion("Mikor kezdődik este a koncert?", futureBeachDay, weather, [scheduledEvent], null);
  assert.equal(answer.title, "Helyi koncert");
  assert.match(answer.body, /Kezdés:/);
  assert.deepEqual(answer.sources, ["Event"]);
});

test("unknown fireworks explicitly remains unknown", () => {
  const answer = answerQuestion("Mikor kezdődik a tűzijáték?", futureBeachDay, weather, [], null);
  assert.equal(answer.title, "Nincs megerősített tűzijáték");
  assert.match(answer.body, /Nem állítok időpontot/);
});

test("missing admission price explicitly remains unknown", () => {
  const answer = answerQuestion("Van belépő a Porto Giuncóra?", futureBeachDay, weather, [], null);
  assert.equal(answer.title, "A belépőről nincs biztos adat");
  assert.match(answer.body, /Nem találgatok/);
  assert.doesNotMatch(answer.body, /€|euró|forint/i);
});

test("cancelled event is not presented as an active programme", () => {
  const answer = answerQuestion("Mikor kezdődik a koncert?", futureBeachDay, weather, [{ ...scheduledEvent, status: "cancelled" }], null);
  assert.equal(answer.title, "Helyi koncert · törölve");
});

test("multi-day event does not invent an evening start", () => {
  const answer = answerQuestion("Mikor kezdődik a fesztivál?", futureBeachDay, weather, [{ ...scheduledEvent, endsAt: "2099-09-05T23:00:00+02:00" }], null);
  assert.match(answer.body, /nincs ellenőrzött adatként rögzítve/);
});

test("unknown baby-product answer is preserved exactly", () => {
  const answer = answerQuestion("Hol vegyünk pelenkát?", futureBeachDay, weather, [], {
    title: "A babatermékekről nincs biztos adat",
    body: "Nincs megbízható üzletspecifikus adat.",
    sources: ["Shopping Intelligence"],
  });
  assert.equal(answer.title, "A babatermékekről nincs biztos adat");
  assert.doesNotMatch(answer.body, /Crai|Eurospin|Conad/i);
});


test("missing mobility route is never converted to a distance or duration", () => {
  const answer = answerQuestion("Mennyi kerülő az Eurospin?", futureBeachDay, weather, [], {
    title: "Nincs ellenőrzött útvonaladat",
    body: "Ehhez a bolthoz még nincs jóváhagyott Mobility-route.",
    sources: ["Mobility"],
  });
  assert.equal(answer.title, "Nincs ellenőrzött útvonaladat");
  assert.doesNotMatch(answer.body, /\b\d+\s*(km|perc)\b/i);
});

test("grounded shopping recommendation preserves its Place detail handoff", () => {
  const answer = answerQuestion("Hol tudunk gyorsan bevásárolni?", futureBeachDay, weather, [], {
    title: "Gyors bevásárlás",
    body: "Ellenőrzött bolti adatok alapján.",
    sources: ["Shopping Intelligence", "Place"],
    recommendations: [{ placeSlug: "conad-city-villasimius", name: "Conad City", confirmedFacts: ["Parkolás"], placeDetailHref: "/places/conad-city-villasimius" }],
  });
  assert.equal(answer.recommendations?.[0]?.placeDetailHref, "/places/conad-city-villasimius");
});

test("ambiguous question keeps an explicit bounded fallback", () => {
  const answer = answerQuestion("Mit gondolsz?", futureBeachDay, weather, [], null);
  assert.equal(answer.title, "Erre még nincs biztos válasz");
  assert.match(answer.body, /ellenőrzött kérdésekre/);
});
