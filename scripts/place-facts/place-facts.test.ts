import assert from "node:assert/strict";
import test from "node:test";
import type { Place } from "../../src/types/places.ts";
import {
  formatBeachLength,
  getBeachAccessFacts,
  getBeachCardFacts,
  getBeachParkingFacts,
  getBeachPartFacts,
  getRestaurantCardFacts,
} from "../../src/lib/place-facts.ts";

const portoGiunco: Place = {
  sourceId: "porto-giunco",
  slug: "porto-giunco",
  name: "Spiaggia di Porto Giunco",
  type: "beach",
  location: { locality: "Villasimius" },
  details: {
    kind: "beach",
    shoreType: "sandy",
    lengthM: 1047,
    landAccess: "easy",
    waterEntry: "Fokozatos vízbelépés",
    shallowWater: true,
    windExposure: "Szeles időben hullámos lehet",
    access: { mainRoad: true },
    parking: { available: true, paid: true, seasonal: true, walkDistanceM: 50 },
  },
};

test("strandhossz magyar, kereshető tényként formázódik", () => {
  assert.equal(formatBeachLength(209), "209 m");
  assert.equal(formatBeachLength(1047), "1,05 km");
  assert.equal(formatBeachLength(undefined), undefined);
});

test("a strandkártya csak rendelkezésre álló alap-tényeket mutat", () => {
  assert.deepEqual(getBeachCardFacts(portoGiunco), ["Homokos", "1,05 km", "Könnyű megközelítés"]);
});

test("a part, megközelítés és parkolás tényblokkjai külön maradnak", () => {
  assert.deepEqual(getBeachPartFacts(portoGiunco), [
    "Homokos",
    "1,05 km",
    "Fokozatos vízbelépés",
    "Sekély víz",
    "Szeles időben hullámos lehet",
  ]);
  assert.deepEqual(getBeachAccessFacts(portoGiunco), ["Könnyű megközelítés", "Főúti megközelítés"]);
  assert.deepEqual(getBeachParkingFacts(portoGiunco), ["Parkoló elérhető", "Fizetős", "Szezonális", "50 m gyalog"]);
});

test("az étteremkártya rövid, ellenőrzött kínálati tényeket mutat", () => {
  const restaurant: Place = {
    sourceId: "b-steak", slug: "b-steak", name: "B-Steak", type: "restaurant",
    details: { kind: "restaurant", mealProfiles: ["Gyors vacsora", "Vacsora"], cuisine: ["Grill", "Street food"] },
  };
  assert.deepEqual(getRestaurantCardFacts(restaurant), ["Gyors vacsora", "Vacsora", "Grill"]);
});
