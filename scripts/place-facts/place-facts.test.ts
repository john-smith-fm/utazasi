import assert from "node:assert/strict";
import test from "node:test";
import type { Place } from "../../src/types/places.ts";
import {
  formatBeachLength,
  getBeachAccessFacts,
  getBeachCardFacts,
  getBeachParkingFacts,
  getBeachPartFacts,
  getGenericPlaceCardFacts,
  getGenericAccessFacts,
  getPlaceFamilyFacts,
  getParkingCardFacts,
  getRestaurantCardFacts,
  getShopCardFacts,
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
    access: { mainRoad: true, stroller: "possible", accessible: true, roadNotes: "Rövid, burkolt bekötőút." },
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
  assert.deepEqual(getBeachAccessFacts(portoGiunco), [
    "Könnyű megközelítés",
    "Főúti megközelítés",
    "Babakocsival használható",
    "Akadálymentes megközelítés",
    "Rövid, burkolt bekötőút.",
  ]);
  assert.deepEqual(getBeachParkingFacts(portoGiunco), ["Parkoló elérhető", "Fizetős", "Szezonális", "50 m gyalog"]);
});

test("az étteremkártya rövid, ellenőrzött kínálati tényeket mutat", () => {
  const restaurant: Place = {
    sourceId: "b-steak", slug: "b-steak", name: "B-Steak", type: "restaurant",
    details: { kind: "restaurant", mealProfiles: ["Gyors vacsora", "Vacsora"], cuisine: ["Grill", "Street food"] },
  };
  assert.deepEqual(getRestaurantCardFacts(restaurant), ["Gyors vacsora", "Vacsora", "Grill"]);
});

test("a boltkártya csak megerősített termékköröket mutat", () => {
  const shop: Place = {
    sourceId: "conad-city", slug: "conad-city", name: "Conad City", type: "shop",
    details: { kind: "shop", shop: { confirmedDepartments: ["Pékség", "Halpult", "Helyi termékek", "Borválaszték"] } },
  };
  assert.deepEqual(getShopCardFacts(shop), ["Pékség", "Halpult", "Helyi termékek"]);
});

test("az egyéb helyek kártyája csak megerősített szolgáltatásokat mutat", () => {
  const playground: Place = {
    sourceId: "parco-bussi", slug: "parco-bussi", name: "Parco Bussi", type: "playground",
    details: { kind: "playground", confirmedServices: ["Mosdó", "Parkolás", "Vízvételi lehetőség", "Beltéri rész"] },
  };
  assert.deepEqual(getGenericPlaceCardFacts(playground), ["Mosdó", "Parkolás", "Vízvételi lehetőség"]);
});

test("a kávézó kártyája a kanonikus étkezési profilokat részesíti előnyben", () => {
  const cafe: Place = {
    sourceId: "bar-le-palme", slug: "bar-le-palme", name: "Bar Le Palme", type: "cafe",
    details: { kind: "cafe", food: { mealProfiles: ["Kávé", "Italok", "Kikötői megálló"] }, confirmedServices: ["Parkolás"] },
  };
  assert.deepEqual(getGenericPlaceCardFacts(cafe), ["Kávé", "Italok"]);
});

test("a parkoló kártyája csak megerősített parkolási tényeket mutat", () => {
  const parking: Place = {
    sourceId: "ex-esmas", slug: "ex-esmas", name: "Parcheggio Ex Esmas", type: "parking",
    details: { kind: "parking", parking: { available: true, paid: true, chargingWindow: "24 óra", price: "2026-os tarifa: első óra 1,50 €" } },
  };
  assert.deepEqual(getParkingCardFacts(parking), ["Fizetős", "24 óra"]);
  assert.deepEqual(getGenericPlaceCardFacts(parking), ["Fizetős", "24 óra"]);
});

test("a látnivaló megközelítése csak meglévő, strukturált access tényeket mutat", () => {
  const sight: Place = {
    sourceId: "fortezza", slug: "fortezza", name: "Fortezza Vecchia", type: "sight",
    details: { kind: "sight", access: { steps: true, stroller: "limited" } },
  };
  assert.deepEqual(getGenericAccessFacts(sight), ["Lépcsős megközelítés", "Babakocsival korlátozott"]);
});

test("a családi alkalmasság csak expliciten rögzített tényből jelenik meg", () => {
  const familyBeach: Place = {
    sourceId: "family-beach", slug: "family-beach", name: "Családi strand", type: "beach",
    details: { kind: "beach", familyFacts: ["Kisgyerekkel is alkalmas"] },
  };
  const shortVisitSight: Place = {
    sourceId: "short-visit", slug: "short-visit", name: "Rövid látogatás", type: "sight",
    details: { kind: "sight", familyFacts: ["Rövid látogatás kisgyerekkel is lehetséges"] },
  };
  const unknown: Place = {
    sourceId: "unknown", slug: "unknown", name: "Ismeretlen", type: "playground",
    details: { kind: "playground" },
  };
  assert.deepEqual(getPlaceFamilyFacts(familyBeach), ["Kisgyerekkel is alkalmas"]);
  assert.deepEqual(getPlaceFamilyFacts(shortVisitSight), ["Rövid látogatás kisgyerekkel is lehetséges"]);
  assert.deepEqual(getPlaceFamilyFacts(unknown), []);
});
