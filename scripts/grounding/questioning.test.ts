import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { answerQuestion } from "../../src/lib/questioning-answer.ts";
import { smartStatusSummary } from "../../src/lib/smart-status.ts";
import { timelineQuestionPrompts } from "../../src/lib/timeline-questioning.ts";
import { buildQuestionContext, questionPromptsForContext } from "../../src/lib/question-context.ts";
import { answerQuestionWithContext } from "../../src/lib/questioning-answer.ts";
import { validPlaceBrowseCategoryForType } from "../../src/lib/place-categories.ts";

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

const returnFlightDay = {
  date: "2099-09-13",
  day: 13,
  weekday: "Vas" as const,
  title: "Hazautazás",
  summary: "Teszt hazautazási nap.",
  activities: [
    { time: "14:30", title: "Indulás a reptérre", place: "Cagliari Airport", placeSlug: "cagliari-airport" },
    { time: "17:30", title: "Repülő indulása", place: "Cagliari Airport", placeSlug: "cagliari-airport" },
  ],
};

test("future selected day resolves its first explicit Timeline item", () => {
  const answer = answerQuestion("Mi a következő program?", futureBeachDay, weather, [], null);
  assert.equal(answer.title, "09:30 · Strandolás");
  assert.match(answer.body, /Porto Giunco/);
  assert.deepEqual(answer.sources, ["Timeline"]);
});

test("a Place detail cannot keep an unrelated category in its back link", () => {
  assert.equal(validPlaceBrowseCategoryForType("beach", "food"), "beaches");
  assert.equal(validPlaceBrowseCategoryForType("shop", "shopping"), "shopping");
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
  assert.deepEqual(prompts, ["Van még értelme strandolni?", "Mi a következő program?", "Mi fér még bele ma?"]);
});

test("quick questions differ when the selected day has different capabilities", () => {
  const beachPrompts = questionPromptsForContext(buildQuestionContext(futureBeachDay, weather));
  const shoppingPrompts = questionPromptsForContext(buildQuestionContext(arrivalDay, weather));
  const flightPrompts = questionPromptsForContext(buildQuestionContext(returnFlightDay, weather));
  assert.ok(beachPrompts.includes("Van még értelme strandolni?"));
  assert.ok(shoppingPrompts.includes("Hova menjünk bevásárolni?"));
  assert.ok(flightPrompts.includes("Mikor indul a repülő?"));
  assert.notDeepEqual(beachPrompts, shoppingPrompts);
  assert.notDeepEqual(shoppingPrompts, flightPrompts);
});

test("changing a day's Timeline content changes its regenerated quick questions", () => {
  const initial = {
    ...futureBeachDay,
    activities: [{ time: "09:00", title: "Strand", place: "Porto Giunco", placeSlug: "porto-giunco" }],
  };
  const afterEdit = {
    ...initial,
    activities: [{ time: "17:00", title: "Bevásárlás", place: "", placeSlug: null }],
  };
  const before = questionPromptsForContext(buildQuestionContext(initial, weather));
  const after = questionPromptsForContext(buildQuestionContext(afterEdit, weather));
  assert.ok(before.includes("Van még értelme strandolni?"));
  assert.ok(!before.includes("Hova menjünk bevásárolni?"));
  assert.ok(after.includes("Hova menjünk bevásárolni?"));
  assert.ok(!after.includes("Van még értelme strandolni?"));
});

