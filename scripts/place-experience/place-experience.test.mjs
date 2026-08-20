import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const directory = new URL("../../knowledge/places/", import.meta.url);
const sources = ["beaches.json", "sights.json", "other.json"];

async function allPlaces() {
  const documents = await Promise.all(sources.map(async (file) => {
    const content = await readFile(new URL(file, directory), "utf8");
    return JSON.parse(content).places;
  }));
  return documents.flat();
}

function bySlug(places, slug) {
  const place = places.find((candidate) => candidate.slug === slug);
  assert.ok(place, `Missing P0 place: ${slug}`);
  return place;
}

function hasMapsAction(place) {
  const maps = place.google_maps ?? place.destination_intelligence?.google_maps;
  return Boolean(maps?.maps_url || maps?.directions_url);
}

test("P0 places retain a source-backed Maps hand-off", async () => {
  const places = await allPlaces();
  for (const slug of [
    "sam-beach-poetto",
    "cala-pira",
    "porto-giunco",
    "porto-sa-ruxi",
    "scoglio-di-peppino",
    "fortezza-vecchia",
    "marina-di-villasimius",
    "cagliari-airport",
    "budapest-airport",
  ]) {
    assert.equal(hasMapsAction(bySlug(places, slug)), true, `${slug} needs Maps navigation`);
  }
});

test("Marina uses a cover that visibly represents the harbour", async () => {
  const marina = bySlug(await allPlaces(), "marina-di-villasimius");
  assert.match(marina.cover_image?.source_url ?? "", /Marina_di_Villasimius_05\.jpg$/);
  assert.equal(marina.cover_image?.license, "CC BY 3.0");
  assert.equal(marina.cover_image?.attribution, "Olaf Tausch");
});

test("P0 service and contact facts remain explicit", async () => {
  const places = await allPlaces();
  const marina = bySlug(places, "marina-di-villasimius");
  assert.equal(marina.destination_intelligence?.services?.wc, true);
  assert.equal(marina.destination_intelligence?.services?.wifi, true);
  assert.equal(marina.destination_intelligence?.services?.fuel, true);
  assert.ok(marina.destination_intelligence?.contact?.phone);

  const samBeach = bySlug(places, "sam-beach-poetto");
  assert.equal(samBeach.destination_intelligence?.services?.changing_room, true);
  assert.equal(samBeach.destination_intelligence?.services?.nursery, true);
  assert.ok(samBeach.destination_intelligence?.contact?.phone);
  assert.match(samBeach.destination_intelligence?.family?.insight ?? "", /parkoló/);

  const portoGiunco = bySlug(places, "porto-giunco");
  assert.match(portoGiunco.destination_intelligence?.family?.insight ?? "", /sekély víz/);

  const airport = bySlug(places, "cagliari-airport");
  assert.equal(airport.destination_intelligence?.services?.prm_assistance, true);
  assert.equal(airport.destination_intelligence?.services?.rail_station, true);
});
