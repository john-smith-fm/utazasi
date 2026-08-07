import type { Playground } from "@/types";

/** Existing playground data remains outside the v2D restaurant rollout. */
export const PLAYGROUNDS: Playground[] = [
  {
    name: "Villasimius központi játszótér",
    photo: "/images/jatszoter-kozpont.jpg",
    maps: "https://www.google.com/maps/search/?api=1&query=parco+giochi+Villasimius+centro",
    distance: "Sétatávolság a központból.",
    shade: "Részben árnyékolt, késő délután kellemes.",
    fountain: true,
    toilet: false,
  },
  {
    name: "Simius sétány menti játszótér",
    photo: "/images/jatszoter-simius.jpg",
    maps: "https://www.google.com/maps/search/?api=1&query=parco+giochi+lungomare+Simius+Villasimius",
    distance: "A Simius strand sétányához közel.",
    shade: "Kevés árnyék, inkább reggel vagy késő délután ideális.",
    fountain: true,
    toilet: true,
  },
];