test("canonical Place type adds the right prompt even when the Timeline title is neutral", () => {
  const conad = {
    sourceId: "test-conad", slug: "conad-city", name: "Conad City", type: "shop" as const,
    details: { kind: "generic" as const },
  };
  const beach = {
    sourceId: "test-beach", slug: "test-beach", name: "Teszt strand", type: "beach" as const,
    details: { kind: "beach" as const },
  };
  const resolve = (slug: string) => slug === conad.slug ? conad : slug === beach.slug ? beach : undefined;
  const shopDay = { ...futureBeachDay, activities: [{ time: "10:00", title: "Délelőtti megálló", place: conad.name, placeSlug: conad.slug }] };
  const beachDay = { ...futureBeachDay, activities: [{ time: "10:00", title: "Pihenő", place: beach.name, placeSlug: beach.slug }] };
  assert.ok(questionPromptsForContext(buildQuestionContext(shopDay, null, [], { getPlaceBySlug: resolve, places: [conad, beach] })).includes("Hova menjünk bevásárolni?"));
  assert.ok(questionPromptsForContext(buildQuestionContext(beachDay, null, [], { getPlaceBySlug: resolve, places: [conad, beach] })).includes("Van még értelme strandolni?"));
});

test("an Event quick question belongs only to the selected day context", () => {
  const eventDayPrompts = questionPromptsForContext(buildQuestionContext(futureBeachDay, weather, [scheduledEvent]));
  const otherDayPrompts = questionPromptsForContext(buildQuestionContext({ ...futureBeachDay, date: "2099-09-04" }, weather, []));
  assert.ok(eventDayPrompts.includes("Mikor kezdődik a mai esemény?"));
  assert.ok(!otherDayPrompts.includes("Mikor kezdődik a mai esemény?"));
});

test("a cancelled Event does not offer a misleading start-time quick question", () => {
  const prompts = questionPromptsForContext(buildQuestionContext(futureBeachDay, weather, [{ ...scheduledEvent, status: "cancelled" }]));
  assert.ok(!prompts.includes("Mikor kezdődik a mai esemény?"));
});

test("the approved twelve-day Timeline yields selected-day-specific prompt sets", () => {
  const trip = JSON.parse(readFileSync(new URL("../../knowledge/trip/trip.public.json", import.meta.url), "utf8")) as {
    days: Array<{ date: string; day: number; weekday: "Sze" | "Csü" | "Pén" | "Szo" | "Vas" | "Hét" | "Kedd"; title: string; subtitle: string }>;
  };
  const timeline = JSON.parse(readFileSync(new URL("../../knowledge/trip/timeline.initial.json", import.meta.url), "utf8")) as {
    days: Array<{ date: string; activities: Array<{ start_time: string; title: string; location_name: string | null; place_slug: string | null }> }>;
  };
  const promptsByDate = new Map(trip.days.map((tripDay) => {
    const seededDay = timeline.days.find((day) => day.date === tripDay.date);
    assert.ok(seededDay, `${tripDay.date} has canonical Timeline content`);
    const day = {
      ...tripDay,
      summary: tripDay.subtitle,
      activities: seededDay.activities.map((activity) => ({
        time: activity.start_time,
        title: activity.title,
        place: activity.location_name ?? "",
        placeSlug: activity.place_slug,
      })),
    };
    return [tripDay.date, questionPromptsForContext(buildQuestionContext(day, null))] as const;
  }));

  assert.equal(promptsByDate.size, 12);
  assert.ok(promptsByDate.get("2026-09-02")?.includes("Hova menjünk bevásárolni?"));
  assert.ok(promptsByDate.get("2026-09-13")?.includes("Mikor indul a repülő?"));
  assert.ok(promptsByDate.get("2026-09-03")?.includes("Van még értelme strandolni?"));
  assert.notDeepEqual(promptsByDate.get("2026-09-02"), promptsByDate.get("2026-09-13"));
});

test("a day without Timeline, Event or Place capabilities renders no misleading quick question", () => {
  const emptyDay = { ...futureBeachDay, activities: [] };
  assert.deepEqual(questionPromptsForContext(buildQuestionContext(emptyDay, null)), []);
});

test("parking is grounded in the selected-day linked Place", () => {
  const portoSaRuxi = {
    sourceId: "test-porto-sa-ruxi",
    slug: "porto-sa-ruxi",
    name: "Spiaggia di Porto Sa Ruxi",
    type: "beach" as const,
    details: { kind: "beach" as const, access: { parkingNotes: "Parkoló a strand közelében; rövid földutas bekötőszakasz." } },
  };
  const context = buildQuestionContext(
    { ...futureBeachDay, activities: [{ time: "09:00", title: "Strand", place: "Spiaggia di Porto Sa Ruxi", placeSlug: "porto-sa-ruxi" }] },
    weather,
    [],
    { getPlaceBySlug: (slug) => slug === portoSaRuxi.slug ? portoSaRuxi : undefined, places: [portoSaRuxi] },
  );
  const answer = answerQuestionWithContext("Milyen a parkolás Porto Sa Ruxin?", context, null);
  assert.equal(answer.title, "Spiaggia di Porto Sa Ruxi · parkolás");
  assert.match(answer.body, /Parkoló a strand közelében/);
  assert.deepEqual(answer.sources, ["Place"]);
});

test("a full canonical Place name outranks a related parking Place", () => {
  const portoSaRuxi = {
    sourceId: "test-porto-sa-ruxi", slug: "porto-sa-ruxi", name: "Spiaggia di Porto Sa Ruxi", type: "beach" as const,
    details: { kind: "beach" as const, access: { parkingNotes: "Parkoló a strand közelében." } },
  };
  const parking = {
    sourceId: "test-parking-porto-sa-ruxi", slug: "parcheggio-porto-sa-ruxi", name: "Parcheggio Porto Sa Ruxi", type: "activity" as const,
    details: { kind: "generic" as const },
  };
  const context = buildQuestionContext(futureBeachDay, weather, [], { places: [portoSaRuxi, parking] });
  const answer = answerQuestionWithContext("Milyen a parkolás a Spiaggia di Porto Sa Ruxin?", context, null);
  assert.equal(answer.title, "Spiaggia di Porto Sa Ruxi · parkolás");
  assert.doesNotMatch(answer.body, /Több hely/);
});

test("a partial Place name stays ambiguous instead of choosing today's Porto", () => {
  const portoGiunco = {
    sourceId: "test-porto-giunco", slug: "porto-giunco", name: "Spiaggia di Porto Giunco", type: "beach" as const,
    details: { kind: "beach" as const, access: { parkingNotes: "Fizetős parkoló." } },
  };
  const portoSaRuxi = {
    sourceId: "test-porto-sa-ruxi", slug: "porto-sa-ruxi", name: "Spiaggia di Porto Sa Ruxi", type: "beach" as const,
    details: { kind: "beach" as const, access: { parkingNotes: "Parkoló a strand közelében." } },
  };
  const context = buildQuestionContext(
    { ...futureBeachDay, activities: [{ time: "09:00", title: "Strand", place: portoSaRuxi.name, placeSlug: portoSaRuxi.slug }] },
    weather,
    [],
    { getPlaceBySlug: (slug) => slug === portoSaRuxi.slug ? portoSaRuxi : undefined, places: [portoGiunco, portoSaRuxi] },
  );
  const answer = answerQuestionWithContext("Milyen a parkolás Porto?", context, null);
  assert.equal(answer.title, "Több hely is megfelel");
  assert.match(answer.body, /Porto Giunco/);
  assert.match(answer.body, /Porto Sa Ruxi/);
});

test("a full unambiguous canonical Place can answer even if it is not today's activity", () => {
  const calaPira = {
    sourceId: "test-cala-pira", slug: "cala-pira", name: "Cala Pira", type: "beach" as const,
    details: { kind: "beach" as const, access: { parkingNotes: "A strandhoz közeli ellenőrzött parkoló." } },
  };
  const context = buildQuestionContext(futureBeachDay, weather, [], { places: [calaPira] });
  const answer = answerQuestionWithContext("Milyen a parkolás Cala Pirán?", context, null);
  assert.equal(answer.title, "Cala Pira · parkolás");
  assert.match(answer.body, /ellenőrzött parkoló/);
});

test("a watch change appears only on the Timeline day that accepted its event", () => {
  const change = {
    eventTitle: "Invasio Fesztivál",
    kind: "start_time_changed" as const,
    observedAt: "2026-08-13T10:00:00.000Z",
    timelineDates: ["2099-09-07"],
  };

  const unrelatedDayStatus = smartStatusSummary(futureBeachDay, weather, change);
  assert.equal(unrelatedDayStatus, futureBeachDay.summary);

  const acceptedDayStatus = smartStatusSummary({ ...futureBeachDay, date: "2099-09-07" }, weather, change);
  assert.match(acceptedDayStatus, /Fontos változás: Invasio Fesztivál időpontja módosult/);
});

test("live weather never rewrites the status of a different selected Timeline day", () => {
  const now = new Date("2099-09-03T12:00:00.000Z");
  const currentDay = {
    ...futureBeachDay,
    activities: [{ time: "09:00", title: "Reggeli", place: "trip-base", placeSlug: null }],
  };
  const rainyWeather = { ...weather, precipitationState: "rain" as const };

  assert.match(smartStatusSummary(currentDay, rainyWeather, null, now), /Csapadék várható/);
  assert.equal(smartStatusSummary({ ...currentDay, date: "2099-09-04" }, rainyWeather, null, now), currentDay.summary);
});

test("a shopping programme adds a grounded shopping prompt for that selected day", () => {
  const prompts = timelineQuestionPrompts({
    ...arrivalDay,
    activities: [{ id: "shopping", time: "17:00", title: "Bevásárlás", place: "", kind: "plan", isSystemGenerated: false }],
  });
  assert.ok(prompts.includes("Hova menjünk bevásárolni?"));
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

test("a named Event resolves through common Hungarian suffixes", () => {
  const answer = answerQuestion("Mikor kezdődik a koncertre érkezés?", futureBeachDay, weather, [scheduledEvent], null);
  assert.equal(answer.title, "Helyi koncert");
  assert.match(answer.body, /Kezdés:/);
});

test("a generic event question does not choose arbitrarily between multiple Events", () => {
  const answer = answerQuestion("Mikor kezdődik a mai esemény?", futureBeachDay, weather, [
    scheduledEvent,
    { ...scheduledEvent, id: "00000000-0000-4000-8000-000000000002", title: "Helyi felvonulás", startsAt: "2099-09-03T20:30:00+02:00" },
  ], null);
  assert.equal(answer.title, "Több rögzített esemény");
  assert.match(answer.body, /Helyi koncert/);
  assert.match(answer.body, /Helyi felvonulás/);
});

test("a scheduled return flight comes from the selected Timeline day, not the Event branch", () => {
  const answer = answerQuestion("Mikor indul haza a repülő?", returnFlightDay, weather, [], null);
  assert.equal(answer.title, "17:30 · Repülő indulása");
  assert.match(answer.body, /Cagliari Airport/);
  assert.deepEqual(answer.sources, ["Timeline"]);
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
  const answer = answerQuestion("Mikor kezdődik a fesztivál?", futureBeachDay, weather, [{ ...scheduledEvent, title: "Helyi fesztivál", endsAt: "2099-09-05T23:00:00+02:00" }], null);
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

test("nearest-shop questions are treated as Mobility questions, not shopping rankings", () => {
  const answer = answerQuestion("Milyen messze van a szállásunktól a legközelebbi bolt?", futureBeachDay, weather, [], {
    title: "Nincs ellenőrzött útvonaladat",
    body: "Ehhez a bolthoz még nincs jóváhagyott Mobility-route. Ezért nem mondok km-t, percet vagy kerülőt.",
    sources: ["Mobility"],
    recommendations: [],
  });
  assert.equal(answer.title, "Nincs ellenőrzött útvonaladat");
  assert.match(answer.body, /nem mondok km-t, percet vagy kerülőt/);
  assert.equal(answer.recommendations?.length ?? 0, 0);
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
